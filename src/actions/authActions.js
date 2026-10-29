
"use server";

import { User, OtpToken } from "@/lib/schemas";
import { sendOTPEmail, sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { getCountryCallingCode } from "libphonenumber-js";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongodb";
import { z } from "zod";
import { randomInt } from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const OTP_EXPIRY_MINUTES = 10;
const SESSION_EXPIRY_DAYS = 30;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_WINDOW_MS = 60 * 1000;

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(6).max(128);
const otpSchema = z.string().regex(/^\d{6}$/, "Verification code must be 6 digits");
const nameSchema = z.string().trim().min(1).max(80);

const normalizeEmail = (email) => emailSchema.parse(email);
const validationError = (error) => error instanceof z.ZodError ? error.issues[0]?.message : null;

/** ---------- Helpers ---------- **/

// Generate a 6-digit OTP
const generateOTP = () => randomInt(100000, 1000000).toString();

// Generate session JWT with user data embedded
const generateSessionToken = (user) =>
  jwt.sign({
    userId: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isVerified: user.isVerified,
    authMethod: "otp",
    iat: Math.floor(Date.now() / 1000),
  }, JWT_SECRET, { expiresIn: `${SESSION_EXPIRY_DAYS}d` });

// Clean expired OTPs (sessions are now stateless JWT tokens)
const cleanExpiredOTPs = async () => {
  await OtpToken.deleteMany({ expiresAt: { $lt: new Date() } }).catch(console.error);
};

/** ---------- Password Authentication ---------- **/

// Login with email and password
export async function loginWithPassword(email, password) {
  await dbConnect();
  try {
    const normalizedEmail = normalizeEmail(email);
    passwordSchema.parse(password);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return { success: false, error: "No account found with this email address" };
    }

    // Check if user has a password set
    if (!user.password) {
      return { 
        success: false, 
        error: "Password not set for this account. Please use OTP login or set a password first." 
      };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return { success: false, error: `Account temporarily locked. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`, code: "ACCOUNT_LOCKED" };
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: failedAttempts, updatedAt: new Date() };
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        update.failedLoginAttempts = 0;
      }
      await User.findByIdAndUpdate(user._id, update);
      return failedAttempts >= MAX_LOGIN_ATTEMPTS
        ? { success: false, error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`, code: "ACCOUNT_LOCKED" }
        : { success: false, error: "Invalid password", code: "INVALID_CREDENTIALS" };
    }

    await User.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() });

    // Generate session token
    const sessionToken = generateSessionToken(user);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 86400,
      path: "/",
    });

    // console.log("🔐 Password login successful for user:", user.email);

    return {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  } catch (error) {
    const message = validationError(error);
    if (message) return { success: false, error: message, code: "VALIDATION_ERROR" };
    console.error("Error in password login:", error);
    return { success: false, error: "Login failed. Please try again." };
  }
}

// Change password for authenticated user
export async function changePassword(userId, currentPassword, newPassword) {
  await dbConnect();
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    console.error("Error changing password:", error);
    return { success: false, error: "Failed to change password. Please try again." };
  }
}

// Signup with password (alternative to OTP signup)
export async function signupWithPassword(email, firstName, lastName, password, address, shippingAddress) {
  return {
    success: false,
    error: "Email verification is required. Request a verification code before creating your account.",
  };

}

// Password recovery - send reset OTP
export async function sendPasswordResetOTP(email) {
  try {
    const normalizedEmail = normalizeEmail(email);
    await dbConnect();
    await cleanExpiredOTPs();

    const user = await User.findOne({ email: normalizedEmail }).select("_id email firstName");
    if (!user) return { success: false, error: "No account found with this email address" };

    const now = new Date();
    const recentOtp = await OtpToken.findOne({
      email: normalizedEmail,
      type: "PASSWORD_RESET",
      createdAt: { $gt: new Date(now.getTime() - OTP_RESEND_WINDOW_MS) },
    }).select("_id").lean();
    if (recentOtp) {
      return { success: false, error: "Please wait before requesting another reset code.", code: "RATE_LIMITED" };
    }

    const otp = generateOTP();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await OtpToken.updateMany(
      { email: normalizedEmail, type: "PASSWORD_RESET", status: "PENDING" },
      { $set: { status: "FAILED" } },
    );

    await OtpToken.create({
      userId: user._id,
      email: normalizedEmail,
      token: otp,
      type: "PASSWORD_RESET",
      status: "PENDING",
      expiresAt,
    });

    await sendOTPEmail(normalizedEmail, otp, "reset");

    return { success: true, message: "Password reset code sent to your email" };
  } catch (error) {
    const message = validationError(error);
    if (message) return { success: false, error: message };
    console.error("Error sending password reset OTP:", error);
    return { success: false, error: "Failed to send reset code. Please try again." };
  }
}

// Reset password with OTP
export async function resetPasswordWithOTP(email, otp, newPassword) {
  try {
    const normalizedEmail = normalizeEmail(email);
    otpSchema.parse(otp);
    passwordSchema.parse(newPassword);
    await dbConnect();
    const now = new Date();
    const otpRecord = await OtpToken.findOne({
      email: normalizedEmail,
      type: "PASSWORD_RESET",
      status: "PENDING",
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 }).select("_id userId token attempts").lean();
    if (!otpRecord) return { success: false, error: "Invalid or expired verification code" };
    if ((otpRecord.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      await OtpToken.updateOne(
        { _id: otpRecord._id, status: "PENDING" },
        { $set: { status: "FAILED" } },
      );
      return { success: false, error: "Invalid or expired verification code" };
    }
    if (otpRecord.token !== otp) {
      const failedAttempt = await OtpToken.findOneAndUpdate(
        {
          _id: otpRecord._id,
          status: "PENDING",
          expiresAt: { $gt: now },
          attempts: { $lt: MAX_OTP_ATTEMPTS },
        },
        { $inc: { attempts: 1 } },
        { new: true },
      ).select("attempts").lean();
      if (failedAttempt?.attempts >= MAX_OTP_ATTEMPTS) {
        await OtpToken.updateOne(
          { _id: otpRecord._id, status: "PENDING" },
          { $set: { status: "FAILED" } },
        );
      }
      return { success: false, error: "Invalid or expired verification code" };
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const consumedOtp = await OtpToken.updateOne(
      {
        _id: otpRecord._id,
        status: "PENDING",
        expiresAt: { $gt: now },
        attempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      { $set: { status: "VERIFIED", verifiedAt: now } },
    );
    if (consumedOtp.modifiedCount !== 1) {
      return { success: false, error: "Invalid or expired verification code" };
    }
    const updatedUser = await User.findByIdAndUpdate(
      otpRecord.userId,
      { password: hashed, updatedAt: now },
      { new: true },
    ).select("_id");
    if (!updatedUser) return { success: false, error: "Account not found" };

    return { success: true, message: "Password reset successfully" };
  } catch (error) {
    const message = validationError(error);
    if (message) return { success: false, error: message };
    console.error("Error resetting password:", error);
    return { success: false, error: "Failed to reset password. Please try again." };
  }
}

/** ---------- OTP & Auth Actions ---------- **/

// Send OTP for login
export async function sendLoginOTP(email) {
  try {
    const normalizedEmail = normalizeEmail(email);
    // console.log("🔍 Starting sendLoginOTP for email:", email);
    // console.log("🔍 Environment check:");
    // console.log("- JWT_SECRET exists:", !!process.env.JWT_SECRET);
    // console.log("- RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    // console.log("- DATABASE_URL exists:", !!process.env.DATABASE_URL);
    
    await dbConnect();
    // console.log("🔍 Database connected successfully");

    await cleanExpiredOTPs();
    // console.log("🔍 Cleaned expired OTPs");

    const user = await User.findOne({ email: normalizedEmail });
    // console.log("🔍 User lookup result:", user ? "User found" : "User not found");
    
    if (!user) {
      // console.log("🔍 No user found for email:", email);
      return { success: false, error: "No account found with this email address" };
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return { success: false, error: "Account temporarily locked. Try again later.", code: "ACCOUNT_LOCKED" };
    }

    const recentOtp = await OtpToken.findOne({ email: normalizedEmail, type: "LOGIN", createdAt: { $gt: new Date(Date.now() - OTP_RESEND_WINDOW_MS) } }).lean();
    if (recentOtp) return { success: false, error: "Please wait before requesting another login code.", code: "RATE_LIMITED" };

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    // console.log("🔍 Generated OTP:", otp, "Expires at:", expiresAt);

    await OtpToken.deleteMany({ email: normalizedEmail, type: "LOGIN", status: "PENDING" });
    const otpRecord = await OtpToken.create({ 
      userId: user._id, 
      email: normalizedEmail,
      token: otp, 
      type: "LOGIN", 
      status: "PENDING", 
      expiresAt 
    });
    // console.log("🔍 OTP record created:", otpRecord._id);

    // console.log("🔍 Attempting to send email...");
    const emailResult = await sendOTPEmail(normalizedEmail, otp, "login");
    // console.log("🔍 Email send result:", emailResult);

    return { success: true, message: "Login code sent to your email" };
  } catch (error) {
    console.error("🔍 Error sending login OTP:", error);
    console.error("🔍 Error stack:", error.stack);
    const message = validationError(error);
    return { 
      success: false, 
      error: message || "Failed to send login code. Please try again.",
      debug: error.message
    };
  }
}

// Send OTP for signup
export async function sendSignupOTP(email, firstName, lastName) {
  await dbConnect();
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    nameSchema.parse(firstName);
    nameSchema.parse(lastName);
    if (!normalizedEmail) return { success: false, error: "Enter a valid email address" };
    await cleanExpiredOTPs();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return { success: false, error: "Account with this email already exists" };

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OtpToken.deleteMany({ email: normalizedEmail, type: "SIGNUP", status: "PENDING" });
    await OtpToken.create({ email: normalizedEmail, token: otp, type: "SIGNUP", status: "PENDING", expiresAt });
    await sendOTPEmail(normalizedEmail, otp, "signup");

    return { success: true, message: "Verification code sent to your email" };
  } catch (error) {
    console.error("Error sending signup OTP:", error);
    return { success: false, error: "Failed to send verification code. Please try again." };
  }
}

// Verify login OTP
export async function verifyLoginOTP(email, otp) {
  await dbConnect();
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    emailSchema.parse(normalizedEmail);
    otpSchema.parse(otp);
    const otpRecord = await OtpToken.findOne({
      email: normalizedEmail,
      type: "LOGIN",
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord) return { success: false, error: "Invalid or expired verification code", code: "INVALID_OTP" };

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      otpRecord.status = "FAILED";
      await otpRecord.save();
      return { success: false, error: "Too many invalid codes. Request a new code.", code: "OTP_LOCKED" };
    }

    if (otpRecord.token !== otp) {
      otpRecord.attempts += 1;
      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) otpRecord.status = "FAILED";
      await otpRecord.save();
      return { success: false, error: otpRecord.status === "FAILED" ? "Too many invalid codes. Request a new code." : "Invalid verification code", code: "INVALID_OTP" };
    }

    const user = await User.findById(otpRecord.userId);
    if (!user) return { success: false, error: "User not found" };

    otpRecord.status = "VERIFIED";
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    const sessionToken = generateSessionToken(user);

    // Set session cookie with JWT containing user data (NO DATABASE SESSION STORAGE)
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 86400,
      path: "/", // Ensure cookie is available for all paths
    });

    // console.log("🔐 Session created and cookie set for user:", user.email);

    return {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  } catch (error) {
    const message = validationError(error);
    if (message) return { success: false, error: message, code: "VALIDATION_ERROR" };
    console.error("Error verifying login OTP:", error);
    return { success: false, error: "Failed to verify code. Please try again." };
  }
}

// Verify signup OTP and create user
export async function verifySignupOTP(email, otp, firstName, lastName, phone, phoneCountryCode, address, shippingAddress, password = "") {
  await dbConnect();
  try {
    const normalizedEmail = email?.trim().toLowerCase();
    const otpRecord = await OtpToken.findOne({
      email: normalizedEmail,
      token: otp,
      type: "SIGNUP",
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) return { success: false, error: "Invalid or expired verification code" };

    otpRecord.status = "VERIFIED";
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    // ✅ Create new user
    const normalizedPhone = `+${getCountryCallingCode(phoneCountryCode)}${phone || ""}`.replace(/\s+/g, "").trim();
    if (!phone?.trim() || !phoneCountryCode) {
      return { success: false, error: "A phone number and country calling code are required." };
    }

    const userData = {
      email: normalizedEmail,
      firstName,
      lastName,
      phone: normalizedPhone,
      phoneCountryCode,
      role: "user",
      isVerified: true,
      ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
      address,
      shippingAddress,
      subscribed: false, // default
    };

    const user = await User.create(userData);

    try {
      await sendWelcomeEmail({ to: user.email, firstName: user.firstName });
    } catch (welcomeError) {
      console.error("Welcome email failed:", welcomeError);
    }

    user.subscribed = false;
    await user.save();

    // ✅ Create session token
    const sessionToken = generateSessionToken(user);
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_DAYS * 86400,
      path: "/",
    });


    return {
      success: true,
      user: {
        id: user._id.toString(),
        email,
        firstName,
        lastName,
        role: "user",
        isVerified: true,
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to create account. Please try again." };
  }
}



/** ---------- Session Management ---------- **/

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    if (!sessionToken) return null;

    // Verify JWT token directly (NO DATABASE QUERY)
    const decoded = jwt.verify(sessionToken, JWT_SECRET);
    
    // Validate required fields in JWT
    if (!decoded.userId || !decoded.email) {
      // console.log("Invalid JWT payload - missing required fields, clearing token");
      // Clear the invalid token
      try {
        const store = await cookies();
        store.delete("session");
      } catch (clearError) {
        // console.log("Could not clear invalid token:", clearError.message);
      }
      return null;
    }

    // Return user data directly from JWT (NO DATABASE QUERY)
    return {
      id: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      role: decoded.role,
      isVerified: decoded.isVerified,
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      // console.log("Invalid JWT token, clearing cookie");
      // Clear invalid token
      try {
        const store = await cookies();
        store.delete("session");
      } catch (clearError) {
        // console.log("Could not clear invalid token:", clearError.message);
      }
    } else if (error.name === 'TokenExpiredError') {
      // console.log("JWT token expired, clearing cookie");
      // Clear expired token
      try {
        const store = await cookies();
        store.delete("session");
      } catch (clearError) {
        // console.log("Could not clear expired token:", clearError.message);
      }
    } else {
      console.error("JWT verification error:", error.message);
    }
    return null;
  }
}

export async function logout() {
  try {
    // Simply clear the session cookie (NO DATABASE OPERATIONS NEEDED)
    const cookieStore = await cookies();
    cookieStore.delete("session");
    return { success: true };
  } catch (error) {
    console.error("Error logging out:", error);
    return { success: false, error: "Failed to logout" };
  }
}


/** ---------- Maintenance ---------- **/
export async function cleanupExpiredTokens() {
  await dbConnect();
  try {
    // Only clean OTPs since sessions are now stateless JWT tokens
    await cleanExpiredOTPs();
    return { success: true };
  } catch (error) {
    console.error("Error cleaning expired tokens:", error);
    return { success: false };
  }
}