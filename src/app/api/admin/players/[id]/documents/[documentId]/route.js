import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getAuthUser } from "@/lib/oauth";
import { PlayerDocument } from "@/lib/schemas";
import { documentStoragePrefix } from "@/lib/playerDocuments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

async function authorizeAdmin() {
  const user = await getAuthUser();
  if (!user) return jsonError("Authentication required.", 401);
  if (user.role !== "admin") return jsonError("Administrator access is required.", 403);
  return null;
}

async function getDocument(id, documentId) {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(documentId)) {
    return { response: jsonError("Invalid player document.", 400) };
  }
  const authError = await authorizeAdmin();
  if (authError) return { response: authError };

  await dbConnect();
  const document = await PlayerDocument.findOne({ _id: documentId, playerId: id })
    .select("storagePath")
    .lean();
  if (!document) return { response: jsonError("Player document not found.", 404) };
  if (!document.storagePath.startsWith(documentStoragePrefix(id))) {
    console.error("Player document has an invalid Firebase Storage path:", documentId);
    return { response: jsonError("Player document storage path is invalid.", 500) };
  }
  return { document };
}

export async function GET(_request, { params }) {
  const { id, documentId } = await params;
  try {
    const result = await getDocument(id, documentId);
    if (result.response) return result.response;
    return NextResponse.json({ storagePath: result.document.storagePath }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Player document storage details could not be loaded:", error);
    return jsonError("Player document storage details could not be loaded.", 500);
  }
}

export async function DELETE(_request, { params }) {
  const { id, documentId } = await params;
  try {
    const result = await getDocument(id, documentId);
    if (result.response) return result.response;
    await PlayerDocument.deleteOne({ _id: documentId, playerId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Player document metadata could not be deleted:", error);
    return jsonError("Player document metadata could not be deleted.", 500);
  }
}
