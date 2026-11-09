export const MAX_PLAYER_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_PLAYER_DOCUMENTS_PER_ARCHIVE = 100;
export const MAX_PLAYER_ARCHIVE_BYTES = 100 * 1024 * 1024;

export function normalizeDocumentFolder(value) {
  if (typeof value !== "string" || value.length > 500) {
    throw new Error("Folder path must be 500 characters or fewer.");
  }
  const parts = value.split(/[\\/]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.some((part) =>
    part === "." ||
    part === ".." ||
    part.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(part)
  )) {
    throw new Error("Folder names cannot contain traversal or control characters.");
  }
  return parts.join("/");
}
