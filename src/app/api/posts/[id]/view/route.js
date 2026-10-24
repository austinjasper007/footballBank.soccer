import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { trackPostView } from "@/actions/viewTrackingActions";

const DEVICE_COOKIE = "footballbank_device_id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request, { params }) {
  const { id: postId } = await params;
  if (!mongoose.isObjectIdOrHexString(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  const cookieStore = await cookies();
  let visitorId = cookieStore.get(DEVICE_COOKIE)?.value;
  const isNewVisitor = !visitorId || !UUID_PATTERN.test(visitorId);
  if (isNewVisitor) {
    const requestedVisitorId = request.headers.get("x-device-id");
    visitorId = requestedVisitorId && UUID_PATTERN.test(requestedVisitorId)
      ? requestedVisitorId
      : randomUUID();
  }

  try {
    const result = await trackPostView(postId, visitorId);
    if (result.reason === "post-unavailable") {
      return NextResponse.json({ tracked: false }, { status: 404 });
    }

    const response = NextResponse.json({ tracked: result.tracked });
    if (isNewVisitor) {
      response.cookies.set(DEVICE_COOKIE, visitorId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  } catch (error) {
    console.error("Error tracking post view:", error);
    return NextResponse.json({ error: "Failed to track post view" }, { status: 500 });
  }
}
