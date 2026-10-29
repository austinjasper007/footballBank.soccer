import { getActivePortalShare } from "@/lib/access";
import dbConnect from "@/lib/db";
import { Asset, Media, Player, Publication, TrackingEvent } from "@/lib/models";
import { sendPortalActivityEmail } from "@/lib/notifications";
import { hashViewerSessionId, parseTrackingRequest } from "@/lib/tracking";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function response(body, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export async function POST(request, { params }) {
  const { token } = await params;
  if (Number(request.headers.get("content-length")) > 1024) {
    return response({ error: "The activity request is too large." }, 413);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return response({ error: "The activity request must contain valid JSON." }, 400);
  }

  const trackingRequest = parseTrackingRequest(body);
  if (!trackingRequest) {
    return response({ error: "The activity request is invalid." }, 400);
  }

  const share = await getActivePortalShare(token);
  if (!share) {
    return response({ error: "This private player link is invalid or expired." }, 404);
  }

  await dbConnect();
  await TrackingEvent.init();
  const [player, publication] = await Promise.all([
    Player.findById(share.playerId).select("firstName lastName").lean(),
    Publication.findOne({ playerId: share.playerId, isPublished: true }).select("_id").lean(),
  ]);
  if (!player || !publication) {
    return response({ error: "This player portal is no longer available." }, 404);
  }

  let media;
  if (trackingRequest.eventType === "VIDEO_PLAY") {
    media = await Media.findOne({
      _id: trackingRequest.mediaId,
      playerId: share.playerId,
      isPublished: true,
    }).select("_id title assetId").lean();
    if (!media?.assetId || !await Asset.exists({ _id: media.assetId, status: "READY" })) {
      return response({ error: "This video is not available through this private link." }, 404);
    }
  }

  const eventKey = {
    shareId: share._id,
    viewerSessionHash: hashViewerSessionId(trackingRequest.sessionId),
    eventType: trackingRequest.eventType,
    mediaId: trackingRequest.mediaId,
  };
  let trackingEvent;
  try {
    trackingEvent = await TrackingEvent.findOneAndUpdate(
      eventKey,
      {
        $setOnInsert: {
          playerId: share.playerId,
          notificationStatus: "PENDING",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    trackingEvent = await TrackingEvent.findOne(eventKey);
    if (!trackingEvent) throw error;
  }

  const now = new Date();
  const notification = await TrackingEvent.findOneAndUpdate(
    {
      _id: trackingEvent._id,
      $or: [
        { notificationStatus: { $in: ["PENDING", "FAILED"] } },
        { notificationStatus: "SENDING", notificationLockUntil: { $lt: now } },
      ],
    },
    {
      $set: { notificationStatus: "SENDING", notificationLockUntil: new Date(now.getTime() + 120_000) },
      $unset: { notificationError: 1 },
    },
    { new: true },
  );

  if (!notification) return response({ tracked: true, notified: trackingEvent.notificationStatus === "SENT" });

  try {
    await sendPortalActivityEmail({
      eventType: trackingRequest.eventType,
      playerName: [player.firstName, player.lastName].filter(Boolean).join(" "),
      mediaTitle: media?.title,
      occurredAt: trackingEvent.createdAt || now,
    });
  } catch (error) {
    console.error("Media portal activity notification failed.", error);
    await TrackingEvent.updateOne(
      { _id: trackingEvent._id, notificationStatus: "SENDING" },
      {
        $set: {
          notificationStatus: "FAILED",
          notificationError: error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error.",
        },
        $unset: { notificationLockUntil: 1 },
      },
    );
    return response({ error: "Activity was recorded, but its notification could not be sent." }, 503);
  }

  await TrackingEvent.updateOne(
    { _id: trackingEvent._id, notificationStatus: "SENDING" },
    {
      $set: { notificationStatus: "SENT", notificationSentAt: new Date() },
      $unset: { notificationLockUntil: 1, notificationError: 1 },
    },
  );
  return response({ tracked: true, notified: true });
}
