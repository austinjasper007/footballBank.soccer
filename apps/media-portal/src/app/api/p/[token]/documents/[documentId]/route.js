import mongoose from "mongoose";
import { getActivePortalShare } from "@/lib/access";
import {
  downloadDisposition,
  fetchPlayerDocument,
  normalizeDocumentFileName,
} from "@/lib/documents";
import { PlayerDocument } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(_request, { params }) {
  const { token, documentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    return Response.json(
      { error: "Player document not found." },
      { status: 404, headers: noStoreHeaders },
    );
  }
  const share = await getActivePortalShare(token);
  if (!share || !share.allowDocumentAccess) {
    return Response.json(
      { error: "Document access is not available through this private link." },
      {
        status: 404,
        headers: noStoreHeaders,
      },
    );
  }

  try {
    const document = await PlayerDocument.findOne({
      _id: documentId,
      playerId: share.playerId,
    })
      .select("fileName storagePath downloadUrl mimeType fileSize")
      .lean();
    if (!document) {
      return Response.json(
        { error: "Player document not found." },
        { status: 404, headers: noStoreHeaders },
      );
    }
    const fileName = normalizeDocumentFileName(document.fileName);
    const bytes = await fetchPlayerDocument(document, String(share.playerId));
    return new Response(bytes, {
      headers: {
        ...noStoreHeaders,
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": downloadDisposition(fileName),
        "Content-Length": String(bytes.length),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "Player document download failed in the media portal:",
      error,
    );
    return Response.json(
      { error: "Player document could not be downloaded." },
      {
        status: 502,
        headers: noStoreHeaders,
      },
    );
  }
}
