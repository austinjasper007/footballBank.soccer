import crypto from "node:crypto";

export const PLAYBACK_TTL_SECONDS = 15 * 60;

export function createBunnyThumbnailUrl(libraryId, videoId, thumbnailFileName) {
  if (!libraryId || !videoId) return null;
  const filename = typeof thumbnailFileName === "string" && thumbnailFileName.trim()
    ? thumbnailFileName.trim()
    : "thumbnail.jpg";
  return `https://vz-${encodeURIComponent(libraryId)}.b-cdn.net/${encodeURIComponent(videoId)}/${encodeURIComponent(filename)}`;
}

export function createSignedEmbedUrl({ libraryId, tokenKey, videoId, shareExpiresAt, nowSeconds = Math.floor(Date.now() / 1000) }) {
  const shareExpiry = Math.floor(new Date(shareExpiresAt).getTime() / 1000);
  const expires = Math.min(nowSeconds + PLAYBACK_TTL_SECONDS, shareExpiry);
  if (!libraryId || !tokenKey || !videoId || !Number.isFinite(shareExpiry) || expires <= nowSeconds) return null;

  const token = crypto.createHash("sha256").update(`${tokenKey}${videoId}${expires}`).digest("hex");
  const query = new URLSearchParams({ token, expires: String(expires) });
  return {
    url: `https://player.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?${query}`,
    expires,
  };
}
