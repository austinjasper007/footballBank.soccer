import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { PlayerDocument } from "@/lib/schemas";
import { getPlayerPrivateAccess } from "@/lib/playerPrivateAccess";
import { downloadDisposition, fetchFirebaseDocument } from "@/lib/playerDocuments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

export async function GET(_request, { params }) {
  const { id, documentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(documentId)) {
    return jsonError("Invalid player document.", 400);
  }

  const access = await getPlayerPrivateAccess(id);
  if (access.status !== 200) return jsonError(access.error, access.status);

  try {
    const file = await PlayerDocument.findOne({ _id: documentId, playerId: id })
      .select("fileName downloadUrl mimeType fileSize")
      .lean();
    if (!file) return jsonError("Player document not found.", 404);
    const bytes = await fetchFirebaseDocument(file.downloadUrl, file.fileSize);
    return new Response(bytes, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": downloadDisposition(file.fileName),
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Player document download failed:", error);
    return jsonError("Player document could not be downloaded.", 502);
  }
}
