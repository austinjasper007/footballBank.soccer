import mongoose from "mongoose";
import { zipSync } from "fflate";
import { NextResponse } from "next/server";
import { PlayerDocument } from "@/lib/schemas";
import { getPlayerPrivateAccess } from "@/lib/playerPrivateAccess";
import {
  downloadDisposition,
  fetchFirebaseDocument,
} from "@/lib/playerDocuments";
import {
  MAX_PLAYER_ARCHIVE_BYTES,
  MAX_PLAYER_DOCUMENTS_PER_ARCHIVE,
  normalizeDocumentFolder,
} from "@/lib/playerDocumentRules";
import { normalizeDocumentFileName } from "@/lib/playerDocuments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return jsonError("Invalid player.", 400);

  const access = await getPlayerPrivateAccess(id);
  if (access.status !== 200) return jsonError(access.error, access.status);

  try {
    const documents = await PlayerDocument.find({ playerId: id })
      .select("fileName folderPath downloadUrl fileSize")
      .sort({ folderPath: 1, fileName: 1 })
      .lean();
    if (!documents.length) return jsonError("This player has no documents to archive.", 404);
    if (documents.length > MAX_PLAYER_DOCUMENTS_PER_ARCHIVE) {
      return jsonError("The document archive contains too many files.", 413);
    }

    let totalBytes = 0;
    const files = Object.create(null);
    for (const document of documents) {
      const folderPath = normalizeDocumentFolder(document.folderPath || "");
      const fileName = normalizeDocumentFileName(document.fileName);
      totalBytes += document.fileSize;
      if (totalBytes > MAX_PLAYER_ARCHIVE_BYTES) {
        return jsonError("The document archive exceeds the 100 MB download limit.", 413);
      }
      const bytes = await fetchFirebaseDocument(document.downloadUrl, document.fileSize);
      files[[folderPath, fileName].filter(Boolean).join("/")] = bytes;
    }

    const archive = zipSync(files, { level: 6 });
    const playerName = `${access.player.firstName}-${access.player.lastName}`
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "player";
    return new Response(Buffer.from(archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": downloadDisposition(`${playerName}-documents.zip`),
        "Content-Length": String(archive.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Player document archive failed:", error);
    return jsonError("Player document archive could not be created.", 502);
  }
}
