import { randomUUID } from "crypto";
import config from "../../../config";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import {
  IEnhanceAudioPayload,
  IEnhanceAudioResponse,
  IGenerateImagePayload,
  IGenerateImageResponse,
  IGenerateVideoResponse,
  IImageToVideoPayload,
  ISaveCreationPayload,
  ITextToMusicPayload,
  ITextToVideoPayload,
} from "./ai.interface";
import { NotificationService } from "../notification/notification.service";
import { serializeDesign } from "../design/design.serializer";

/** Stable error code the app can switch on, derived from the upstream HTTP status. */
const aiErrorCodeForStatus = (status: number): string => {
  if (status === 429) return "AI_QUOTA_EXCEEDED";
  if (status === 504) return "AI_TIMEOUT";
  if (status === 503) return "AI_UNAVAILABLE";
  if (status >= 500) return "AI_PROVIDER_ERROR";
  if (status === 400) return "AI_BAD_REQUEST";
  return "AI_REQUEST_FAILED";
};

/**
 * Universal helper for making HTTP requests to FastAPI AI Microservice
 * with timeout handling, detailed error parsing, and type safety.
 */
const callAIService = async <T>(
  endpoint: string,
  options: {
    method: "GET" | "POST";
    body?: any;
    isFormData?: boolean;
    timeoutMs?: number;
  }
): Promise<T> => {
  const baseUrl = config.ai.service_url.replace(/\/+$/, "");
  const targetUrl = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const timeoutMs = options.timeoutMs || config.ai.timeout_ms || 180000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {};
    let bodyPayload = options.body;

    if (!options.isFormData && options.body) {
      headers["Content-Type"] = "application/json";
      bodyPayload = JSON.stringify(options.body);
    }

    const response = await fetch(targetUrl, {
      method: options.method,
      headers,
      body: bodyPayload,
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Parse response
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const rawData: any = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      console.error(`❌ [AI Microservice Error] [${response.status}] ${targetUrl}:`, rawData);

      let errorMessage = "AI microservice failed to process request.";
      let providerCode: string | undefined;
      let details: unknown;

      if (isJson && rawData) {
        const detail = rawData.detail;
        if (Array.isArray(detail)) {
          // FastAPI validation errors
          errorMessage = detail.map((item: any) => item.msg || JSON.stringify(item)).join("; ");
        } else if (typeof detail === "string") {
          errorMessage = detail;
        } else if (detail && typeof detail === "object") {
          // Structured error from the AI service: { code, message, failures }
          errorMessage = detail.message || JSON.stringify(detail);
          providerCode = typeof detail.code === "string" ? detail.code : undefined;
          details = detail.failures;
        } else if (rawData.message) {
          errorMessage = rawData.message;
        } else {
          errorMessage = JSON.stringify(rawData);
        }
      } else if ([502, 503, 504].includes(response.status)) {
        // HTML error page from a gateway/proxy (nginx etc.) — don't leak it to the app
        errorMessage =
          "The AI service is temporarily unavailable or took too long to respond. Please try again.";
      } else if (typeof rawData === "string" && rawData.length > 0) {
        errorMessage = rawData.slice(0, 300);
      }

      const statusCode = response.status === 422 ? 400 : response.status;
      throw new AppError(
        `AI Service Error: ${errorMessage}`,
        statusCode,
        providerCode ? `AI_${providerCode}` : aiErrorCodeForStatus(statusCode),
        details
      );
    }

    return rawData as T;
  } catch (error: any) {
    clearTimeout(timer);

    if (error instanceof AppError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new AppError(
        `AI request timed out after ${Math.round(timeoutMs / 1000)} seconds. High-load operations like video or music rendering may take longer. Please try again.`,
        504,
        "AI_TIMEOUT"
      );
    }

    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      throw new AppError(
        "The AI service is currently offline. Please try again in a few minutes.",
        503,
        "AI_UNAVAILABLE"
      );
    }

    throw new AppError(
      `AI service communication failure: ${error.message || "Unknown error"}`,
      502,
      "AI_COMMUNICATION_FAILED"
    );
  }
};

/**
 * Helper to dispatch push & in-app notification when AI creation is saved
 */
const notifyDesignCreation = (
  userId: string,
  title: string,
  mediaType: string,
  designId?: string
) => {
  NotificationService.sendNotification({
    userId,
    title: "✨ New Design Created!",
    body: `Your ${mediaType.toLowerCase()} "${title}" has been saved to My Designs.`,
    type: "DESIGN_CREATED",
    metadata: {
      designId,
      mediaType,
      type: "AI_GENERATED",
    },
  }).catch((err) =>
    console.error("⚠️ [AI Design Notification Error]:", err?.message || err)
  );
};


/**
 * 1. Check AI Service Health and Provider Readiness
 */
const getHealthStatus = async () => {
  return await callAIService<any>("/health", {
    method: "GET",
    timeoutMs: 10000,
  });
};

/**
 * 2. Generate Diamond Image (Text to Image via Gemini)
 */
const generateImage = async (
  userId: string,
  payload: IGenerateImagePayload
): Promise<IGenerateImageResponse> => {
  const { prompt, aspect_ratio = "1:1", number_of_images = 1, saveToDesigns, title } = payload;

  // One id for the whole request: every saved design of this batch shares it.
  const generationId = randomUUID();

  // The AI service generates the images in parallel and returns whatever succeeded.
  // It only responds with an error when *every* image failed.
  const result = await callAIService<IGenerateImageResponse>("/api/v1/images/generate", {
    method: "POST",
    body: {
      prompt,
      aspect_ratio,
      number_of_images,
    },
  });

  const images = result.images ?? [];
  const failed = result.failed ?? [];

  result.generationId = generationId;
  result.requested = number_of_images;
  result.failed = failed;
  result.partial = images.length > 0 && failed.length > 0;

  if (result.partial) {
    console.warn(
      `⚠️ [AI Image]: partial success ${images.length}/${number_of_images} for user ${userId}:`,
      failed.map((f) => `#${f.index} ${f.code}`).join(", ")
    );
  }

  // Optional: Auto-save generated image(s) to user's designs
  if (saveToDesigns && images.length > 0) {
    const savedDesigns = await Promise.all(
      images.map(async (img, idx) => {
        // Position in the original request, so "#3" stays "#3" even if "#2" failed.
        const position = img.index ?? idx + 1;
        const itemTitle =
          title && number_of_images === 1
            ? title
            : title
            ? `${title} #${position}`
            : `AI Diamond Image ${position}`;

        const design = await prisma.design.create({
          data: {
            userId,
            title: itemTitle,
            imageUrl: img.url,
            mediaType: "IMAGE",
            publicId: img.key,
            thumbnailUrl: img.thumbnail_url || null,
            thumbnailKey: img.thumbnail_key || null,
            generationId,
            generationIndex: position,
            type: "AI_GENERATED",
            prompt: result.final_prompt || prompt,
          },
        });
        return serializeDesign(design);
      })
    );

    result.savedDesigns = savedDesigns;
    notifyDesignCreation(userId, savedDesigns[0].title, "IMAGE", savedDesigns[0].id);
  }

  return result;
};

/**
 * 3. Generate Diamond Video from Text (Text to Video via Veo)
 */
const textToVideo = async (
  userId: string,
  payload: ITextToVideoPayload
): Promise<IGenerateVideoResponse> => {
  const { prompt, duration_seconds = 5, aspect_ratio = "16:9", saveToDesigns, title } = payload;

  const result = await callAIService<IGenerateVideoResponse>("/api/v1/videos/text-to-video", {
    method: "POST",
    body: {
      prompt,
      duration_seconds,
      aspect_ratio,
    },
    timeoutMs: 240000, // 4 mins
  });

  const videoUrl = result.video?.url || (result as any).url;
  const videoKey = result.video?.key || (result as any).key;

  if (saveToDesigns && videoUrl) {
    const savedDesign = await prisma.design.create({
      data: {
        userId,
        title: title?.trim() || "AI Diamond Video",
        imageUrl: videoUrl,
        mediaType: "VIDEO",
        publicId: videoKey,
        type: "AI_GENERATED",
        prompt: result.final_prompt || prompt,
        duration: duration_seconds,
      },
    });

    result.savedDesign = savedDesign;
    notifyDesignCreation(userId, savedDesign.title, "VIDEO", savedDesign.id);
  }

  return result;
};

/**
 * 4. Generate Diamond Video from Image (Image to Video via Veo)
 */
const imageToVideo = async (
  userId: string,
  file: Express.Multer.File,
  payload: IImageToVideoPayload
): Promise<IGenerateVideoResponse> => {
  if (!file) {
    throw new AppError("Please provide an image file to animate.", 400);
  }

  const formData = new FormData();
  const imageBlob = new Blob([file.buffer], { type: file.mimetype });
  formData.append("image", imageBlob, file.originalname || "image.png");
  formData.append("prompt", payload.prompt);
  formData.append("duration_seconds", String(payload.duration_seconds || 5));
  formData.append("aspect_ratio", payload.aspect_ratio || "16:9");

  const result = await callAIService<IGenerateVideoResponse>("/api/v1/videos/image-to-video", {
    method: "POST",
    body: formData,
    isFormData: true,
    timeoutMs: 240000, // 4 mins
  });

  const videoUrl = result.video?.url || (result as any).url;
  const videoKey = result.video?.key || (result as any).key;

  if (payload.saveToDesigns && videoUrl) {
    const savedDesign = await prisma.design.create({
      data: {
        userId,
        title: payload.title?.trim() || "AI Diamond Motion Video",
        imageUrl: videoUrl,
        mediaType: "VIDEO",
        publicId: videoKey,
        type: "AI_GENERATED",
        prompt: result.final_prompt || payload.prompt,
        duration: Number(payload.duration_seconds) || 5,
      },
    });

    result.savedDesign = savedDesign;
    notifyDesignCreation(userId, savedDesign.title, "VIDEO", savedDesign.id);
  }

  return result;
};

/**
 * 5. Generate Music from Prompt or Lyrics (via ElevenLabs + OpenAI refiner)
 */
const textToMusic = async (
  userId: string,
  payload: ITextToMusicPayload
): Promise<any> => {
  const result = await callAIService<any>("/api/v1/music/text-to-music", {
    method: "POST",
    body: {
      mode: payload.mode,
      song_name: payload.song_name || null,
      prompt: payload.prompt || null,
      lyrics: payload.lyrics || null,
      style: payload.style || null,
      instrumental: payload.instrumental ?? false,
    },
    timeoutMs: 240000, // 4 mins
  });

  const audioUrl = result.audio?.url;
  const audioKey = result.audio?.key;

  if (payload.saveToDesigns && audioUrl) {
    const savedDesign = await prisma.design.create({
      data: {
        userId,
        title: payload.song_name?.trim() || result.song_name || "AI Diamond Music",
        imageUrl: audioUrl,
        mediaType: "MUSIC",
        publicId: audioKey,
        type: "AI_GENERATED",
        prompt: result.final_prompt || payload.prompt || payload.lyrics,
        duration: result.estimated_duration_seconds || undefined,
      },
    });

    result.savedDesign = savedDesign;
    notifyDesignCreation(userId, savedDesign.title, "MUSIC", savedDesign.id);
  }

  return result;
};

/**
 * 6. Clean & Enhance Uploaded Audio (via ElevenLabs Voice/Audio Enhancer)
 */
const enhanceAudio = async (
  userId: string,
  file: Express.Multer.File,
  payload: IEnhanceAudioPayload
): Promise<IEnhanceAudioResponse> => {
  if (!file) {
    throw new AppError("Please provide an audio file to clean and enhance.", 400);
  }

  const formData = new FormData();
  const audioBlob = new Blob([file.buffer], { type: file.mimetype });
  formData.append("audio", audioBlob, file.originalname || "recording.mp3");
  formData.append("prompt", payload.prompt);

  const result = await callAIService<IEnhanceAudioResponse>("/api/v1/music/enhance-audio", {
    method: "POST",
    body: formData,
    isFormData: true,
    timeoutMs: 240000, // 4 mins
  });

  const audioUrl = result.audio?.url || (result as any).url;
  const audioKey = result.audio?.key || (result as any).key;

  if (payload.saveToDesigns && audioUrl) {
    const savedDesign = await prisma.design.create({
      data: {
        userId,
        title: payload.title?.trim() || "Enhanced Audio Track",
        imageUrl: audioUrl,
        mediaType: "AUDIO",
        publicId: audioKey,
        type: "AI_GENERATED",
        prompt: payload.prompt,
      },
    });

    result.savedDesign = savedDesign;
    notifyDesignCreation(userId, savedDesign.title, "AUDIO", savedDesign.id);
  }

  return result;
};

/**
 * 7. Save Any AI Creation Directly to "My Designs"
 * (Matching Screen 4 & Screen 5 in the app UI: "Save Music" -> "Music Saved! Your Music has been saved to My Designs.")
 */
const saveCreation = async (userId: string, payload: ISaveCreationPayload) => {
  const newDesign = await prisma.design.create({
    data: {
      userId,
      title: payload.title.trim(),
      imageUrl: payload.mediaUrl,
      mediaType: payload.mediaType,
      publicId: payload.publicId || null,
      fileSize: payload.fileSize || null,
      mimeType: payload.mimeType || null,
      type: "AI_GENERATED",
      prompt: payload.prompt || null,
      duration: payload.duration || null,
      thumbnailUrl: payload.thumbnailUrl || null,
      thumbnailKey: payload.thumbnailKey || null,
      generationId: payload.generationId || null,
      generationIndex: payload.generationIndex || null,
    },
  });

  notifyDesignCreation(userId, newDesign.title, newDesign.mediaType, newDesign.id);

  return serializeDesign(newDesign);
};

export const AIService = {
  getHealthStatus,
  generateImage,
  textToVideo,
  imageToVideo,
  textToMusic,
  enhanceAudio,
  saveCreation,
};
