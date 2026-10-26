"use server";

import crypto from "node:crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import { MediaPublication, MediaShare, Player, PlayerMedia, MediaAsset, MediaPlaylist } from "@/lib/schemas";
import { requireRole } from "@/lib/oauth";
import { sendMediaAccessEmail } from "@/lib/email";

const portalUrl = () => {
  const configuredUrl = process.env.MEDIA_PORTAL_URL?.trim();
  if (!configuredUrl) {
    throw new Error("MEDIA_PORTAL_URL is required to send a media access invite.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("MEDIA_PORTAL_URL must be a valid portal base URL.");
  }
  if (
    !["http:", "https:"].includes(parsedUrl.protocol)
    || !parsedUrl.hostname
    || parsedUrl.username
    || parsedUrl.password
    || parsedUrl.pathname !== "/"
    || parsedUrl.search
    || parsedUrl.hash
  ) {
    throw new Error("MEDIA_PORTAL_URL must be an HTTP(S) origin without a path or query.");
  }

  return parsedUrl.origin;
};
const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

export async function getMediaPortalPlayers() {
  await requireRole("admin");
  await dbConnect();
  const [players, publications] = await Promise.all([
    Player.find({}).select("firstName lastName position currentClub headshotUrl").lean(),
    MediaPublication.find({}).lean(),
  ]);
  const byPlayer = new Map(publications.map((item) => [String(item.playerId), item]));
  return players.map((player) => {
    const publication = byPlayer.get(String(player._id));
    return {
      id: String(player._id),
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      currentClub: player.currentClub,
      headshotUrl: player.headshotUrl,
      publication: publication ? {
        isPublished: Boolean(publication.isPublished),
        consentConfirmedAt: publication.consentConfirmedAt?.toISOString() || null,
        contactConsentConfirmedAt: publication.contactConsentConfirmedAt?.toISOString() || null,
      } : null,
    };
  });
}

export async function setMediaPublication(playerId, { isPublished, consentConfirmed, featuredMediaId } = {}) {
  const admin = await requireRole("admin");
  if (!playerId || (isPublished && !consentConfirmed)) throw new Error("Player consent must be confirmed before publishing.");
  await dbConnect();
  const update = { isPublished: Boolean(isPublished), updatedAt: new Date() };
  if (consentConfirmed) Object.assign(update, { consentConfirmedAt: new Date(), consentConfirmedBy: admin.id });
  if (featuredMediaId !== undefined) update.featuredMediaId = featuredMediaId || undefined;
  const publication = await MediaPublication.findOneAndUpdate(
    { playerId },
    { $set: update, $setOnInsert: { playerId } },
    { new: true, upsert: true },
  ).lean();
  console.info(JSON.stringify({
    event: publication.isPublished ? "media.publication.published" : "media.publication.unpublished",
    playerId,
    adminId: admin.id,
  }));
  return {
    playerId: String(publication.playerId),
    isPublished: Boolean(publication.isPublished),
    consentConfirmedAt: publication.consentConfirmedAt?.toISOString() || null,
    contactConsentConfirmedAt: publication.contactConsentConfirmedAt?.toISOString() || null,
  };
}

export async function setMediaContactConsent(playerId, confirmed) {
  const admin = await requireRole("admin");
  if (!playerId || typeof confirmed !== "boolean") {
    throw new Error("A player and contact-sharing consent decision are required.");
  }
  await dbConnect();
  const update = confirmed
    ? {
      $set: {
        contactConsentConfirmedAt: new Date(),
        contactConsentConfirmedBy: admin.id,
        updatedAt: new Date(),
      },
      $setOnInsert: { playerId },
    }
    : {
      $unset: {
        contactConsentConfirmedAt: 1,
        contactConsentConfirmedBy: 1,
      },
      $set: { updatedAt: new Date() },
    };
  const publication = await MediaPublication.findOneAndUpdate(
    { playerId },
    update,
    { new: true, upsert: confirmed },
  ).select("contactConsentConfirmedAt").lean();
  console.info(JSON.stringify({
    event: confirmed ? "media.contact_consent.confirmed" : "media.contact_consent.revoked",
    playerId,
    adminId: admin.id,
  }));
  return {
    playerId: String(playerId),
    contactConsentConfirmedAt: publication?.contactConsentConfirmedAt?.toISOString() || null,
  };
}

export async function sendMediaShare(input) {
  const admin = await requireRole("admin");
  const { playerId, recipientName, recipientEmail, organization, customMessage, expiresAt } = input || {};
  if (!playerId || !recipientName || !recipientEmail || !expiresAt) throw new Error("Player, recipient details, and expiry are required.");
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.valueOf()) || expiry <= new Date()) throw new Error("Expiry must be a future UTC date and time.");
  await dbConnect();
  const [publication, media, player] = await Promise.all([
    MediaPublication.findOne({ playerId }).select("isPublished consentConfirmedAt").lean(),
    PlayerMedia.find({ playerId }).populate("assetId").lean(),
    Player.findById(playerId).select("firstName lastName").lean(),
  ]);
  if (!player) throw new Error("The selected player could not be found. Refresh the player list and try again.");
  if (!publication?.consentConfirmedAt) {
    throw new Error("Player consent is not recorded. Confirm consent before sending an access invite.");
  }
  if (!publication.isPublished) {
    throw new Error("This player's profile is unpublished. Publish the profile before sending an access invite.");
  }
  const readyMedia = media.filter((item) => item.assetId?.status === "READY");
  if (!readyMedia.length) {
    const processingCount = media.filter((item) => ["UPLOADING", "PROCESSING"].includes(item.assetId?.status)).length;
    const failedCount = media.filter((item) => item.assetId?.status === "FAILED").length;
    const reason = processingCount
      ? "At least one video is still uploading or processing."
      : failedCount
        ? "The player's uploaded video has failed processing."
        : "Upload a video first.";
    throw new Error(`${reason} A Bunny-ready video is required before sending an invite.`);
  }
  if (!readyMedia.some((item) => item.isPublished)) {
    throw new Error("The video is ready, but unpublished. Turn on Publish for at least one ready video before sending an invite.");
  }
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const url = `${portalUrl()}/p/${rawToken}`;
  // Send first: a failed provider request never creates an active access record.
  await sendMediaAccessEmail({ to: recipientEmail, recipientName, playerName: `${player.firstName} ${player.lastName}`, organization, customMessage, expiresAt: expiry, url });
  const share = await MediaShare.create({ tokenHash: tokenHash(rawToken), playerId, recipientName, recipientEmail: recipientEmail.toLowerCase(), organization, customMessage, sentBy: admin.id, sentAt: new Date(), expiresAt: expiry });
  console.info(JSON.stringify({ event: "media.share.sent", shareId: String(share._id), playerId, adminId: admin.id }));
  return { id: String(share._id), expiresAt: share.expiresAt, status: share.status };
}

export async function revokeMediaShare(shareId) {
  await requireRole("admin");
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(shareId)) throw new Error("Invalid recipient share.");
  const share = await MediaShare.findByIdAndUpdate(
    shareId,
    { $set: { status: "REVOKED", revokedAt: new Date() } },
    { new: true },
  ).lean();
  console.info(JSON.stringify({ event: "media.share.revoked", shareId }));
  return share ? { id: String(share._id), status: share.status, revokedAt: share.revokedAt } : null;
}

export async function deleteMediaShareHistory(playerId, shareIds) {
  const admin = await requireRole("admin");
  if (!mongoose.Types.ObjectId.isValid(playerId)) throw new Error("Choose a valid player.");

  const clearAll = shareIds === null;
  if (
    !clearAll
    && (
      !Array.isArray(shareIds)
      || shareIds.length < 1
      || shareIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
    )
  ) {
    throw new Error("Select one or more valid share history entries.");
  }

  await dbConnect();
  const filter = {
    playerId,
    historyDeletedAt: { $exists: false },
  };
  if (!clearAll) {
    const selectedIds = [...new Set(shareIds.map(String))];
    filter._id = { $in: selectedIds };
    const matchingShares = await MediaShare.find(filter).select("_id status").lean();
    if (matchingShares.length !== selectedIds.length) {
      throw new Error("Some selected share history entries are no longer available. Refresh and try again.");
    }
  }

  const historyIds = clearAll
    ? undefined
    : filter._id.$in;
  const now = new Date();
  if (historyIds) {
    await MediaShare.updateMany(
      { playerId, _id: { $in: historyIds }, status: "ACTIVE", historyDeletedAt: { $exists: false } },
      { $set: { status: "REVOKED", revokedAt: now } },
    );
  } else {
    await MediaShare.updateMany(
      { playerId, status: "ACTIVE", historyDeletedAt: { $exists: false } },
      { $set: { status: "REVOKED", revokedAt: now } },
    );
  }

  const result = await MediaShare.updateMany(filter, {
    $set: { historyDeletedAt: now, historyDeletedBy: admin.id },
  });
  console.info(JSON.stringify({
    event: "media.share.history_cleared",
    playerId,
    adminId: admin.id,
    count: result.modifiedCount,
    scope: clearAll ? "all" : "selected",
  }));
  return { deletedCount: result.modifiedCount };
}

export async function getMediaPortalLibrary(playerId) {
  await requireRole("admin");
  if (!mongoose.Types.ObjectId.isValid(playerId)) throw new Error("Choose a valid player.");
  await dbConnect();
  const now = new Date();
  const expired = await MediaShare.updateMany(
    { playerId, status: "ACTIVE", expiresAt: { $lte: now } },
    { $set: { status: "EXPIRED" } },
  );
  if (expired.modifiedCount) {
    console.info(JSON.stringify({ event: "media.share.expired", playerId, count: expired.modifiedCount }));
  }
  const [placements, playlists, shares] = await Promise.all([
    PlayerMedia.find({ playerId }).populate("assetId").sort({ displayOrder: 1, createdAt: -1 }).lean(),
    MediaPlaylist.find({ playerId }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    MediaShare.find({ playerId, historyDeletedAt: { $exists: false } }).sort({ sentAt: -1 }).lean(),
  ]);
  return {
    media: placements.map((item) => ({
      id: String(item._id),
      assetId: String(item.assetId?._id || item.assetId),
      status: item.assetId?.status || "DELETED",
      category: item.category,
      title: item.title,
      description: item.description || "",
      season: item.season || "",
      competition: item.competition || "",
      matchDate: item.matchDate || null,
      playerClub: item.playerClub || "",
      opponent: item.opponent || "",
      playlistIds: (item.playlistIds || []).map(String),
      isPublished: Boolean(item.isPublished),
      isFeatured: Boolean(item.isFeatured),
      displayOrder: item.displayOrder || 0,
    })),
    playlists: playlists.map((item) => ({
      id: String(item._id),
      title: item.title,
      displayOrder: item.displayOrder || 0,
    })),
    shares: shares.map((item) => ({
      id: String(item._id),
      recipientName: item.recipientName,
      recipientEmail: item.recipientEmail,
      organization: item.organization || "",
      sentAt: item.sentAt,
      expiresAt: item.expiresAt,
      status: item.status,
      firstOpenedAt: item.firstOpenedAt || null,
      lastOpenedAt: item.lastOpenedAt || null,
    })),
  };
}

export async function createMediaPlaylist(playerId, title) {
  await requireRole("admin");
  if (!mongoose.Types.ObjectId.isValid(playerId)) throw new Error("Choose a valid player.");
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    throw new Error("Playlist title must be between 1 and 120 characters.");
  }
  await dbConnect();
  const playerExists = await Player.exists({ _id: playerId });
  if (!playerExists) throw new Error("Player not found.");
  const displayOrder = await MediaPlaylist.countDocuments({ playerId });
  const playlist = await MediaPlaylist.create({ playerId, title: title.trim(), displayOrder });
  console.info(JSON.stringify({ event: "media.playlist.created", playlistId: String(playlist._id), playerId }));
  return { id: String(playlist._id), title: playlist.title, displayOrder: playlist.displayOrder };
}

export async function updatePlayerMedia(mediaId, input) {
  await requireRole("admin");
  if (!mongoose.Types.ObjectId.isValid(mediaId)) throw new Error("Invalid player media.");
  const patch = input || {};
  const allowedKeys = new Set([
    "title", "description", "season", "competition", "matchDate", "playerClub",
    "opponent", "playlistIds", "isPublished", "isFeatured", "displayOrder",
  ]);
  if (Object.keys(patch).some((key) => !allowedKeys.has(key))) throw new Error("Unsupported media update.");
  await dbConnect();

  const media = await PlayerMedia.findById(mediaId).populate("assetId");
  if (!media) throw new Error("Player media not found.");
  if (patch.title !== undefined && (typeof patch.title !== "string" || !patch.title.trim() || patch.title.trim().length > 180)) {
    throw new Error("Media title must be between 1 and 180 characters.");
  }
  const textLimits = {
    description: 2000,
    season: 80,
    competition: 120,
    playerClub: 120,
    opponent: 120,
  };
  for (const [field, maxLength] of Object.entries(textLimits)) {
    if (patch[field] !== undefined && (typeof patch[field] !== "string" || patch[field].length > maxLength)) {
      throw new Error(`${field} must be a string of at most ${maxLength} characters.`);
    }
  }
  if (patch.displayOrder !== undefined && (!Number.isInteger(patch.displayOrder) || patch.displayOrder < 0)) {
    throw new Error("Display order must be a non-negative whole number.");
  }
  if (patch.matchDate !== undefined && patch.matchDate !== null && patch.matchDate !== "") {
    const date = new Date(patch.matchDate);
    if (Number.isNaN(date.valueOf())) throw new Error("Invalid match date.");
  }
  if (patch.isPublished === true) {
    if (media.assetId?.status !== "READY") throw new Error("Only Bunny-ready videos can be published.");
    const publication = await MediaPublication.findOne({ playerId: media.playerId }).select("consentConfirmedAt").lean();
    if (!publication?.consentConfirmedAt) throw new Error("Player consent must be confirmed before publishing media.");
  }
  if (patch.playlistIds !== undefined) {
    if (!Array.isArray(patch.playlistIds) || patch.playlistIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw new Error("Invalid playlist selection.");
    }
    const count = await MediaPlaylist.countDocuments({
      _id: { $in: patch.playlistIds },
      playerId: media.playerId,
    });
    if (count !== new Set(patch.playlistIds.map(String)).size) {
      throw new Error("Playlists must belong to the selected player.");
    }
  }
  if (patch.isFeatured === true) {
    await PlayerMedia.updateMany({ playerId: media.playerId }, { $set: { isFeatured: false } });
    await MediaPublication.findOneAndUpdate(
      { playerId: media.playerId },
      { $set: { featuredMediaId: media._id, updatedAt: new Date() } },
      { upsert: true },
    );
  } else if (patch.isFeatured === false) {
    await MediaPublication.updateOne(
      { playerId: media.playerId, featuredMediaId: media._id },
      { $unset: { featuredMediaId: 1 } },
    );
  }

  const update = { ...patch, updatedAt: new Date() };
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.matchDate !== undefined) {
    update.matchDate = patch.matchDate ? new Date(patch.matchDate) : undefined;
  }
  const updated = await PlayerMedia.findByIdAndUpdate(mediaId, { $set: update }, { new: true, runValidators: true }).lean();
  return { id: String(updated._id), ...update };
}
