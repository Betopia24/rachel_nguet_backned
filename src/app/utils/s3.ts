import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import config from "../../config";
import { AppError } from "../error/AppError";

// Configure Multer Storage (Memory storage for direct stream/buffer upload)
const storage = multer.memoryStorage();

// File filter: JPG, PNG, WEBP only (as specified in app UI)
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file format. Only JPG, PNG, and WEBP images are supported.",
        400
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max size
  },
  fileFilter,
});

// Initialize AWS S3 Client
export const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.access_key_id,
    secretAccessKey: config.aws.secret_access_key,
  },
});

export interface IS3UploadResult {
  url: string;
  key: string;
  bucket: string;
  bytes: number;
}

/**
 * Upload file buffer directly to AWS S3
 */
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder = "designs"
): Promise<IS3UploadResult> => {
  if (!config.aws.access_key_id || !config.aws.secret_access_key) {
    throw new AppError("AWS credentials are not configured in environment.", 500);
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const cleanOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${uniqueSuffix}-${cleanOriginalName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: config.aws.bucket_name,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const publicUrl = `https://${config.aws.bucket_name}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return {
      url: publicUrl,
      key,
      bucket: config.aws.bucket_name,
      bytes: file.size,
    };
  } catch (error: any) {
    console.error("❌ [AWS S3]: Upload failed:", error);
    throw new AppError(`S3 Upload failed: ${error.message || "Unknown error"}`, 500);
  }
};

/**
 * Delete an object from AWS S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  if (!key) return;

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.bucket_name,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`🗑️ [AWS S3]: Deleted file with key: ${key}`);
  } catch (error: any) {
    console.error(`❌ [AWS S3]: Delete error for ${key}:`, error);
  }
};

/**
 * Generate a pre-signed URL for temporary download/view access
 */
export const getS3PresignedUrl = async (
  key: string,
  expiresInSeconds = 3600
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: config.aws.bucket_name,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error: any) {
    console.error(`❌ [AWS S3]: Presigned URL generation failed:`, error);
    throw new AppError("Failed to generate signed S3 URL", 500);
  }
};
