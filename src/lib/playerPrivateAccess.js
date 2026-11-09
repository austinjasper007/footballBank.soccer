import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { getAuthUser } from "@/lib/oauth";
import { MediaShare, Player, ResumeRequest } from "@/lib/schemas";

export async function getPlayerPrivateAccess(playerId) {
  const user = await getAuthUser();
  if (!user) return { status: 401, error: "Authentication required." };
  if (!mongoose.Types.ObjectId.isValid(playerId)) {
    return { status: 400, error: "Invalid player." };
  }

  await dbConnect();
  const player = await Player.findById(playerId)
    .select("userId firstName lastName videoPrimary videoAdditional")
    .lean();
  if (!player) return { status: 404, error: "Player not found." };
  if (user.role === "admin" || player.userId?.toString() === user.id) {
    return { status: 200, user, player };
  }

  const [approvedRequest, activeShare] = await Promise.all([
    ResumeRequest.exists({
      requesterId: user.id,
      playerId,
      requestType: "PROFILE",
      status: "APPROVED",
    }),
    MediaShare.exists({
      playerId,
      recipientEmail: user.email.toLowerCase(),
      status: "ACTIVE",
      expiresAt: { $gt: new Date() },
      historyDeletedAt: { $exists: false },
    }),
  ]);
  if (!approvedRequest && !activeShare) {
    return { status: 403, error: "Approved player profile access is required." };
  }

  return { status: 200, user, player };
}
