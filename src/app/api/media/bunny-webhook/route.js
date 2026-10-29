import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { MediaAsset, MediaPublication, PlayerMedia } from "@/lib/schemas";
import { getBunnyStreamLibraryId, getBunnyWebhookSigningSecret, verifyBunnyWebhookSignature } from "@/lib/bunnyStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const respond = (message, status) => NextResponse.json({ error: message }, { status });

export async function GET() {
  return NextResponse.json({ endpoint: "bunny-webhook", method: "POST" });
}

export async function POST(request) {
  const signingSecret = getBunnyWebhookSigningSecret();
  if (!signingSecret) {
    console.error("Bunny webhook rejected: signing secret is not configured.");
    return respond("Webhook is not configured.", 503);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
    return respond("Webhook payload is too large.", 413);
  }
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.byteLength > 64 * 1024) return respond("Webhook payload is too large.", 413);

  const signature = request.headers.get("x-bunnystream-signature") || "";
  const version = request.headers.get("x-bunnystream-signature-version");
  const algorithm = request.headers.get("x-bunnystream-signature-algorithm");
  if (!verifyBunnyWebhookSignature(rawBody, signature, version, algorithm, signingSecret)) {
    return respond("Invalid webhook signature.", 401);
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return respond("Invalid webhook payload.", 400);
  }

  const libraryId = getBunnyStreamLibraryId();
  if (
    !libraryId
    || String(event.VideoLibraryId) !== String(libraryId)
    || typeof event.VideoGuid !== "string"
    || !Number.isInteger(event.Status)
  ) {
    return respond("Invalid Bunny webhook fields.", 400);
  }

  let state = new Map([
    [0, "PROCESSING"],
    [1, "PROCESSING"],
    [2, "PROCESSING"],
    [3, "READY"],
    [4, "READY"],
    [5, "FAILED"],
    [6, "UPLOADING"],
    [7, "PROCESSING"],
    [8, "FAILED"],
  ]).get(event.Status);
  if (!state) return NextResponse.json({ received: true, ignored: true });

  try {
    await dbConnect();
    let technicalMetadata = {};
    if (state === "READY") {
      const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
      if (!apiKey) throw new Error("BUNNY_STREAM_API_KEY is required to verify processed video metadata.");
      const detailsResponse = await fetch(
        `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(event.VideoGuid)}`,
        { headers: { AccessKey: apiKey, Accept: "application/json" }, cache: "no-store" },
      );
      if (!detailsResponse.ok) {
        throw new Error(`Bunny video metadata request failed with status ${detailsResponse.status}.`);
      }
      const details = await detailsResponse.json();
      if (
        !Number.isFinite(details.length)
        || !Number.isInteger(details.width)
        || !Number.isInteger(details.height)
        || details.width < 1
        || details.height < 1
      ) {
        throw new Error("Bunny returned incomplete processed video metadata.");
      }
      technicalMetadata = {
        durationSeconds: details.length,
        width: details.width,
        height: details.height,
        ...(typeof details.thumbnailFileName === "string" && details.thumbnailFileName
          ? { thumbnailFileName: details.thumbnailFileName }
          : {}),
      };
      const isWithin1080p = (
        details.width <= 1920 && details.height <= 1080
      ) || (
        details.width <= 1080 && details.height <= 1920
      );
      if (!isWithin1080p) {
        state = "FAILED";
        console.warn(JSON.stringify({
          event: "media.video.resolution_rejected",
          videoId: event.VideoGuid,
          width: details.width,
          height: details.height,
        }));
      }
    }

    const previousStatuses = state === "UPLOADING"
      ? ["UPLOADING"]
      : ["UPLOADING", "PROCESSING"];
    const result = await MediaAsset.updateOne({
      bunnyVideoId: event.VideoGuid,
      status: { $in: previousStatuses },
    }, {
      $set: { ...technicalMetadata, status: state, updatedAt: new Date() },
    });

    if (result.matchedCount === 0) {
      console.info(JSON.stringify({
        event: "media.webhook.ignored",
        videoId: event.VideoGuid,
        status: event.Status,
        reason: "asset_missing_or_status_already_advanced",
      }));
      return NextResponse.json({ received: true, ignored: true });
    }

    if (state === "READY") {
      const asset = await MediaAsset.findOne({ bunnyVideoId: event.VideoGuid }).select("_id").lean();
      if (asset) {
        const playerIds = await PlayerMedia.distinct("playerId", { assetId: asset._id });
        const publications = await MediaPublication.find({
          playerId: { $in: playerIds },
          isPublished: true,
          consentConfirmedAt: { $exists: true, $ne: null },
        }).select("playerId").lean();
        const eligiblePlayerIds = publications.map((item) => item.playerId);
        if (eligiblePlayerIds.length) {
          await PlayerMedia.updateMany(
            { assetId: asset._id, playerId: { $in: eligiblePlayerIds } },
            { $set: { isPublished: true, updatedAt: new Date() } },
          );
        }
      }
    }

    console.info(JSON.stringify({
      event: "media.webhook.processed",
      videoId: event.VideoGuid,
      bunnyStatus: event.Status,
      assetStatus: state,
    }));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Failed to process authenticated Bunny webhook:", error);
    return respond("Webhook processing failed.", 500);
  }
}
