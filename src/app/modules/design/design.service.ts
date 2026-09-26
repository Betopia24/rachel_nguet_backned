import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { deleteFromCloudinary } from "../../utils/cloudinary";
import { deleteFromS3, uploadToS3 } from "../../utils/s3";
import { IDesignFilterOptions, IUploadDesignPayload } from "./design.interface";
import { NotificationService } from "../notification/notification.service";

/**
 * 1. Upload Diamond Design to AWS S3 & Save to Database
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

  // Upload to AWS S3
  const uploadResult = await uploadToS3(file, "designs");

  // Save to MongoDB via Prisma
  const newDesign = await prisma.design.create({
    data: {
      userId,
      title,
      imageUrl: uploadResult.url,
      publicId: uploadResult.key,
      fileSize: uploadResult.bytes || file.size,
      mimeType: file.mimetype,
      type: payload.type || "UPLOADED",
      mediaType: payload.mediaType || "IMAGE",
      prompt: payload.prompt || null,
      duration: payload.duration || null,
    },
  });

  // Trigger push & in-app notification for uploaded design
  NotificationService.sendNotification({
    userId,
    title: "✨ Design Uploaded Successfully!",
    body: `Your diamond design "${newDesign.title}" has been saved to My Designs.`,
    type: "DESIGN_CREATED",
    metadata: {
      designId: newDesign.id,
      mediaType: newDesign.mediaType,
      type: newDesign.type,
      imageUrl: newDesign.imageUrl,
    },
  }).catch((err) =>
    console.error("⚠️ [Design Upload Notification Error]:", err?.message || err)
  );

  return newDesign;
};

/**
 * 2. Get All Designs for Authenticated User
 * Supports tabs matching the UI: "All", "Generated", "Uploaded", "Video", "Music"
 * Along with pagination, search, and category counts breakdown.
 */
const getMyDesigns = async (
  userId: string,
  filters: IDesignFilterOptions
) => {
  const { tab, type, mediaType, search, page = 1, limit = 20 } = filters;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const whereCondition: any = { userId };

  // 1. Tab filter (All, Generated, Uploaded, Video, Music)
  if (tab) {
    const normalizedTab = tab.trim().toLowerCase();
    if (normalizedTab === "generated") {
      whereCondition.type = "AI_GENERATED";
    } else if (normalizedTab === "uploaded") {
      whereCondition.type = "UPLOADED";
    } else if (normalizedTab === "video") {
      whereCondition.mediaType = "VIDEO";
    } else if (normalizedTab === "music") {
      whereCondition.mediaType = { in: ["MUSIC", "AUDIO"] };
    }
  }

  // 2. Direct filters (if passed explicitly and not already set by tab)
  if (type && !whereCondition.type) {
    whereCondition.type = type;
  }
  if (mediaType && !whereCondition.mediaType) {
    whereCondition.mediaType = mediaType;
  }

  // 3. Search filter by title or prompt
  if (search && search.trim().length > 0) {
    whereCondition.OR = [
      { title: { contains: search.trim(), mode: "insensitive" } },
      { prompt: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  // 4. Run queries in parallel: paginated items, filtered count, and breakdown counts for tabs
  const [
    designs,
    filteredTotal,
    totalDesigns,
    generatedCount,
    uploadedCount,
    videoCount,
    musicCount,
  ] = await Promise.all([
    prisma.design.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.design.count({ where: whereCondition }),
    prisma.design.count({ where: { userId } }),
    prisma.design.count({ where: { userId, type: "AI_GENERATED" } }),
    prisma.design.count({ where: { userId, type: "UPLOADED" } }),
    prisma.design.count({ where: { userId, mediaType: "VIDEO" } }),
    prisma.design.count({
      where: { userId, mediaType: { in: ["MUSIC", "AUDIO"] } },
    }),
  ]);

  return {
    meta: {
      total: filteredTotal,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filteredTotal / take),
    },
    stats: {
      totalDesigns,
      counts: {
        all: totalDesigns,
        generated: generatedCount,
        uploaded: uploadedCount,
        video: videoCount,
        music: musicCount,
      },
    },
    data: designs,
  };
};

/**
 * 3. Get Recent Designs for Home Screen
 */
const getRecentDesigns = async (userId: string, limit = 5, mediaType?: any) => {
  const whereCondition: any = { userId };
  if (mediaType) {
    whereCondition.mediaType = mediaType;
  }

  const recentDesigns = await prisma.design.findMany({
    where: whereCondition,
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

  // Delete from S3 or Cloudinary if stored there
  if (design.publicId) {
    if (design.imageUrl?.includes("amazonaws.com") || design.publicId.startsWith("designs/")) {
      await deleteFromS3(design.publicId);
    } else {
      await deleteFromCloudinary(design.publicId);
    }
  }

  // Delete from database
  await prisma.design.delete({
    where: { id: designId },
  });

  return { message: "Design deleted successfully." };
};

/**
 * 6. Update Design (e.g. rename title)
 */
const updateDesign = async (
  userId: string,
  designId: string,
  payload: { title?: string }
) => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
  });

  if (!design) {
    throw new AppError("Design not found.", 404);
  }

  if (design.userId !== userId) {
    throw new AppError("You do not have permission to update this design.", 403);
  }

  const updated = await prisma.design.update({
    where: { id: designId },
    data: {
      ...(payload.title ? { title: payload.title.trim() } : {}),
    },
  });

  return updated;
};

export const DesignService = {
  uploadDesign,
  getMyDesigns,
  getRecentDesigns,
  getDesignById,
  updateDesign,
  deleteDesign,
};

