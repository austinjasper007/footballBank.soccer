"use server";

import dbConnect from "@/lib/mongodb";
import { Player, PlayerProfileView, Post, PostView, ResumeRequest, User } from "@/lib/schemas";
import { getAuthUser } from "@/lib/oauth";
import { sendEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/adminNotifications";
import { brandedEmail, escapeEmailHtml } from "@/lib/emailTemplates";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://footballbank.soccer";

export async function trackPostView(postId, visitorId) {
  await dbConnect();
  await PostView.init();

  try {
    await PostView.create({ postId, visitorId });
  } catch (error) {
    if (error?.code === 11000) return { tracked: false, reason: "already-counted" };
    throw error;
  }

  const post = await Post.findOneAndUpdate(
    { _id: postId, status: "Published" },
    { $inc: { views: 1 } },
    { new: true },
  ).select("views").lean();

  if (!post) {
    await PostView.deleteOne({ postId, visitorId });
    return { tracked: false, reason: "post-unavailable" };
  }

  return { tracked: true, views: post.views };
}

export async function trackPlayerProfileView(playerId, locale = "en") {
  const viewer = await getAuthUser();
  if (!viewer) return { tracked: false, reason: "anonymous" };

  await dbConnect();
  const [player, viewerRecord] = await Promise.all([
    Player.findById(playerId).select("firstName lastName email userId").lean(),
    User.findById(viewer.id).select("firstName lastName email").lean(),
  ]);
  if (!player || !viewerRecord || !player.email) return { tracked: false, reason: "missing-record" };
  if (player.userId?.toString() === viewer.id) return { tracked: false, reason: "owner" };

  const approvedProfileRequest = await ResumeRequest.exists({
    playerId,
    requesterId: viewer.id,
    requestType: "PROFILE",
    status: "APPROVED",
  });
  if (!approvedProfileRequest) return { tracked: false, reason: "no-approved-profile-request" };

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const existingView = await PlayerProfileView.findOne({ playerId, viewerId: viewer.id, viewedAt: { $gte: dayStart } }).lean();
  if (existingView) return { tracked: false, reason: "already-notified-today" };

  await PlayerProfileView.create({ playerId, viewerId: viewer.id });
  const playerName = `${player.firstName} ${player.lastName}`;
  const viewerName = `${viewerRecord.firstName} ${viewerRecord.lastName}`;
  const profileUrl = `${siteUrl}/${locale}/players/${playerId}`;

  try {
    const playerEmail = brandedEmail({
      preheader: `${viewerName} viewed your FootballBank profile`,
      title: "Someone viewed your profile",
      greeting: `Hello ${playerName},`,
      body: `<p><strong>${escapeEmailHtml(viewerName)}</strong> (${escapeEmailHtml(viewerRecord.email)}) viewed your player profile on FootballBank International.</p>`,
      ctaLabel: "View your profile",
      ctaUrl: profileUrl,
      footerNote: "This notification is limited to one email per registered viewer each day.",
    });
    await sendEmail({
      to: player.email,
      subject: `${viewerName} viewed your FootballBank profile`,
      text: playerEmail.text,
      html: playerEmail.html,
    });
  } catch (error) {
    console.error("Player profile view notification failed:", error);
  }

  try {
    await notifyAdmins({
      subject: `${viewerName} viewed ${playerName}'s profile`,
      title: "Registered user viewed a player profile",
      message: `${viewerName} (${viewerRecord.email}) viewed ${playerName}'s FootballBank profile.`,
      link: "/en/admin",
    });
  } catch (error) {
    console.error("Admin player view notification failed:", error);
  }

  return { tracked: true };
}
