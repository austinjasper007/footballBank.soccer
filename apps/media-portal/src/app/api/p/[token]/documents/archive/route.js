import { getActivePortalShare } from "@/lib/access";
import {
  createDocumentArchive,
  downloadDisposition,
  fetchPlayerDocument,
  MAX_ARCHIVE_BYTES,
  MAX_ARCHIVE_DOCUMENTS,
  normalizeDocumentFileName,
  normalizeDocumentFolder,
} from "@/lib/documents";
import { Player, PlayerDocument } from "@/lib/models";

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
      .select("fileName folderPath storagePath downloadUrl fileSize")
      .sort({ folderPath: 1, fileName: 1 })
      .lean();
    if (!documents.length) {
      return Response.json({ error: "This player has no documents to archive." }, {
        status: 404,
        headers: noStoreHeaders,
      });
    }
    if (documents.length > MAX_ARCHIVE_DOCUMENTS) {
      return Response.json({ error: "The document archive contains too many files." }, {
        status: 413,
        headers: noStoreHeaders,
      });
    }

    let totalBytes = 0;
    const archiveDocuments = [];
    for (const document of documents) {
      const folderPath = normalizeDocumentFolder(document.folderPath || "");
      const fileName = normalizeDocumentFileName(document.fileName);
      if (!Number.isSafeInteger(document.fileSize) || document.fileSize < 1) {
        throw new Error("A stored document has an invalid file size.");
      }
      totalBytes += document.fileSize;
      if (totalBytes > MAX_ARCHIVE_BYTES) {
        return Response.json({ error: "The document archive exceeds the 100 MB download limit." }, {
          status: 413,
          headers: noStoreHeaders,
        });
      }
      const bytes = await fetchPlayerDocument(document, String(share.playerId));
      archiveDocuments.push({ fileName, folderPath, bytes });
    }

    const archive = createDocumentArchive(archiveDocuments);
    if (archive.byteLength > MAX_ARCHIVE_BYTES) {
      return Response.json({ error: "The document archive exceeds the 100 MB download limit." }, {
        status: 413,
        headers: noStoreHeaders,
      });
    }
    const player = await Player.findById(share.playerId).select("firstName lastName").lean();
    const playerName = `${player?.firstName || ""}-${player?.lastName || ""}`
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "player";
    return new Response(Buffer.from(archive), {
      headers: {
        ...noStoreHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": downloadDisposition(`${playerName}-documents.zip`),
        "Content-Length": String(archive.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Player document archive failed in the media portal:", error);
    return Response.json({ error: "Player document archive could not be created." }, {
      status: 502,
      headers: noStoreHeaders,
    });
  }
}
