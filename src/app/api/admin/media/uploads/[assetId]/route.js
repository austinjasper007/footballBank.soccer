import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { MediaAsset, PlayerMedia } from "@/lib/schemas";
import { requireRole } from "@/lib/oauth";
import {
  assignBunnyVideoToCollection,
  ensureBunnyStreamCollections,
  getBunnyStreamLibraryId,
  getBunnyUploadCredentials,
} from "@/lib/bunnyStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const admin = await requireRole("admin");
    const { assetId } = await params;
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return NextResponse.json({ error: "Invalid upload session." }, { status: 400 });
    }
    const input = await request.json();
    if (!mongoose.Types.ObjectId.isValid(input?.playerId)) {
      return NextResponse.json({ error: "Choose a valid player." }, { status: 400 });
    }

    await dbConnect();
    const asset = await MediaAsset.findOne({ _id: assetId, uploadedBy: admin.id }).lean();
    if (!asset) return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
    const placement = await PlayerMedia.findOne({
      assetId: asset._id,
      playerId: input.playerId,
      title: input.title,
    }).select("_id category").lean();
    if (
      !placement
      || asset.originalFileName !== input.fileName
      || asset.uploadFileSize !== input.fileSize
      || asset.uploadMimeType !== input.mimeType
    ) {
      return NextResponse.json({ error: "Upload session does not match this video." }, { status: 403 });
    }
    if (asset.status === "PROCESSING" || asset.status === "READY") {
      return NextResponse.json({ alreadyUploaded: true, status: asset.status });
    }
    if (asset.status !== "UPLOADING") {
      return NextResponse.json({ error: "This upload cannot be resumed. Delete it and start again." }, { status: 409 });
    }

    const libraryId = getBunnyStreamLibraryId();
    const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
    if (!libraryId || !apiKey) {
      const missingSettings = [
        !libraryId && "BUNNY_LIBRARY_ID (or BUNNY_STREAM_LIBRARY_ID)",
        !apiKey && "BUNNY_STREAM_API_KEY",
      ].filter(Boolean);
      console.error(JSON.stringify({ event: "media.upload.configuration_missing", settings: missingSettings }));
      return NextResponse.json({
        error: `Bunny Stream is not configured. Add ${missingSettings.join(" and ")} to the main app environment, then restart the app.`,
      }, { status: 503 });
    }

    let collectionId;
    try {
      const collections = await ensureBunnyStreamCollections({ libraryId, apiKey });
      collectionId = collections[placement.category];
      await assignBunnyVideoToCollection({
        libraryId,
        apiKey,
        videoId: asset.bunnyVideoId,
        collectionId,
      });
    } catch (error) {
      console.error(JSON.stringify({
        event: "media.upload.resume_collection_failed",
        assetId: String(asset._id),
        message: error.message,
      }));
      return NextResponse.json({
        error: "Bunny Stream could not prepare the video's collection. Please retry.",
      }, { status: 502 });
    }

    return NextResponse.json({
      assetId: String(asset._id),
      ...getBunnyUploadCredentials({
        libraryId,
        apiKey,
        videoId: asset.bunnyVideoId,
        collectionId,
      }),
    });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (error.message.startsWith("Role ")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    console.error("Failed to resume Bunny upload:", error);
    return NextResponse.json({ error: "Failed to resume the video upload." }, { status: 500 });
  }
}
