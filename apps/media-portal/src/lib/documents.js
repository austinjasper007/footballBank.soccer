import { zipSync } from "fflate";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_ARCHIVE_DOCUMENTS = 100;
export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

export function normalizeDocumentFileName(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 255 ||
    /[\\/\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("The document has an invalid file name.");
  }
  return value.trim();
}

export function normalizeDocumentFolder(value) {
  if (typeof value !== "string" || value.length > 500) {
    throw new Error("The document has an invalid folder path.");
  }
  const parts = value.split(/[\\/]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.some((part) =>
    part === "." ||
    part === ".." ||
    part.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(part)
  )) {
    throw new Error("The document has an invalid folder path.");
  }
  return parts.join("/");
}

export function downloadDisposition(fileName) {
  const fallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function createDocumentArchive(documents) {
  const files = Object.create(null);
  for (const document of documents) {
    const folderPath = normalizeDocumentFolder(document.folderPath || "");
    const fileName = normalizeDocumentFileName(document.fileName);
    const archivePath = [folderPath, fileName].filter(Boolean).join("/");
    if (Object.hasOwn(files, archivePath)) {
      throw new Error("The document archive contains duplicate file paths.");
    }
    files[archivePath] = document.bytes;
  }
  return zipSync(files, { level: 6 });
}

function validatedFirebaseUrl(document, playerId) {
  if (
    typeof document.storagePath !== "string" ||
    !document.storagePath.startsWith(`players/${playerId}/documents/`) ||
    document.storagePath.length > 1024
  ) {
    throw new Error("The document storage path is invalid.");
  }

  let url;
  try {
    url = new URL(document.downloadUrl);
  } catch {
    throw new Error("The document download URL is invalid.");
  }
  const encodedObjectPath = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
  let objectPath = "";
  try {
    objectPath = encodedObjectPath ? decodeURIComponent(encodedObjectPath[1]) : "";
  } catch {
    throw new Error("The document download URL is invalid.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "firebasestorage.googleapis.com" ||
    url.username ||
    url.password ||
    url.hash ||
    !url.searchParams.get("token") ||
    objectPath !== document.storagePath
  ) {
    throw new Error("The document download URL is invalid.");
  }
  return url;
}

export async function fetchPlayerDocument(document, playerId) {
  const url = validatedFirebaseUrl(document, playerId);
  if (!Number.isSafeInteger(document.fileSize) || document.fileSize < 1 || document.fileSize > MAX_DOCUMENT_BYTES) {
    throw new Error("The document exceeds the permitted file size.");
  }
  const response = await fetch(url, { cache: "no-store", redirect: "error" });
  if (!response.ok) {
    throw new Error(`Firebase Storage returned status ${response.status}.`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES) {
    throw new Error("The stored document exceeds the permitted file size.");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES || bytes.length !== document.fileSize) {
    throw new Error("The stored document is incomplete or exceeds the permitted file size.");
  }
  return bytes;
}
