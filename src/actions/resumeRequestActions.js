"use server";

import dbConnect from "@/lib/mongodb";
import { Player, ResumeRequest, User } from "@/lib/schemas";
import { requireAuth, requireRole } from "@/lib/oauth";
import { sendEmail } from "@/lib/email";
import { generatePlayerResumePdf } from "@/lib/playerResume";
import { notifyAdmins } from "@/lib/adminNotifications";
import { brandedEmail, escapeEmailHtml } from "@/lib/emailTemplates";
import { revalidatePath } from "next/cache";

const toPlain = (value) => JSON.parse(JSON.stringify(value));

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://footballbank.soccer";

async function sendRequestEmail({ request, type, reason, player }) {
  const requesterName = `${request.requester.firstName} ${request.requester.lastName}`;
  const playerName = `${request.player.firstName} ${request.player.lastName}`;
  const isCvRequest = request.requestType === "CV";
  const subject = type === "submitted"
    ? `Resume request received for ${playerName}`
    : type === "approved"
      ? `${isCvRequest ? "Resume download" : "Resume request"} approved for ${playerName}`
      : `Resume request update for ${playerName}`;
  const message = type === "submitted"
    ? "We have received your request and our team will review it and respond to you."
    : type === "approved"
      ? isCvRequest
        ? "Your resume download request has been approved. The professional resume is attached to this email."
        : `Your request has been approved. You can now view ${playerName}'s protected profile information.`
      : `Your request was not approved at this time${reason ? `: ${reason}` : "."}`;
  const locale = request.locale || "en";
  const link = type === "approved"
    ? `<p><a href="${siteUrl}/${locale}/players/${request.playerId}">View the approved player profile</a></p>`
    : "";

  let attachments;
  if (type === "approved" && isCvRequest && player) {
    attachments = [{
      filename: `${playerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-resume.pdf`,
      content: await generatePlayerResumePdf(player),
    }];
  }

  const email = brandedEmail({
    preheader: message,
    title: subject,
    greeting: `Hello ${requesterName},`,
    body: `<p>${escapeEmailHtml(message)}</p><p><strong>Reason provided:</strong> ${escapeEmailHtml(request.reason)}</p>`,
    ctaLabel: type === "approved" ? "View approved player profile" : undefined,
    ctaUrl: type === "approved" ? `${siteUrl}/${locale}/players/${request.playerId}` : undefined,
    footerNote: "This message was sent because you submitted a FootballBank request.",
  });

  await sendEmail({
    to: request.requester.email,
    subject,
    text: email.text,
    html: email.html,
    attachments,
  });
}

export async function createResumeRequest(playerId, locale = "en", reason, requestType = "PROFILE", phone = "") {
  if (!reason?.trim()) throw new Error("Please provide a reason for this request");
  const authUser = await requireAuth();
  await dbConnect();

  const [user, player] = await Promise.all([
    User.findById(authUser.id).lean(),
    Player.findById(playerId).lean(),
  ]);
  if (!user) throw new Error("Registered user account not found");
  if (!player) throw new Error("Player not found");
  const requesterPhone = user.phone || phone.trim();

  const existing = await ResumeRequest.findOne({
    requesterId: user._id,
    playerId: player._id,
    requestType,
    status: "PENDING",
  }).lean();
  if (existing) throw new Error("You already have a pending request for this player");

  const request = await ResumeRequest.create({
    requesterId: user._id,
    requester: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: requesterPhone,
      role: user.role,
      isVerified: user.isVerified,
      address: user.address,
    },
    playerId: player._id,
    player: {
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
    },
    locale,
    requestType,
    reason: reason.trim(),
  });

  const plainRequest = toPlain(request);
  try {
    await sendRequestEmail({ request: plainRequest, type: "submitted" });
  } catch (error) {
    console.error("Resume request confirmation email failed:", error);
  }
  try {
    await notifyAdmins({
      subject: `New ${requestType === "CV" ? "resume download" : "profile access"} request for ${player.firstName} ${player.lastName}`,
      title: "New player access request",
      message: `${user.firstName} ${user.lastName} (${user.email}, phone: ${requesterPhone || "Not provided"}) requested ${requestType === "CV" ? "a professional resume" : "full profile access"} for ${player.firstName} ${player.lastName}. Reason: ${reason.trim()}`,
      link: "/en/admin",
    });
  } catch (notificationError) {
    console.error("Admin resume request notification failed:", notificationError);
  }
  if (requestType === "PROFILE" && player.email && player.userId?.toString() !== user._id.toString()) {
    try {
      const playerEmail = brandedEmail({
        preheader: `${user.firstName} ${user.lastName} requested access to your profile`,
        title: "Someone requested your full profile",
        greeting: `Hello ${player.firstName},`,
        body: `<p>${escapeEmailHtml(user.firstName)} ${escapeEmailHtml(user.lastName)} (${escapeEmailHtml(user.email)}) requested access to your full player profile.</p><p><strong>Reason provided:</strong> ${escapeEmailHtml(reason.trim())}</p>`,
        ctaLabel: "Open your player profile",
        ctaUrl: `${siteUrl}/${locale}/player-profile`,
        footerNote: "This notification was sent because a registered user requested your player profile.",
      });
      await sendEmail({ to: player.email, subject: `${user.firstName} requested your full player profile`, html: playerEmail.html, text: playerEmail.text });
    } catch (playerNotificationError) {
      console.error("Player profile request notification failed:", playerNotificationError);
    }
  }

  revalidatePath(`/players/${playerId}`);
  revalidatePath("/admin/resume-requests");
  return { success: true, request: plainRequest };
}

export async function getAllResumeRequests() {
  await requireRole("admin");
  await dbConnect();
  const requests = await ResumeRequest.find({}).lean().sort({ createdAt: -1 });
  return requests.map((request) => ({ ...toPlain(request), id: request._id.toString() }));
}

export async function approveResumeRequest(requestId) {
  const admin = await requireRole("admin");
  await dbConnect();
  const request = await ResumeRequest.findByIdAndUpdate(
    requestId,
    { status: "APPROVED", decidedAt: new Date(), decidedBy: admin.id, rejectionReason: undefined },
    { new: true },
  ).lean();
  if (!request) throw new Error("Resume request not found");

  const plainRequest = { ...toPlain(request), id: request._id.toString() };
  const player = await Player.findById(request.playerId).lean();
  try {
    await sendRequestEmail({ request: plainRequest, type: "approved", player });
  } catch (error) {
    console.error("Resume approval email failed:", error);
  }
  revalidatePath(`/players/${request.playerId}`);
  revalidatePath("/admin/resume-requests");
  return plainRequest;
}

export async function rejectResumeRequest(requestId, reason = "The request did not meet the current requirements.") {
  const admin = await requireRole("admin");
  await dbConnect();
  const request = await ResumeRequest.findByIdAndUpdate(
    requestId,
    { status: "REJECTED", rejectionReason: reason, decidedAt: new Date(), decidedBy: admin.id },
    { new: true },
  ).lean();
  if (!request) throw new Error("Resume request not found");

  const plainRequest = { ...toPlain(request), id: request._id.toString() };
  try {
    await sendRequestEmail({ request: plainRequest, type: "rejected", reason });
  } catch (error) {
    console.error("Resume rejection email failed:", error);
  }
  revalidatePath("/admin/resume-requests");
  return plainRequest;
}

export async function deleteResumeRequest(requestId) {
  await requireRole("admin");
  await dbConnect();
  await ResumeRequest.findByIdAndDelete(requestId);
  revalidatePath("/admin/resume-requests");
  return { success: true };
}

export async function hasApprovedResumeAccess(playerId) {
  const authUser = await requireAuth();
  await dbConnect();
  const request = await ResumeRequest.exists({ requesterId: authUser.id, playerId, requestType: "PROFILE", status: "APPROVED" });
  return Boolean(request);
}

export async function getPlayerAccess(playerId) {
  const authUser = await requireAuth();
  await dbConnect();
  const player = await Player.findById(playerId).select("userId").lean();
  if (!player) return { profileAccess: false, cvAccess: false };
  if (authUser.role === "admin") return { profileAccess: true, cvAccess: true };

  const isOwner = player.userId?.toString() === authUser.id;
  const [profileRequest, cvRequest] = await Promise.all([
    ResumeRequest.exists({ requesterId: authUser.id, playerId, requestType: "PROFILE", status: "APPROVED" }),
    ResumeRequest.exists({ requesterId: authUser.id, playerId, requestType: "CV", status: "APPROVED" }),
  ]);
  return { profileAccess: isOwner || Boolean(profileRequest), cvAccess: Boolean(cvRequest) };
}

export async function getAuthorizedPlayerDetails(playerId) {
  const authUser = await requireAuth();
  await dbConnect();
  const player = await Player.findById(playerId)
    .select("userId dob countryCode height weight email phone phoneCountryCode cvUrl description stats clubHistory availableFrom preferredLeagues salaryExpectation")
    .lean();
  if (!player) return null;

  const isOwner = player.userId?.toString() === authUser.id;
  const hasProfileApproval = authUser.role === "admin" || isOwner || Boolean(
    await ResumeRequest.exists({
      requesterId: authUser.id,
      playerId,
      requestType: "PROFILE",
      status: "APPROVED",
    }),
  );
  if (!hasProfileApproval) {
    throw new Error("Approved player profile access is required");
  }

  const { userId: _userId, ...details } = player;
  return toPlain(details);
}
