import { getPortalProfile } from "@/lib/access";
import { createSignedEmbedUrl } from "@/lib/playback";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(_request, { params }) {
  const { token, mediaId } = await params;
  const data = await getPortalProfile(token);
  if (!data) {
    return Response.json({ error: "This private player link is invalid or expired." }, {
      status: 404,
      headers: noStoreHeaders,
    });
  }

  const media = data.media.find((item) => item.id === mediaId);
  if (!media) {
    return Response.json({ error: "This video is not available through this private link." }, {
      status: 404,
      headers: noStoreHeaders,
    });
  }

  const playback = createSignedEmbedUrl({
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID,
    tokenKey: process.env.BUNNY_STREAM_TOKEN_AUTH_KEY || process.env.BUNNY_TOKEN_AUTH_KEY,
    videoId: media.bunnyVideoId,
    shareExpiresAt: data.shareExpiresAt,
  });

  if (!playback) {
    return Response.json({ error: "Secure video playback is not configured or this share has expired." }, {
      status: 503,
      headers: noStoreHeaders,
    });
  }

  return Response.json({ url: playback.url }, { headers: noStoreHeaders });
}
