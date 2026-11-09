import { getActivePortalShare } from "@/lib/access";
import { normalizeDocumentFileName, normalizeDocumentFolder } from "@/lib/documents";
import { PlayerDocument } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(_request, { params }) {
  const { token } = await params;
  const share = await getActivePortalShare(token);
  if (!share || !share.allowDocumentAccess) {
    return Response.json({ error: "Document access is not available through this private link." }, {
      status: 404,
      headers: noStoreHeaders,
    });
  }

  try {
    const documents = await PlayerDocument.find({ playerId: share.playerId })
      .select("fileName folderPath mimeType fileSize createdAt")
      .sort({ folderPath: 1, fileName: 1 })
      .lean();
    return Response.json({
      documents: documents.map((document) => ({
        id: String(document._id),
        fileName: normalizeDocumentFileName(document.fileName),
        folderPath: normalizeDocumentFolder(document.folderPath || ""),
        mimeType: document.mimeType || "application/octet-stream",
        fileSize: document.fileSize || 0,
        createdAt: document.createdAt || null,
      })),
    }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Player documents could not be loaded in the media portal:", error);
    return Response.json({ error: "Player documents could not be loaded." }, {
      status: 500,
      headers: noStoreHeaders,
    });
  }
}
