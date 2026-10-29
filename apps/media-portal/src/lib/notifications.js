import { Resend } from "resend";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

export async function sendPortalActivityEmail({ eventType, playerName, mediaTitle, occurredAt }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required to send media-portal activity notifications.");
  }

  const isVideoPlay = eventType === "VIDEO_PLAY";
  const activity = isVideoPlay ? "started playing a video" : "viewed a private player portal";
  const safePlayerName = escapeHtml(playerName || "a FootballBank player");
  const safeMediaTitle = escapeHtml(mediaTitle);
  const timestamp = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(occurredAt);
  const subjectPlayerName = String(playerName || "FootballBank player")
    .replace(/[\r\n\x00-\x1f\x7f]/g, " ")
    .slice(0, 120);
  const subject = isVideoPlay
    ? `Player video started: ${subjectPlayerName}`
    : `Private player portal viewed: ${subjectPlayerName}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "FootballBank Media <media@footballbank.soccer>",
    to: ["media@footballbank.soccer"],
    subject,
    text: [
      `A visitor ${activity}.`,
      `Player: ${playerName || "FootballBank player"}`,
      ...(isVideoPlay ? [`Video: ${mediaTitle || "Untitled video"}`] : []),
      `Time (UTC): ${timestamp}`,
      "Viewer identity is not collected by the media portal.",
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b1220"><h1 style="font-size:22px">Player media activity</h1><p>A visitor ${escapeHtml(activity)}.</p><p><strong>Player:</strong> ${safePlayerName}</p>${isVideoPlay ? `<p><strong>Video:</strong> ${safeMediaTitle || "Untitled video"}</p>` : ""}<p><strong>Time (UTC):</strong> ${escapeHtml(timestamp)}</p><p style="color:#6b7280;font-size:13px">Viewer identity is not collected by the media portal.</p></div>`,
  });

  if (error) {
    throw new Error(`Resend could not deliver a media-portal activity notification: ${error.message || "unknown error"}`);
  }
}
