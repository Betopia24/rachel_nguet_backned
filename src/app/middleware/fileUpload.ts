import multer from "multer";
import { AppError } from "../error/AppError";

// Memory storage for fast buffering & direct proxying/upload
const storage = multer.memoryStorage();

// Allowed image formats
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// Allowed audio formats
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/x-flac",
];

// Image filter
const imageFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type (${file.mimetype}). Only JPG, PNG, and WEBP images are supported.`,
        400
      )
    );
  }
};

// Audio filter
const audioFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const mime = file.mimetype.toLowerCase();
  const ext = file.originalname.toLowerCase().split(".").pop();
  const isAudioExt = ["mp3", "wav", "m4a", "aac", "ogg", "flac", "webm"].includes(ext || "");

  if (ALLOWED_AUDIO_TYPES.includes(mime) || isAudioExt) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid audio format (${file.mimetype}). Please upload a valid audio file (MP3, WAV, M4A, AAC, FLAC, OGG, or WEBM).`,
        400
      )
    );
  }
};

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: imageFilter,
});

export const uploadAudio = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: audioFilter,
});

export const uploadAvatar = uploadImage.fields([
  { name: "file", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },
]);

