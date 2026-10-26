"use server";

import dbConnect from "@/lib/mongodb";
import { Post, Player, HomepageHero } from "@/lib/schemas";

const PUBLIC_PLAYER_CARD_FIELDS = [
  "firstName",
  "lastName",
  "position",
  "country",
  "dob",
  "currentClub",
  "headshotUrl",
  "imageUrl",
  "featured",
  "playerOfTheWeek",
  "contractStatus",
  "foot",
].join(" ");

const PUBLIC_PLAYER_PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "position",
  "country",
  "currentClub",
  "headshotUrl",
  "imageUrl",
  "videoPrimary",
  "videoAdditional",
  "featured",
  "playerOfTheWeek",
  "contractStatus",
  "foot",
].join(" ");

const calculateAge = (dateOfBirth, now = new Date()) => {
  if (typeof dateOfBirth !== "string" || !dateOfBirth.trim()) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime()) || birthDate > now) return null;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (
    now.getUTCMonth() < birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
};

// 🔧 Helper: normalize MongoDB docs to plain serializable objects
const normalize = (doc) => {
  if (!doc) return null;
  
  // Helper to recursively convert ObjectIds to strings
  const convertObjectIds = (obj) => {
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertObjectIds(item));
    }
    
    // Handle Map objects (convert to plain object)
    if (obj instanceof Map) {
      const plainObj = {};
      obj.forEach((value, key) => {
        plainObj[key] = convertObjectIds(value);
      });
      return plainObj;
    }
    
    if (typeof obj === 'object') {
      // Check if it's an ObjectId
      if (obj.constructor && obj.constructor.name === 'ObjectId') {
        return obj.toString();
      }
      
      const converted = {};
      for (const key in obj) {
        if (key === '_id' && obj[key]) {
          // Convert _id to string
          converted[key] = obj[key].toString();
        } else if (obj[key] && typeof obj[key] === 'object' && obj[key].constructor && obj[key].constructor.name === 'ObjectId') {
          // Convert any ObjectId to string
          converted[key] = obj[key].toString();
        } else if (typeof obj[key] === 'object') {
          // Recursively convert nested objects
          converted[key] = convertObjectIds(obj[key]);
        } else {
          converted[key] = obj[key];
        }
      }
      return converted;
    }
    
    return obj;
  };

  const converted = convertObjectIds(doc);
  
  return {
    ...converted,
    id: doc._id?.toString(),
    _id: undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
};

// POSTS
export async function getAllPosts() {
  await dbConnect();
  try {
    const posts = await Post.find({ status: "Published" }).lean().sort({ createdAt: -1 });
    return posts.map(normalize);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

export async function getFeaturedPosts() {
  await dbConnect();
  try {
    const posts = await Post.find({ featured: true, status: "Published" }).lean().sort({ createdAt: -1 });
    return posts.map(normalize);
  } catch (error) {
    console.error("Error fetching featured posts:", error);
    return [];
  }
}

export async function getPostById(id) {
  await dbConnect();
  try {
    const post = await Post.findOne({ _id: id, status: "Published" }).lean();
    return post ? normalize(post) : null;
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    return null;
  }
}

// PLAYERS
export async function getAllPlayers() {
  await dbConnect();
  try {
    const players = await Player.find({})
      .select(PUBLIC_PLAYER_CARD_FIELDS)
      .lean()
      .sort({ createdAt: -1 });
    return players.map((player) => {
      const { dob, ...publicPlayer } = normalize(player);
      return { ...publicPlayer, age: calculateAge(dob) };
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    return [];
  }
}

export async function getFeaturedPlayers() {
  await dbConnect();
  try {
    const players = await Player.find({ featured: true })
      .select(PUBLIC_PLAYER_CARD_FIELDS.replace(" dob", ""))
      .lean()
      .sort({ createdAt: -1 });
    return players.map(normalize);
  } catch (error) {
    console.error("Error fetching featured players:", error);
    return [];
  }
}

export async function getHomepageHeroConfig() {
  await dbConnect();
  try {
    const config = await HomepageHero.findOne({ key: "home" }).lean();
    if (!config) return null;

    const player = await Player.findById(config.playerId)
      .select("firstName lastName position country")
      .lean();
    if (!player) return null;

    return {
      playerId: String(player._id),
      imageUrl: config.imageUrl,
      player: {
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        country: player.country,
      },
    };
  } catch (error) {
    console.error("Error fetching homepage hero configuration:", error);
    return null;
  }
}

export async function getPlayerById(id) {
  await dbConnect();
  try {
    const player = await Player.findById(id).select(PUBLIC_PLAYER_PROFILE_FIELDS).lean();
    return player ? normalize(player) : null;
  } catch (error) {
    console.error("Error fetching player by ID:", error);
    return null;
  }
}

// PRODUCTS
export async function getAllProducts() {
  return [];
}

export async function getProductById(id) {
  return null;
}
