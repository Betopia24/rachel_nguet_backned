import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";
import fs from "fs";
import config from "../../config";
import { AppError } from "../error/AppError";

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

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
    fileSize: 10 * 1024 * 1024, // 10MB max size (matching UI requirement)
  },
  fileFilter,
});

interface ICloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
}

/**
 * Upload an image buffer to Cloudinary (with local fallback if Cloudinary not configured)
 */
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder = "diamond_pay/designs"
): Promise<ICloudinaryUploadResult> => {
  // If Cloudinary credentials are provided, upload to Cloudinary
  if (
    config.cloudinary.cloud_name &&
    config.cloudinary.api_key &&
    config.cloudinary.api_secret
  ) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            console.error("❌ [Cloudinary]: Upload failed:", error);
            return reject(
              new AppError(
                "Image upload to Cloudinary failed. Please try again.",
                500
              )
            );
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(file.buffer);
    });
  } else {
    // Fallback mode: If Cloudinary keys not set yet, store locally in /uploads
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".png";
    const filename = `design-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const localUrl = `http://localhost:${config.port}/uploads/${filename}`;
    console.log(`⚠️ [Upload Fallback]: Saved to local uploads (${localUrl})`);

    return {
      secure_url: localUrl,
      public_id: `local_${filename}`,
      format: ext.replace(".", ""),
      bytes: file.size,
    };
  }
};

/**
 * Delete an image from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (!publicId || publicId.startsWith("local_")) return;

  try {
    if (
      config.cloudinary.cloud_name &&
      config.cloudinary.api_key &&
      config.cloudinary.api_secret
    ) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ [Cloudinary]: Deleted image ${publicId}`);
    }
  } catch (error) {
    console.error(`❌ [Cloudinary]: Delete error for ${publicId}:`, error);
  }
};
