import crypto from "node:crypto";
import dbConnect from "@/lib/db";
import { Asset, Media, Player, Playlist, Publication, Share } from "@/lib/models";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const playerFields = [
  "firstName",
  "lastName",
  "country",
  "currentClub",
  "position",
  "height",
  "weight",
  "foot",
  "description",
  "headshotUrl",
  "imageUrl",
  "stats",
  "clubHistory",
  "contractStatus",
  "availableFrom",
  "preferredLeagues",
].join(" ");

export async function getPortalProfile(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  await dbConnect();
  const now = new Date();
  const tokenHash = hash(token);
  const existingShare = await Share.findOne({ tokenHash }).select("_id status expiresAt").lean();
  if (!existingShare) return null;
  if (existingShare.status !== "ACTIVE") return null;
  if (existingShare.expiresAt <= now) {
    await Share.updateOne(
      { _id: existingShare._id, status: "ACTIVE", expiresAt: { $lte: now } },
      { $set: { status: "EXPIRED" } },
    );
    return null;
  }

  const share = await Share.findOneAndUpdate(
    { _id: existingShare._id, status: "ACTIVE", expiresAt: { $gt: now } },
    { $min: { firstOpenedAt: now }, $set: { lastOpenedAt: now } },
    { new: true },
  ).select("playerId expiresAt").lean();
  if (!share) return null;

  const publication = await Publication.findOne({
    playerId: share.playerId,
    isPublished: true,
  }).lean();
  if (!publication) return null;

  const [player, placements, playlists] = await Promise.all([
    Player.findById(share.playerId).select(playerFields).lean(),
    Media.find({ playerId: share.playerId, isPublished: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean(),
    Playlist.find({ playerId: share.playerId }).sort({ displayOrder: 1 }).lean(),
  ]);
  if (!player || !placements.length) return null;

  const assets = await Asset.find({
    _id: { $in: placements.map((item) => item.assetId) },
    status: "READY",
  }).lean();
  const assetById = new Map(assets.map((asset) => [String(asset._id), asset]));
  const media = placements
    .filter((item) => assetById.has(String(item.assetId)))
    .map((item) => ({
      id: String(item._id),
      title: item.title,
      description: item.description || "",
      category: item.category,
      season: item.season || "",
      competition: item.competition || "",
      matchDate: item.matchDate || null,
      playerClub: item.playerClub || "",
      opponent: item.opponent || "",
      playlistIds: (item.playlistIds || []).map(String),
      isFeatured: Boolean(item.isFeatured),
      bunnyVideoId: assetById.get(String(item.assetId)).bunnyVideoId,
    }));
  if (!media.length) return null;

  return {
    player: {
      firstName: player.firstName,
      lastName: player.lastName,
      country: player.country,
      currentClub: player.currentClub,
      position: player.position,
      height: player.height,
      weight: player.weight,
      foot: player.foot,
      description: player.description,
      headshotUrl: player.headshotUrl,
      imageUrl: player.imageUrl || [],
      stats: player.stats,
      clubHistory: player.clubHistory,
      contractStatus: player.contractStatus,
      availableFrom: player.availableFrom,
      preferredLeagues: player.preferredLeagues || [],
    },
    media,
    playlists: playlists.map((item) => ({ id: String(item._id), title: item.title })),
    shareExpiresAt: share.expiresAt,
  };
}
