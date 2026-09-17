import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { deleteFromCloudinary, uploadToCloudinary } from "../../utils/cloudinary";
import { IDesignFilterOptions, IUploadDesignPayload } from "./design.interface";

/**
 * 1. Upload Diamond Design to Cloudinary & Save to Database
 */
const uploadDesign = async (
  userId: string,
  file: Express.Multer.File,
  payload: IUploadDesignPayload
) => {
  if (!file) {
    throw new AppError("Please select a diamond image file to upload.", 400);
  }

  // Set title to clean file name without extension if not custom provided
  const rawFileName = file.originalname || "Diamond Design";
  const cleanFileName = rawFileName.substring(0, rawFileName.lastIndexOf(".")) || rawFileName;
  const title = payload.title?.trim() || cleanFileName;

  // Upload to Cloudinary (or local fallback)
  const uploadResult = await uploadToCloudinary(file, "diamond_pay/designs");

  // Save to MongoDB via Prisma
  const newDesign = await prisma.design.create({
    data: {
      userId,
      title,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileSize: uploadResult.bytes || file.size,
      mimeType: file.mimetype,
      type: payload.type || "UPLOADED",
      prompt: payload.prompt || null,
    },
  });

  return newDesign;
};

/**
 * 2. Get All Designs for Authenticated User
 */
const getMyDesigns = async (
  userId: string,
  filters: IDesignFilterOptions
) => {
  const { type, page = 1, limit = 20 } = filters;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const whereCondition: any = { userId };
  if (type) {
    whereCondition.type = type;
  }

  const [designs, total] = await Promise.all([
    prisma.design.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.design.count({ where: whereCondition }),
  ]);

  return {
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
    },
    data: designs,
  };
};

/**
 * 3. Get Recent Designs for Home Screen
 */
const getRecentDesigns = async (userId: string, limit = 5) => {
  const recentDesigns = await prisma.design.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Number(limit),
  });

  return recentDesigns;
};

/**
 * 4. Get Single Design by ID
 */
const getDesignById = async (userId: string, designId: string) => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
  });

  if (!design) {
    throw new AppError("Design not found.", 404);
  }

  if (design.userId !== userId) {
    throw new AppError("You do not have permission to view this design.", 403);
  }

  return design;
};

/**
 * 5. Delete Design (From Cloudinary & Database)
 */
const deleteDesign = async (userId: string, userRole: string, designId: string) => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
  });

  if (!design) {
    throw new AppError("Design not found.", 404);
  }

  if (design.userId !== userId && userRole !== "admin") {
    throw new AppError("You do not have permission to delete this design.", 403);
  }

  // Delete from Cloudinary if stored there
  if (design.publicId) {
    await deleteFromCloudinary(design.publicId);
  }

  // Delete from database
  await prisma.design.delete({
    where: { id: designId },
  });

  return { message: "Design deleted successfully." };
};

export const DesignService = {
  uploadDesign,
  getMyDesigns,
  getRecentDesigns,
  getDesignById,
  deleteDesign,
};
