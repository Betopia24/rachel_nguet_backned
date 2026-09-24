import { Router } from "express";
import { auth } from "../../middleware/auth";
import { uploadAudio, uploadImage } from "../../middleware/fileUpload";
import { validateRequest } from "../../middleware/validateRequest";
import { AIController } from "./ai.controller";
import { AIValidation } from "./ai.validation";

const router = Router();

// 1. Health status of AI service and models (Gemini, Veo, ElevenLabs, S3)
router.get(
  "/health",
  AIController.getHealthStatus
);

// 2. Generate diamond image from prompt (Gemini 3 Pro)
router.post(
  "/generate-image",
  auth("user", "admin"),
  validateRequest(AIValidation.generateImageValidationSchema),
  AIController.generateImage
);

// 3. Generate diamond motion video from text prompt (Veo)
router.post(
  "/text-to-video",
  auth("user", "admin"),
  validateRequest(AIValidation.textToVideoValidationSchema),
  AIController.textToVideo
);

// 4. Generate diamond motion video from uploaded image & prompt (Veo)
router.post(
  "/image-to-video",
  auth("user", "admin"),
  uploadImage.single("image"),
  validateRequest(AIValidation.imageToVideoValidationSchema),
  AIController.imageToVideo
);

// 5. Generate AI music from prompt or lyrics (ElevenLabs + OpenAI)
router.post(
  "/text-to-music",
  auth("user", "admin"),
  validateRequest(AIValidation.textToMusicValidationSchema),
  AIController.textToMusic
);

// 6. Clean and enhance uploaded audio / voice recording (ElevenLabs)
router.post(
  "/enhance-audio",
  auth("user", "admin"),
  uploadAudio.single("audio"),
  validateRequest(AIValidation.enhanceAudioValidationSchema),
  AIController.enhanceAudio
);

// 7. Save AI creation directly to "My Designs"
router.post(
  "/save-creation",
  auth("user", "admin"),
  validateRequest(AIValidation.saveCreationValidationSchema),
  AIController.saveCreation
);

export const aiRoutes = router;
