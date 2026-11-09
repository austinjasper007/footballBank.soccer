import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getPlayerPrivateAccess } from "@/lib/playerPrivateAccess";
import { downloadDisposition } from "@/lib/playerDocuments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });
const allowedVideoHost = (hostname) =>
  hostname === "firebasestorage.googleapis.com" ||
  hostname === "storage.googleapis.com" ||
  hostname === "video.bunnycdn.com" ||
  hostname.endsWith(".b-cdn.net");

export async function GET(_request, { params }) {
  const { id, videoIndex: rawIndex } = await params;
  if (!mongoose.Types.ObjectId.isValid(id) || !/^(0|[1-9]\d*)$/.test(rawIndex)) {
    return jsonError("Invalid player video.", 400);
  }

  const access = await getPlayerPrivateAccess(id);
  if (access.status !== 200) return jsonError(access.error, access.status);

  const index = Number(rawIndex);
  const videos = [access.player.videoPrimary, ...(access.player.videoAdditional || [])]
    .filter((url) => typeof url === "string" && url);
  if (!Number.isSafeInteger(index) || !videos[index]) {
    return jsonError("Player video not found.", 404);
  }

  let videoUrl;
  try {
    videoUrl = new URL(videos[index]);
  } catch {
    return jsonError("Player video URL is invalid.", 502);
  }
  if (
    videoUrl.protocol !== "https:" ||
    videoUrl.username ||
    videoUrl.password ||
    !allowedVideoHost(videoUrl.hostname)
  ) {
    return jsonError("This video cannot be downloaded from its configured host.", 502);
  }

  try {
    const upstream = await fetch(videoUrl, {
      cache: "no-store",
      redirect: "error",
    });
    if (!upstream.ok || !upstream.body) {
      return jsonError("The video could not be downloaded.", 502);
    }
    const extension = videoUrl.pathname.match(/\.(mp4|mov)(?:$|[?#])/i)?.[1]?.toLowerCase() || "mp4";
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "Content-Disposition": downloadDisposition(`player-video-${index + 1}.${extension}`),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    return new Response(upstream.body, { headers });
  } catch (error) {
    console.error("Player video download failed:", error);
    return jsonError("The video could not be downloaded.", 502);
  }
}
