import crypto from "node:crypto";
import dbConnect from "@/lib/db";
import { Asset, Media, Player, Playlist, Publication, Share } from "@/lib/models";
import { createBunnyThumbnailUrl } from "@/lib/playback";

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

const portalProfileFields = {
  personal: ["fullName", "dateOfBirth", "placeOfBirth", "nationality", "passportValid", "passportExpiry", "currentCityCountry"],
  player: ["heightCm", "weightKg", "preferredFoot", "mainPosition", "currentJerseyNumber"],
  currentClub: ["officialName", "country", "league", "joinedDate", "registered", "contractType", "writtenContract", "contractStartDate", "contractExpiryDate", "hasContractCopy", "extensionOption", "releaseClause", "transferAgreement", "moneyOwed"],
  season: ["teamMatches", "matchdaySquad", "matchesPlayed", "starts", "substituteAppearances", "completeMatches", "totalMinutes", "goals", "assists", "yellowCards", "redCards", "cleanSheets"],
  officialStats: ["passCompletion", "tackles", "tacklesWon", "interceptions", "clearances", "blocks", "ballRecoveries", "progressivePasses", "longPasses", "longPassAccuracy", "chancesCreated", "keyPasses", "other"],
  injury: ["injury", "injuryDate", "returnToFullTraining", "medicallyClearedDate", "firstCompetitiveMatchAfter", "trainingWithoutRestrictions", "playingWithoutRestrictions", "currentTreatment", "medicalReportAvailable"],
  representative: ["nationalTeamCamps", "representedTeams"],
  overseas: ["experience"],
};
const historyFields = ["academyOrClub", "country", "joined", "left", "ageJoined", "ageLeft", "level", "position", "leagueCompetition", "appearances", "goalsAssists", "achievements", "reasonLeft", "federationRegistered"];
const trialFields = ["club", "country", "date", "duration", "outcome"];

function pickProfileFields(value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(fields
    .filter((field) => typeof value[field] === "string")
    .map((field) => [field, value[field]]));
}

function pickProfileList(value, fields) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((entry) => pickProfileFields(entry, fields));
}

function safeProfilePhoto(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["firebasestorage.googleapis.com", "storage.googleapis.com"].includes(url.hostname)
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function sanitizePortalProfile(value) {
  const profile = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const photos = profile.photos && typeof profile.photos === "object" && !Array.isArray(profile.photos) ? profile.photos : {};
  const photoList = (items, limit) => Array.isArray(items)
    ? [...new Set(items.slice(0, limit).map(safeProfilePhoto).filter(Boolean))]
    : [];
  const photo = (item) => safeProfilePhoto(item);
  const player = pickProfileFields(profile.player, portalProfileFields.player);
  player.otherPositions = Array.isArray(profile.player?.otherPositions)
    ? profile.player.otherPositions.filter((item) => typeof item === "string").slice(0, 20)
    : [];
  player.previousJerseyNumbers = Array.isArray(profile.player?.previousJerseyNumbers)
    ? profile.player.previousJerseyNumbers.filter((item) => typeof item === "string").slice(0, 20)
    : [];
  return {
    personal: pickProfileFields(profile.personal, portalProfileFields.personal),
    player,
    currentClub: pickProfileFields(profile.currentClub, portalProfileFields.currentClub),
    season: pickProfileFields(profile.season, portalProfileFields.season),
    officialStats: pickProfileFields(profile.officialStats, portalProfileFields.officialStats),
    injury: pickProfileFields(profile.injury, portalProfileFields.injury),
    footballHistory: pickProfileList(profile.footballHistory, historyFields),
    representative: pickProfileFields(profile.representative, portalProfileFields.representative),
    trials: pickProfileList(profile.trials, trialFields),
    overseas: pickProfileFields(profile.overseas, portalProfileFields.overseas),
    photos: {
      professionalHeadshot: photo(photos.professionalHeadshot),
      fullBody: photo(photos.fullBody),
      action: photoList(photos.action, 5),
      currentClubKit: photo(photos.currentClubKit),
      recentMatchesTraining: photoList(photos.recentMatchesTraining, 10),
    },
  };
}

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
  }).select("playerProfile").lean();
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
      thumbnailUrl: createBunnyThumbnailUrl(
        process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID,
        assetById.get(String(item.assetId)).bunnyVideoId,
        assetById.get(String(item.assetId)).thumbnailFileName,
      ),
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
      portalProfile: sanitizePortalProfile(publication.playerProfile),
    },
    media,
    playlists: playlists.map((item) => ({ id: String(item._id), title: item.title })),
    shareExpiresAt: share.expiresAt,
  };
}
