import bcrypt from "bcrypt";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { deleteFromCloudinary } from "../../utils/cloudinary";
import { deleteFromS3, uploadToS3 } from "../../utils/s3";
import { IUpdateProfile, IUpdateUserStatus } from "./user.interface";

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  authProvider: true,
  role: true,
  status: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const updateMe = async (
  userId: string,
  payload: IUpdateProfile,
  file?: Express.Multer.File
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  let avatarUrl = payload.avatar;

  // If a file was uploaded in form-data, upload it to AWS S3 'avatars' folder
  if (file) {
    const uploadResult = await uploadToS3(file, "avatars");
    avatarUrl = uploadResult.url;
  }

  const updateData: any = {};
  if (payload.name !== undefined && typeof payload.name === "string" && payload.name.trim() !== "") {
    updateData.name = payload.name.trim();
  }
  if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== "") {
    updateData.avatar = avatarUrl;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: userSelect,
  });

  return updatedUser;
};

const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: userSelect,
  });

  return users;
};

const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

const updateUserStatus = async (
  userId: string,
  payload: IUpdateUserStatus
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: userSelect,
  });

  return updatedUser;
};

const updateFcmToken = async (userId: string, fcmToken: string) => {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { fcmToken: fcmToken ? fcmToken.trim() : null },
    select: { id: true, email: true, fcmToken: true },
  });

  return {
    fcmToken: updated.fcmToken,
    message: fcmToken ? "FCM token updated successfully." : "FCM token removed successfully.",
  };
};

/**
 * Internal helper to completely remove a user and all related data (designs, notifications, subscriptions, S3/Cloudinary media)
 */
const deleteUserInternal = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // 1. Fetch user designs to clean up media from Cloudinary / S3
  const designs = await prisma.design.findMany({
    where: { userId },
    select: { id: true, publicId: true, imageUrl: true },
  });

  for (const design of designs) {
    if (design.publicId) {
      try {
        if (
          design.imageUrl?.includes("amazonaws.com") ||
          design.publicId.startsWith("designs/")
        ) {
          await deleteFromS3(design.publicId);
        } else {
          await deleteFromCloudinary(design.publicId);
        }
      } catch (err) {
        console.error(`Failed to delete media for design ${design.id}:`, err);
      }
    }
  }

  // 2. Clean up user's avatar from S3 if present
  if (
    user.avatar &&
    user.avatar.includes("amazonaws.com") &&
    user.avatar.includes("avatars/")
  ) {
    try {
      const key = user.avatar.split(".amazonaws.com/")[1];
      if (key) {
        await deleteFromS3(key);
      }
    } catch (err) {
      console.error("Failed to delete user avatar from S3:", err);
    }
  }

  // 3. Remove all associated data in database
  await prisma.$transaction([
    prisma.design.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.subscription.deleteMany({ where: { userId } }),
    prisma.otp.deleteMany({ where: { email: user.email } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return { message: "Account deleted successfully." };
};

const deleteMyAccount = async (userId: string, password?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // If password was provided and user has a password set (email authentication)
  if (password && user.password) {
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Incorrect password. Please verify and try again.", 400);
    }
  }

  return await deleteUserInternal(userId);
};

const deleteUserByAdmin = async (userId: string) => {
  return await deleteUserInternal(userId);
};

export const UserService = {
  getMe,
  updateMe,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateFcmToken,
  deleteMyAccount,
  deleteUserByAdmin,
};

