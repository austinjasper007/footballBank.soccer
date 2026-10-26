import { NextResponse } from "next/server";
import { resetPasswordWithOTP } from "@/actions/authActions";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, otp, newPassword } = body || {};

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      typeof newPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Email, verification code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6 || newPassword.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 6 and 128 characters long" },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithOTP(email, otp, newPassword);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: result.message 
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to set password" },
        { status: result.code === "RATE_LIMITED" ? 429 : 400 }
      );
    }
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
