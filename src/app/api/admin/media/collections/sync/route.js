import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { MediaAsset, PlayerMedia } from "@/lib/schemas";
import { requireRole } from "@/lib/oauth";
import {
  assignBunnyVideoToCollection,
  ensureBunnyStreamCollections,
  getBunnyStreamLibraryId,
} from "@/lib/bunnyStream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

export async function POST() {
  try {
    await requireRole("admin");

    const libraryId = getBunnyStreamLibraryId();
    const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
    if (!libraryId || !apiKey) {
      return jsonError("Bunny Stream credentials are not configured.", 503);
    }

    let collections;
    try {
      collections = await ensureBunnyStreamCollections({ libraryId, apiKey });
    } catch (error) {
      console.error(JSON.stringify({
        event: "media.collection.sync_setup_failed",
        message: error.message,
      }));
      return jsonError("Bunny Stream could not prepare the Match and Highlights collections.", 502);
    }
    await dbConnect();
    const placements = await PlayerMedia.find({
      category: { $in: Object.keys(collections) },
    }).select("assetId category").lean();
    const categoriesByAsset = new Map();
    for (const placement of placements) {
      const key = String(placement.assetId);
      const categories = categoriesByAsset.get(key) || new Set();
      categories.add(placement.category);
      categoriesByAsset.set(key, categories);
    }

    const conflictingAssetIds = [...categoriesByAsset]
      .filter(([, categories]) => categories.size > 1)
      .map(([assetId]) => assetId);
    const assignments = [...categoriesByAsset]
      .filter(([, categories]) => categories.size === 1)
      .map(([assetId, categories]) => ({
        assetId,
        collectionId: collections[categories.values().next().value],
      }));
    const assets = await MediaAsset.find({
      _id: { $in: assignments.map((assignment) => assignment.assetId) },
    }).select("_id bunnyVideoId").lean();
    const assignmentByAssetId = new Map(assignments.map((assignment) => [assignment.assetId, assignment]));

    let updated = 0;
    let failed = 0;
    for (let index = 0; index < assets.length; index += 5) {
      const batch = assets.slice(index, index + 5);
      await Promise.all(batch.map(async (asset) => {
        const assignment = assignmentByAssetId.get(String(asset._id));
        try {
          await assignBunnyVideoToCollection({
            libraryId,
            apiKey,
            videoId: asset.bunnyVideoId,
            collectionId: assignment.collectionId,
          });
          updated += 1;
        } catch (error) {
          failed += 1;
          console.error(JSON.stringify({
            event: "media.collection.sync_video_failed",
            assetId: String(asset._id),
            status: error.message,
          }));
        }
      }));
    }

    console.info(JSON.stringify({
      event: "media.collections.synced",
      updated,
      failed,
      conflictingAssets: conflictingAssetIds.length,
    }));
    if (failed) {
      return NextResponse.json({
        error: `Moved ${updated} video${updated === 1 ? "" : "s"}, but ${failed} could not be updated in Bunny. Retry to finish.`,
        updated,
        failed,
        conflictingAssets: conflictingAssetIds.length,
      }, { status: 502 });
    }

    return NextResponse.json({ updated, conflictingAssets: conflictingAssetIds.length });
  } catch (error) {
    if (error.message === "Authentication required") return jsonError("Authentication required.", 401);
    if (error.message.startsWith("Role ")) return jsonError("Admin access required.", 403);
    console.error("Failed to organize Bunny collections:", error);
    return jsonError("Failed to organize Bunny collections.", 500);
  }
}
