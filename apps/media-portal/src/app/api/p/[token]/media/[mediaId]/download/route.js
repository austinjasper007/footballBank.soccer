import mongoose from "mongoose";
import { getActivePortalShare } from "@/lib/access";
import { downloadDisposition } from "@/lib/documents";
import { Asset, Media } from "@/lib/models";
import { createSignedVideoDownloadUrl } from "@/lib/playback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(_request, { params }) {
  const { token, mediaId } = await params;
  if (!mongoose.Types.ObjectId.isValid(mediaId)) {
    return Response.json({ error: "This video is not available through this private link." }, {
      status: 404,
      headers: noStoreHeaders,
    });
  }
  const share = await getActivePortalShare(token);
  if (!share || !share.allowVideoDownload) {
    return Response.json({ error: "Video downloads are not available through this private link." }, {
      status: 404,
      headers: noStoreHeaders,
    });
  }

  try {
    const publication = await Media.findOne({
      _id: mediaId,
      playerId: share.playerId,
      isPublished: true,
    }).select("assetId title").lean();
    if (!publication) {
      return Response.json({ error: "This video is not available through this private link." }, {
        status: 404,
        headers: noStoreHeaders,
      });
    }
    if (!mongoose.Types.ObjectId.isValid(publication.assetId)) {
      return Response.json({ error: "This video is not ready to download." }, {
        status: 404,
        headers: noStoreHeaders,
      });
    }
    const asset = await Asset.findOne({ _id: publication.assetId, status: "READY" })
      .select("bunnyVideoId")
      .lean();
    if (!asset?.bunnyVideoId) {
      return Response.json({ error: "This video is not ready to download." }, {
        status: 404,
        headers: noStoreHeaders,
      });
    }

    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID;
    const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME || (
      libraryId ? `vz-${libraryId}.b-cdn.net` : ""
    );
    const cdnTokenKey = process.env.BUNNY_STREAM_CDN_TOKEN_AUTH_KEY || process.env.BUNNY_CDN_TOKEN_AUTH_KEY;
    if (!cdnTokenKey) {
      console.error("Bunny CDN video downloads are not configured: BUNNY_STREAM_CDN_TOKEN_AUTH_KEY is missing.");
      return Response.json({ error: "Secure video downloads are not configured. Ask the administrator to configure Bunny CDN token authentication for the media portal." }, {
        status: 503,
        headers: noStoreHeaders,
      });
    }

    if (!cdnHostname) {
      console.error("Bunny CDN video downloads are not configured: no CDN hostname or library ID is set.");
      return Response.json({ error: "Secure video downloads are not configured. Ask the administrator to configure the Bunny CDN hostname." }, {
        status: 503,
        headers: noStoreHeaders,
      });
    }

    if (!share.expiresAt || new Date(share.expiresAt).getTime() <= Date.now()) {
      return Response.json({ error: "This private link has expired." }, {
        status: 403,
        headers: noStoreHeaders,
      });
    }

    const signedDownload = createSignedVideoDownloadUrl({
      cdnHostname,
      tokenKey: cdnTokenKey,
      videoId: asset.bunnyVideoId,
      shareExpiresAt: share.expiresAt,
    });
    if (!signedDownload) {
      console.error("Bunny CDN video download URL could not be signed; check the CDN hostname and video ID configuration.");
      return Response.json({ error: "Secure video downloads could not be configured. Ask the administrator to check the Bunny CDN hostname and video settings." }, {
        status: 503,
        headers: noStoreHeaders,
      });
    }

    const upstream = await fetch(signedDownload.url, { cache: "no-store", redirect: "error" });
    if (!upstream.ok || !upstream.body) {
      console.error("Bunny Stream video download failed:", upstream.status);
      return Response.json({ error: "The video could not be downloaded." }, {
        status: 502,
        headers: noStoreHeaders,
      });
    }
    const safeTitle = typeof publication.title === "string" && publication.title.trim()
      ? publication.title.trim()
      : `player-video-${mediaId}`;
    const headers = new Headers({
      ...noStoreHeaders,
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "Content-Disposition": downloadDisposition(`${safeTitle}.mp4`),
      "X-Content-Type-Options": "nosniff",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);
    return new Response(upstream.body, { headers });
  } catch (error) {
    console.error("Player video download failed in the media portal:", error);
    return Response.json({ error: "The video could not be downloaded." }, {
      status: 502,
      headers: noStoreHeaders,
    });
  }
}
