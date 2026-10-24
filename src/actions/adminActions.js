"use server";

import { User, Post, Player, Message, Submission, Agent, HomepageHero } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { sendPlayerSubmissionDecisionEmail, sendWelcomeEmail } from "@/lib/email";
import { deletePlayerMedia } from "@/lib/firebaseStorageCleanup";
import { requireRole } from "@/lib/oauth";

// 🔧 Helper: safely convert any Mongoose doc(s) to plain JSON and convert _id to id
const toPlain = (data) => {
  const json = JSON.parse(JSON.stringify(data));
  
  // Handle arrays
  if (Array.isArray(json)) {
    return json.map(item => {
      if (item._id) {
        const { _id, ...rest } = item;
        return { id: _id, ...rest };
      }
      return item;
    });
  }
  
  // Handle single objects
  if (json && json._id) {
    const { _id, ...rest } = json;
    return { id: _id, ...rest };
  }
  
  return json;
};

// USERS
export const getAllUsers = async () => {
  await dbConnect();
  try {
    const users = await User.find({}).lean().sort({ createdAt: -1 });
    // console.log("Raw users from DB:", users.slice(0, 1)); // Log first user to see structure
    const convertedUsers = toPlain(users);
    // console.log("Converted users:", convertedUsers.slice(0, 1)); // Log first user after conversion
    return convertedUsers;
  } catch (err) {
    console.error("Error fetching users:", err);
    return [];
  }
};

export const getUserById = async (id) => {
  await dbConnect();
  try {
    const user = await User.findById(id).lean();
    return toPlain(user);
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    return null;
  }
};

export async function createUser(data) {
  await dbConnect();
  try {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) throw new Error("User with this email already exists");

    const { password: _password, ...passwordlessData } = data;
    const createdUser = await User.create({ ...passwordlessData, isVerified: false });
    try {
      await sendWelcomeEmail({ to: createdUser.email, firstName: createdUser.firstName });
    } catch (welcomeError) {
      console.error("Admin-created user welcome email failed:", welcomeError);
    }
    return toPlain(createdUser);
  } catch (err) {
    console.error("Error creating user:", err);
    return err;
  }
}

export async function updateUser(userId, data) {
  await dbConnect();
  try {
    const { id, createdAt, updatedAt, password: _password, ...updateData } = data;

    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId },
      });
      if (existingUser) throw new Error("User with this email already exists");
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    revalidatePath("/admin/users");
    return toPlain(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    return err;
  }
}

export async function deleteUser(id) {
  await dbConnect();
  try {
    // console.log("Delete user - ID received:", id, "Type:", typeof id);
    
    // Convert string ID to ObjectId if needed
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      console.error("Invalid ObjectId:", id);
      throw new Error("Invalid user ID");
    }
    
    // console.log("Converted ObjectId:", objectId);
    
    // First, let's check if the user exists
    const userExists = await User.findById(objectId);
    // console.log("User exists check:", userExists);
    
    const result = await User.findByIdAndDelete(objectId);
    // console.log("Delete result:", result);
    
    if (!result) {
      throw new Error("User not found");
    }
    
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error("Error deleting user:", err);
    throw err;
  }
}

// SUBSCRIPTIONS
export async function getAllSubscriptions() {
  return [];
}

export async function getSubscriptionById(id) {
  return null;
}

export async function updateSubscription(id, data) {
  return { success: false, error: "Subscriptions are disabled" };
}

// PRODUCTS
export async function getAllProducts() {
  return [];
}

export async function createProduct(data) {
  return { success: false, error: "Product creation is disabled" };
}

export async function updateProduct(productId, data) {
  return { success: false, error: "Product updates are disabled" };
}

export async function deleteProduct(id) {
  return { success: false, error: "Product deletion is disabled" };
}

// PLAYERS
export async function getAllPlayers() {
  await dbConnect();
  try {
    const players = await Player.find({}).lean().sort({ createdAt: -1 });
    return toPlain(players);
  } catch (err) {
    console.error("Error fetching players:", err);
    return [];
  }
}

export async function createPlayer(data) {
  await dbConnect();
  try {
    const normalizedEmail = data.email?.trim().toLowerCase();
    if (!normalizedEmail) throw new Error("Email is required");

    const [existingPlayer, pendingSubmission] = await Promise.all([
      Player.findOne({ email: normalizedEmail }).select("_id").lean(),
      Submission.findOne({
        email: normalizedEmail,
        $or: [{ status: "PENDING" }, { status: { $exists: false } }],
      }).select("_id").lean(),
    ]);
    if (existingPlayer) throw new Error("Player with this email already exists");
    if (pendingSubmission) throw new Error("A player submission with this email is currently under review");

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        phoneCountryCode: data.phoneCountryCode,
        address: {
          country: data.country,
          countryCode: data.countryCode,
        },
        role: "player",
        isVerified: false,
        subscribed: false,
      });
      try {
        await sendWelcomeEmail({ to: user.email, firstName: user.firstName });
      } catch (welcomeError) {
        console.error("Admin-created player welcome email failed:", welcomeError);
      }
    } else {
      user.firstName = data.firstName;
      user.lastName = data.lastName;
      user.phone = data.phone || user.phone;
      user.phoneCountryCode = data.phoneCountryCode || user.phoneCountryCode;
      user.address = {
        ...(user.address || {}),
        country: data.country || user.address?.country,
        countryCode: data.countryCode || user.address?.countryCode,
      };
      user.role = "player";
      user.updatedAt = new Date();
      await user.save();
    }

    const player = await Player.create({ ...data, email: normalizedEmail, userId: user._id });
    return toPlain(player);
  } catch (err) {
    console.error("Error creating player:", err);
    throw err;
  }
}

export async function updatePlayer(playerId, data) {
  await dbConnect();
  try {
    const { id, createdAt, updatedAt, ...updateData } = data;
    const updatedPlayer = await Player.findByIdAndUpdate(playerId, updateData, { new: true });
    return toPlain(updatedPlayer);
  } catch (err) {
    console.error("Error updating player:", err);
    return err;
  }
}

export async function deletePlayer(id) {
  await dbConnect();
  try {
    const player = await Player.findById(id).select("email").lean();

    if (!player) {
      throw new Error("Player not found");
    }

    await deletePlayerMedia(player.email);
    await Player.findByIdAndDelete(id);
    revalidatePath("/admin/players");
    return { success: true };
  } catch (err) {
    console.error("Error deleting player:", err);
    throw err;
  }
}

// POSTS
export async function getAllPosts() {
  await requireRole("editor");
  await dbConnect();
  try {
    const posts = await Post.find({}).lean().sort({ createdAt: -1 });
    return toPlain(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    return [];
  }
}

export async function createPost(data) {
  await dbConnect();
  try {
    const post = await Post.create({
      ...data,
      status: ["Draft", "Published", "Archived"].includes(data.status) ? data.status : "Draft",
    });
    return toPlain(post);
  } catch (err) {
    console.error("Error creating post:", err);
    return err;
  }
}

export async function updatePost(postId, data) {
  await dbConnect();
  try {
    const { id, createdAt, updatedAt, ...updateData } = data;
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        ...updateData,
        status: ["Draft", "Published", "Archived"].includes(updateData.status)
          ? updateData.status
          : "Draft",
      },
      { new: true, runValidators: true },
    );
    return toPlain(updatedPost);
  } catch (err) {
    console.error("Error updating post:", err);
    return err;
  }
}

export async function deletePost(id) {
  await dbConnect();
  try {
    await Post.findByIdAndDelete(id);
    revalidatePath("/admin/blog");
    revalidatePath("/editor/posts");
    return { success: true };
  } catch (err) {
    console.error("Error deleting post:", err);
    throw err;
  }
}

// SUBMISSIONS
export async function getAllSubmissions() {
  await dbConnect();
  try {
    const submissions = await Submission.find({}).lean().sort({ submittedAt: -1 });
    // Ensure all submissions have a status (default to PENDING for existing submissions without status)
    const submissionsWithStatus = submissions.map(sub => ({
      ...sub,
      status: sub.status || 'PENDING'
    }));
    return toPlain(submissionsWithStatus);
  } catch (err) {
    console.error("Error fetching submissions:", err);
    return [];
  }
}

export async function getSubmissionsById(id) {
  await dbConnect();
  try {
    const submission = await Submission.findById(id).lean();
    return toPlain(submission);
  } catch (err) {
    console.error("Error fetching submission by ID:", err);
    return null;
  }
}

export async function approveSubmission(submissionId) {
  await dbConnect();
  try {
    const approvedSubmission = await Submission.findByIdAndUpdate(
      submissionId,
      { status: "APPROVED" },
      { new: true }
    );

    if (!approvedSubmission) throw new Error("Submission not found");

    const {
      _id,
      submittedAt,
      status,
      rejectionReason,
      userId,
      ...submissionData
    } = approvedSubmission.toObject();

    // Create player from approved submission
    const player = await Player.create({
      ...submissionData,
      userId,
    });
    if (userId) {
      await User.findByIdAndUpdate(userId, { role: "player", updatedAt: new Date() });
    }
    try {
      await sendPlayerSubmissionDecisionEmail({
        to: submissionData.email,
        firstName: submissionData.firstName,
        playerName: `${submissionData.firstName} ${submissionData.lastName}`,
        approved: true,
      });
    } catch (notificationError) {
      console.error("Player approval email failed:", notificationError);
    }
    
    revalidatePath("/admin/submissions");
    return toPlain(approvedSubmission);
  } catch (err) {
    console.error("Error approving submission:", err);
    throw err;
  }
}

export async function rejectSubmission(id, reason) {
  await dbConnect();
  try {
    const rejected = await Submission.findByIdAndUpdate(
      id,
      { status: "REJECTED", rejectionReason: reason },
      { new: true }
    );
    if (rejected?.email) {
      try {
        await sendPlayerSubmissionDecisionEmail({
          to: rejected.email,
          firstName: rejected.firstName,
          playerName: `${rejected.firstName} ${rejected.lastName}`,
          approved: false,
          reason,
        });
      } catch (notificationError) {
        console.error("Player rejection email failed:", notificationError);
      }
    }
    revalidatePath("/admin/submissions");
    return toPlain(rejected);
  } catch (err) {
    console.error("Error rejecting submission:", err);
    throw err;
  }
}

export async function deleteSubmission(id) {
  await dbConnect();
  try {
    const deleted = await Submission.findByIdAndDelete(id);
    revalidatePath("/admin/submissions");
    return toPlain(deleted);
  } catch (err) {
    console.error("Error deleting submission:", err);
    throw err;
  }
}
// Agent Management Functions
export async function getAgentInfo() {
  await dbConnect();
  try {
    let agent = await Agent.findOne();
    if (!agent) {
      // Create default agent if none exists
      agent = await Agent.create({
        name: "Ayodeji Michael .F",
        title: "United States Based Agent",
        profilePhoto: "/FootballBank_agent.jpg",
        bio: "Experienced football agent with a proven track record of helping players achieve their professional goals.",
        credentials: "Licenced Agent",
        location: "United States"
      });
    }
    return toPlain(agent);
  } catch (err) {
    console.error("Error getting agent info:", err);
    return err;
  }
}

export async function updateAgentInfo(formData) {
  await dbConnect();
  try {
    const { name, bio, credentials, location, profilePhoto } = Object.fromEntries(formData);
    
    let agent = await Agent.findOne();
    if (!agent) {
      agent = await Agent.create({
        name: name || "Ayodeji Michael .F",
        profilePhoto: profilePhoto || "/FootballBank_agent.jpg",
        bio: bio || "Experienced football agent with a proven track record of helping players achieve their professional goals.",
        credentials: credentials || "Licenced Agent",
        location: location || "United States"
      });
    } else {
      agent.name = name || agent.name;
      agent.bio = bio || agent.bio;
      agent.credentials = credentials || agent.credentials;
      agent.location = location || agent.location;
      if (profilePhoto) {
        agent.profilePhoto = profilePhoto;
      }
      agent.updatedAt = new Date();
      await agent.save();
    }
    
    revalidatePath('/agent');
    return toPlain(agent);
  } catch (err) {
    console.error("Error updating agent info:", err);
    return err;
  }
}

export async function saveHomepageHeroSettings({ playerId, imageUrl }) {
  await requireRole("admin");

  if (!mongoose.isValidObjectId(playerId)) {
    throw new Error("Select a valid player for the homepage hero");
  }
  if (
    typeof imageUrl !== "string" ||
    !/^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(imageUrl)
  ) {
    throw new Error("Upload a valid hero image before saving");
  }

  await dbConnect();
  const [player, existing] = await Promise.all([
    Player.findById(playerId).select("_id").lean(),
    HomepageHero.findOne({ key: "home" }).select("imageUrl").lean(),
  ]);
  if (!player) throw new Error("Selected player was not found");

  const saved = await HomepageHero.findOneAndUpdate(
    { key: "home" },
    {
      $set: { playerId: player._id, imageUrl, updatedAt: new Date() },
      $setOnInsert: { key: "home" },
    },
    { new: true, upsert: true, runValidators: true },
  );

  revalidatePath("/en");
  revalidatePath("/es");
  return {
    playerId: String(saved.playerId),
    imageUrl: saved.imageUrl,
    previousImageUrl: existing?.imageUrl || "",
  };
}

export async function getHomepageHeroPlayers() {
  await requireRole("admin");
  await dbConnect();
  try {
    const players = await Player.find({})
      .select("firstName lastName position dob")
      .lean()
      .sort({ lastName: 1, firstName: 1 });
    return players.map((player) => ({
      id: String(player._id),
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      dob: player.dob,
    }));
  } catch (error) {
    console.error("Error fetching players for homepage hero:", error);
    return [];
  }
}
