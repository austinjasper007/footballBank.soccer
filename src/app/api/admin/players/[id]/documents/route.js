import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getAuthUser } from "@/lib/oauth";
import { Player, PlayerDocument } from "@/lib/schemas";
import {
  documentStoragePrefix,
  normalizeDocumentFileName,
  validateFirebaseDocumentUrl,
} from "@/lib/playerDocuments";
import {
  MAX_PLAYER_DOCUMENT_BYTES,
  normalizeDocumentFolder,
} from "@/lib/playerDocumentRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

async function getAdmin() {
  const user = await getAuthUser();
  if (!user) return { response: jsonError("Authentication required.", 401) };
  if (user.role !== "admin") return { response: jsonError("Administrator access is required.", 403) };
  return { user };
}

export async function POST(request, { params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return jsonError("Invalid player.", 400);
  const { user, response } = await getAdmin();
  if (response) return response;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024) {
    return jsonError("Document upload details are too large.", 413);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return jsonError("Invalid document upload details.", 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("Invalid document upload details.", 400);
  }

  let fileName;
  let folderPath;
  let downloadUrl;
  try {
    fileName = normalizeDocumentFileName(input.fileName);
    folderPath = normalizeDocumentFolder(input.folderPath || "");
    if (!Number.isSafeInteger(input.fileSize) || input.fileSize < 1 || input.fileSize > MAX_PLAYER_DOCUMENT_BYTES) {
      return jsonError("Documents must be between 1 byte and 25 MB.", 400);
    }
    if (
      typeof input.mimeType !== "string" ||
      !/^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(input.mimeType) ||
      input.mimeType.length > 150
    ) {
      return jsonError("A valid document content type is required.", 400);
    }
    const prefix = documentStoragePrefix(id);
    if (
      typeof input.storagePath !== "string" ||
      !input.storagePath.startsWith(prefix) ||
      input.storagePath.split("/").includes("..") ||
      input.storagePath.length > 1024
    ) {
      return jsonError("Upload the document to this player's document folder.", 400);
    }
    downloadUrl = validateFirebaseDocumentUrl(input.downloadUrl, input.storagePath);
  } catch (error) {
    return jsonError(error.message, 400);
  }

  try {
    await dbConnect();
    if (!await Player.exists({ _id: id })) return jsonError("Player not found.", 404);
    const document = await PlayerDocument.create({
      playerId: id,
      fileName,
      folderPath,
      storagePath: input.storagePath,
      downloadUrl,
      mimeType: input.mimeType.trim(),
      fileSize: input.fileSize,
      uploadedBy: user.id,
    });
    return NextResponse.json({
      document: {
        id: String(document._id),
        fileName: document.fileName,
        folderPath: document.folderPath,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        createdAt: document.createdAt,
      },
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error.code === 11000) return jsonError("A file with this name already exists in that folder.", 409);
    console.error("Player document could not be registered:", error);
    return jsonError("Player document upload could not be completed.", 500);
  }
}
