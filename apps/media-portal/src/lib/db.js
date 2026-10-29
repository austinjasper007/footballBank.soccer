import mongoose from "mongoose";

const cached = global.mediaPortalMongoose || (global.mediaPortalMongoose = { conn: null, promise: null });
export default async function dbConnect() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is required for the media portal.");
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(uri);
  cached.conn = await cached.promise;
  return cached.conn;
}
