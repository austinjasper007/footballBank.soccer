import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { MediaAsset, MediaPublication, PlayerMedia } from "@/lib/schemas";
import { requireRole } from "@/lib/oauth";
import { getBunnyStreamLibraryId } from "@/lib/bunnyStream";

export const runtime = "nodejs";

export async function DELETE(_request, { params }) {
  try {
    await requireRole("admin");
    const { assetId } = await params;
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return NextResponse.json({ error: "Invalid media asset." }, { status: 400 });
    }

    const libraryId = getBunnyStreamLibraryId();
    const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: "Bunny Stream credentials are not configured." }, { status: 503 });
    }

    await dbConnect();
    const asset = await MediaAsset.findById(assetId).lean();
    if (!asset) return NextResponse.json({ error: "Media asset not found." }, { status: 404 });

    const response = await fetch(
      `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(asset.bunnyVideoId)}`,
      { method: "DELETE", headers: { AccessKey: apiKey }, cache: "no-store" },
    );
    if (!response.ok && response.status !== 404) {
      const details = await response.text();
      console.error(JSON.stringify({
        event: "media.asset.delete_failed",
        assetId,
        status: response.status,
        details,
      }));
      return NextResponse.json({ error: "Bunny Stream could not delete the video. No database records were removed." }, { status: 502 });
    }

    const placements = await PlayerMedia.find({ assetId }).select("_id").lean();
    const placementIds = placements.map((item) => item._id);
    await Promise.all([
      PlayerMedia.deleteMany({ assetId }),
      MediaPublication.updateMany(
        { featuredMediaId: { $in: placementIds } },
        { $unset: { featuredMediaId: 1 } },
      ),
      MediaAsset.deleteOne({ _id: assetId }),
    ]);

    console.info(JSON.stringify({ event: "media.asset.deleted", assetId, bunnyVideoId: asset.bunnyVideoId }));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (error.message.startsWith("Role ")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    console.error("Failed to delete media asset:", error);
    return NextResponse.json({ error: "Failed to delete media asset." }, { status: 500 });
  }
}
