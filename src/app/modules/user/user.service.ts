import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { uploadToS3 } from "../../utils/s3";
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

export const UserService = {
  getMe,
  updateMe,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateFcmToken,
};

