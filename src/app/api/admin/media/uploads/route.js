import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { MediaAsset, Player, PlayerMedia } from "@/lib/schemas";
import { requireRole } from "@/lib/oauth";
import {
  ensureBunnyStreamCollections,
  getBunnyStreamLibraryId,
  getBunnyUploadCredentials,
} from "@/lib/bunnyStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 * 1024;
const allowedMimeTypes = new Set(["video/mp4", "video/quicktime"]);
const allowedExtensions = new Set([".mp4", ".mov"]);

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

export async function POST(request) {
  try {
    const admin = await requireRole("admin");
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return jsonError("Invalid upload request.", 400);
    }
    const {
      playerId,
      title,
      category,
      fileName,
      fileSize,
      mimeType,
      description = "",
      season = "",
      competition = "",
      playerClub = "",
      opponent = "",
      matchDate,
    } = input;

    if (!mongoose.Types.ObjectId.isValid(playerId)) return jsonError("Choose a valid player.", 400);
    if (typeof title !== "string" || !title.trim() || title.trim().length > 180) {
      return jsonError("A title of 1 to 180 characters is required.", 400);
    }
    if (!["FULL_MATCH", "HIGHLIGHT"].includes(category)) return jsonError("Choose a valid media category.", 400);
    if (typeof fileName !== "string" || fileName.length > 255) return jsonError("Choose a valid file.", 400);
    const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(mimeType)) {
      return jsonError("Only MP4 and MOV video files are supported.", 400);
    }
    if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_UPLOAD_BYTES) {
      return jsonError("The video must be between 1 byte and 20 GB.", 400);
    }
    const textLimits = { description: 2000, season: 80, competition: 120, playerClub: 120, opponent: 120 };
    for (const [field, maxLength] of Object.entries(textLimits)) {
      if (typeof input[field] !== "undefined" && (typeof input[field] !== "string" || input[field].length > maxLength)) {
        return jsonError(`${field} must be a string of at most ${maxLength} characters.`, 400);
      }
    }
    const parsedMatchDate = matchDate ? new Date(matchDate) : undefined;
    if (parsedMatchDate && Number.isNaN(parsedMatchDate.valueOf())) {
      return jsonError("Invalid match date.", 400);
    }

    const libraryId = getBunnyStreamLibraryId();
    const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
    const missingSettings = [
      !libraryId && "BUNNY_LIBRARY_ID (or BUNNY_STREAM_LIBRARY_ID)",
      !apiKey && "BUNNY_STREAM_API_KEY",
    ].filter(Boolean);
    if (missingSettings.length) {
      console.error(JSON.stringify({ event: "media.upload.configuration_missing", settings: missingSettings }));
      return jsonError(
        `Bunny Stream is not configured. Add ${missingSettings.join(" and ")} to the main app environment, then restart the app.`,
        503,
      );
    }

    await dbConnect();
    const player = await Player.findById(playerId).select("_id").lean();
    if (!player) return jsonError("Player not found.", 404);

    let collections;
    try {
      collections = await ensureBunnyStreamCollections({ libraryId, apiKey });
    } catch (error) {
      console.error(JSON.stringify({
        event: "media.upload.collection_setup_failed",
        message: error.message,
      }));
      return jsonError("Bunny Stream could not prepare the Match and Highlights collections. Please retry.", 502);
    }

    const bunnyResponse = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`, {
      method: "POST",
      headers: { AccessKey: apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ title: title.trim(), collectionId: collections[category] }),
      cache: "no-store",
    });
    if (!bunnyResponse.ok) {
      const details = await bunnyResponse.text();
      console.error(JSON.stringify({ event: "media.upload.create_video_failed", status: bunnyResponse.status, details }));
      return jsonError("Bunny Stream could not create the upload. Please retry.", 502);
    }

    const video = await bunnyResponse.json();
    if (typeof video.guid !== "string" || !video.guid) {
      console.error(JSON.stringify({ event: "media.upload.invalid_video_response", video }));
      return jsonError("Bunny Stream returned an invalid video identifier.", 502);
    }

    let asset;
    try {
      asset = await MediaAsset.create({
        bunnyVideoId: video.guid,
        status: "UPLOADING",
        originalFileName: fileName,
        uploadFileSize: fileSize,
        uploadMimeType: mimeType,
        uploadedBy: admin.id,
      });
      await PlayerMedia.create({
        playerId,
        assetId: asset._id,
        category,
        title: title.trim(),
        description,
        season,
        competition,
        playerClub,
        opponent,
        matchDate: parsedMatchDate,
        isPublished: false,
      });

      const credentials = getBunnyUploadCredentials({
        libraryId,
        apiKey,
        videoId: video.guid,
        collectionId: collections[category],
      });

      console.info(JSON.stringify({
        event: "media.upload.initialized",
        assetId: String(asset._id),
        playerId,
        adminId: admin.id,
        fileSize,
      }));

      return NextResponse.json({
        assetId: String(asset._id),
        ...credentials,
      });
    } catch (error) {
      if (asset) {
        await Promise.all([
          PlayerMedia.deleteMany({ assetId: asset._id }),
          MediaAsset.deleteOne({ _id: asset._id }),
        ]);
      }
      const cleanup = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(video.guid)}`, {
        method: "DELETE",
        headers: { AccessKey: apiKey },
        cache: "no-store",
      });
      if (!cleanup.ok && cleanup.status !== 404) {
        console.error(JSON.stringify({
          event: "media.upload.orphan_cleanup_failed",
          videoId: video.guid,
          status: cleanup.status,
        }));
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid JSON request.", 400);
    if (error.message === "Authentication required") return jsonError("Authentication required.", 401);
    if (error.message.startsWith("Role ")) return jsonError("Admin access required.", 403);
    console.error("Failed to initialize Bunny upload:", error);
    return jsonError("Failed to initialize the video upload.", 500);
  }
}
