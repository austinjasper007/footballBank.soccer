import crypto from "node:crypto";

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEDIA_ID_PATTERN = /^[0-9a-f]{24}$/i;

export function parseTrackingRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.sessionId !== "string" || !SESSION_ID_PATTERN.test(value.sessionId)) return null;

  if (value.eventType === "PAGE_VIEW") {
    return { eventType: "PAGE_VIEW", mediaId: "", sessionId: value.sessionId.toLowerCase() };
  }

  if (
    value.eventType === "VIDEO_PLAY"
    && typeof value.mediaId === "string"
    && MEDIA_ID_PATTERN.test(value.mediaId)
  ) {
    return {
      eventType: "VIDEO_PLAY",
      mediaId: value.mediaId.toLowerCase(),
      sessionId: value.sessionId.toLowerCase(),
    };
  }

  return null;
}

export function hashViewerSessionId(sessionId) {
  return crypto.createHash("sha256").update(sessionId).digest("hex");
}
