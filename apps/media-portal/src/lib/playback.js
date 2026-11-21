// import crypto from "node:crypto";

// export const PLAYBACK_TTL_SECONDS = 15 * 60;
// export const VIDEO_DOWNLOAD_TTL_SECONDS = 15 * 60;

// export function createBunnyThumbnailUrl(libraryId, videoId, thumbnailFileName) {
//   if (!libraryId || !videoId) return null;
//   const filename = typeof thumbnailFileName === "string" && thumbnailFileName.trim()
//     ? thumbnailFileName.trim()
//     : "thumbnail.jpg";
//   return `https://vz-${encodeURIComponent(libraryId)}.b-cdn.net/${encodeURIComponent(videoId)}/${encodeURIComponent(filename)}`;
// }

// export function createSignedEmbedUrl({ libraryId, tokenKey, videoId, shareExpiresAt, nowSeconds = Math.floor(Date.now() / 1000) }) {
//   const shareExpiry = Math.floor(new Date(shareExpiresAt).getTime() / 1000);
//   const expires = Math.min(nowSeconds + PLAYBACK_TTL_SECONDS, shareExpiry);
//   if (!libraryId || !tokenKey || !videoId || !Number.isFinite(shareExpiry) || expires <= nowSeconds) return null;

//   const token = crypto.createHash("sha256").update(`${tokenKey}${videoId}${expires}`).digest("hex");
//   const query = new URLSearchParams({ token, expires: String(expires) });
//   return {
//     url: `https://player.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?${query}`,
//     expires,
//   };
// }

// export function createSignedVideoDownloadUrl({
//   cdnHostname,
//   tokenKey,
//   videoId,
//   shareExpiresAt,
//   nowSeconds = Math.floor(Date.now() / 1000),
// }) {
//   const shareExpiry = Math.floor(new Date(shareExpiresAt).getTime() / 1000);
//   const expires = Math.min(nowSeconds + VIDEO_DOWNLOAD_TTL_SECONDS, shareExpiry);
//   if (!cdnHostname || !tokenKey || !videoId || !/^[A-Za-z0-9-]+$/.test(videoId) || !Number.isFinite(shareExpiry) || expires <= nowSeconds) {
//     return null;
//   }

//   let baseUrl;
//   try {
//     baseUrl = new URL(`https://${cdnHostname}`);
//   } catch {
//     return null;
//   }
//   if (baseUrl.protocol !== "https:" || baseUrl.hostname !== cdnHostname || baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
//     return null;
//   }

//   const path = `/${encodeURIComponent(videoId)}/play_720p.mp4`;
//   const token = crypto.createHash("md5")
//     .update(`${tokenKey}${path}${expires}`)
//     .digest("base64url");
//   const url = new URL(path, baseUrl);
//   url.searchParams.set("token", token);
//   url.searchParams.set("expires", String(expires));
//   return { url: url.toString(), expires };
// }



import crypto from "node:crypto";

export const PLAYBACK_TTL_SECONDS = 15 * 60;
export const VIDEO_DOWNLOAD_TTL_SECONDS = 15 * 60;
export const THUMBNAIL_TTL_SECONDS = 60 * 60;

const ALLOWED_MP4_RESOLUTIONS = new Set(["240p", "360p", "480p", "720p", "1080p"]);

function validateCdnBaseUrl(cdnHostname) {
  if (!cdnHostname || typeof cdnHostname !== "string") return null;
  try {
    const baseUrl = new URL(`https://${cdnHostname}`);
    if (
      baseUrl.protocol !== "https:" ||
      baseUrl.hostname !== cdnHostname ||
      baseUrl.pathname !== "/" ||
      baseUrl.search ||
      baseUrl.hash
    ) {
      return null;
    }
    return baseUrl;
  } catch {
    return null;
  }
}

function resolveExpiry(shareExpiresAt, ttlSeconds, nowSeconds) {
  const maxExpiry = nowSeconds + ttlSeconds;
  if (shareExpiresAt == null) return maxExpiry;
  const shareExpiry = Math.floor(new Date(shareExpiresAt).getTime() / 1000);
  if (!Number.isFinite(shareExpiry)) return null;
  return Math.min(maxExpiry, shareExpiry);
}

/**
 * Signs any file path on your Bunny CDN Pull Zone using Bunny's
 * HMAC-SHA256 Advanced Token Authentication (HS256-<base64url>).
 */
function signBunnyCdnPath({ cdnHostname, cdnTokenKey, path, expires }) {
  const baseUrl = validateCdnBaseUrl(cdnHostname);
  if (!baseUrl || !cdnTokenKey || !path) return null;

  // Bunny Advanced Token format: HMAC-SHA256(key, "{path}{expires}") prefixed with "HS256-"
  const hmac = crypto
    .createHmac("sha256", cdnTokenKey)
    .update(`${path}${expires}`)
    .digest("base64url");

  const url = new URL(path, baseUrl);
  url.searchParams.set("token", `HS256-${hmac}`);
  url.searchParams.set("expires", String(expires));
  return { url: url.toString(), expires };
}

/**
 * Generates a signed thumbnail URL (prevents 403 errors when CDN Token Auth is enabled).
 */
export function createSignedThumbnailUrl({
  cdnHostname,
  cdnTokenKey,
  videoId,
  thumbnailFileName,
  shareExpiresAt,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  const expires = resolveExpiry(shareExpiresAt, THUMBNAIL_TTL_SECONDS, nowSeconds);
  if (!videoId || !/^[A-Za-z0-9-]+$/.test(videoId) || !expires || expires <= nowSeconds) {
    return null;
  }

  const filename =
    typeof thumbnailFileName === "string" && thumbnailFileName.trim()
      ? thumbnailFileName.trim()
      : "thumbnail.jpg";

  const path = `/${encodeURIComponent(videoId)}/${encodeURIComponent(filename)}`;
  return signBunnyCdnPath({ cdnHostname, cdnTokenKey, path, expires });
}

/**
 * Generates a signed iframe embed URL using Bunny Stream's Embed Token Key (SHA-256 hex).
 */
export function createSignedEmbedUrl({
  libraryId,
  embedTokenKey,
  videoId,
  shareExpiresAt,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  const expires = resolveExpiry(shareExpiresAt, PLAYBACK_TTL_SECONDS, nowSeconds);
  if (!libraryId || !embedTokenKey || !videoId || !expires || expires <= nowSeconds) {
    return null;
  }

  const token = crypto
    .createHash("sha256")
    .update(`${embedTokenKey}${videoId}${expires}`)
    .digest("hex");

  const query = new URLSearchParams({ token, expires: String(expires) });
  return {
    url: `https://mediadelivery.net{encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?${query}`,
    expires,
  };
}

/**
 * Generates a signed MP4 download URL using Bunny's CDN Token Key (HMAC-SHA256).
 */
export function createSignedVideoDownloadUrl({
  cdnHostname,
  cdnTokenKey,
  videoId,
  resolution = "720p",
  shareExpiresAt,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  const expires = resolveExpiry(shareExpiresAt, VIDEO_DOWNLOAD_TTL_SECONDS, nowSeconds);
  if (
    !videoId ||
    !/^[A-Za-z0-9-]+$/.test(videoId) ||
    !ALLOWED_MP4_RESOLUTIONS.has(resolution) ||
    !expires ||
    expires <= nowSeconds
  ) {
    return null;
  }

  const path = `/${encodeURIComponent(videoId)}/play_${resolution}.mp4`;
  return signBunnyCdnPath({ cdnHostname, cdnTokenKey, path, expires });
}
