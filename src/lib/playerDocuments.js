import { MAX_PLAYER_DOCUMENT_BYTES } from "@/lib/playerDocumentRules";

export { MAX_PLAYER_ARCHIVE_BYTES, MAX_PLAYER_DOCUMENTS_PER_ARCHIVE } from "@/lib/playerDocumentRules";

export function normalizeDocumentFileName(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 255 ||
    /[\\/\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error("Choose a valid file name of 1 to 255 characters.");
  }
  return value.trim();
}

export function validateFirebaseDocumentUrl(value, storagePath) {
  let url;
  try {
    if (typeof value !== "string" || value.length > 4096) {
      throw new Error();
    }
    url = new URL(value);
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
    objectPath !== storagePath
  ) {
    throw new Error("Documents must be uploaded to the player's Firebase Storage folder.");
  }
  return url.toString();
}

export function documentStoragePrefix(playerId) {
  return `players/${playerId}/documents/`;
}

export function downloadDisposition(fileName) {
  const fallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function fetchFirebaseDocument(downloadUrl, expectedSize) {
  const response = await fetch(downloadUrl, {
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`Firebase Storage returned status ${response.status}.`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_PLAYER_DOCUMENT_BYTES
  ) {
    throw new Error("The stored document exceeds the permitted file size.");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    !bytes.length ||
    bytes.length > MAX_PLAYER_DOCUMENT_BYTES ||
    (expectedSize && bytes.length !== expectedSize)
  ) {
    throw new Error("The stored document is incomplete or exceeds the permitted file size.");
  }
  return bytes;
}
