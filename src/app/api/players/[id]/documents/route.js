import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { PlayerDocument } from "@/lib/schemas";
import { getPlayerPrivateAccess } from "@/lib/playerPrivateAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return jsonError("Invalid player.", 400);

  const access = await getPlayerPrivateAccess(id);
  if (access.status !== 200) return jsonError(access.error, access.status);

  try {
    const documents = await PlayerDocument.find({ playerId: id })
      .select("fileName folderPath mimeType fileSize createdAt")
      .sort({ folderPath: 1, fileName: 1 })
      .lean();
    return NextResponse.json({
      documents: documents.map((item) => ({
        id: String(item._id),
        fileName: item.fileName,
        folderPath: item.folderPath || "",
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        createdAt: item.createdAt,
      })),
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Player document list could not be loaded:", error);
    return jsonError("Player documents could not be loaded.", 500);
  }
}
