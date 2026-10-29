import mongoose from "mongoose";
const model = (name, schema, collection) => mongoose.models[name] || mongoose.model(name, schema, collection);
const id = mongoose.Schema.Types.ObjectId;
export const Player = model("PortalPlayer", new mongoose.Schema({ firstName: String, lastName: String, country: String, currentClub: String, position: String, height: String, weight: String, foot: String, description: String, headshotUrl: String, imageUrl: [String], stats: mongoose.Schema.Types.Mixed, clubHistory: mongoose.Schema.Types.Mixed, contractStatus: String, availableFrom: String, preferredLeagues: [String] }, { strict: false }), "players");
export const Publication = model("PortalPublication", new mongoose.Schema({
  playerId: id,
  isPublished: Boolean,
  featuredMediaId: id,
  playerProfile: mongoose.Schema.Types.Mixed,
}, { strict: false }), "mediapublications");
export const Share = model("PortalShare", new mongoose.Schema({ tokenHash: String, playerId: id, expiresAt: Date, status: String, firstOpenedAt: Date, lastOpenedAt: Date }, { strict: false }), "mediashares");
export const Media = model("PortalMedia", new mongoose.Schema({ playerId: id, assetId: id, category: String, title: String, description: String, season: String, competition: String, matchDate: Date, playerClub: String, opponent: String, playlistIds: [id], isPublished: Boolean, isFeatured: Boolean, displayOrder: Number }, { strict: false }), "playermedias");
export const Asset = model("PortalAsset", new mongoose.Schema({ bunnyVideoId: String, status: String, thumbnailFileName: String }, { strict: false }), "mediaassets");
export const Playlist = model("PortalPlaylist", new mongoose.Schema({ playerId: id, title: String, displayOrder: Number }, { strict: false }), "mediaplaylists");
