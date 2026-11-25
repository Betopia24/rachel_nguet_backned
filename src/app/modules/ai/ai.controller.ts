import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AIService } from "./ai.service";

/**
 * 1. Health Status of AI Engines
 */
const getHealthStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AIService.getHealthStatus();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "AI service health status retrieved successfully",
    data: result,
  });
});

/**
 * 2. Generate Diamond Image from Prompt
 */
const generateImage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await AIService.generateImage(user.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: result.partial
      ? `${result.images.length} of ${result.requested} images generated. Some images failed - see "failed" for details.`
      : "Diamond image generated successfully",
    data: result,
  });
});

/**
 * 3. Generate Diamond Motion Video from Text
 */
const textToVideo = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await AIService.textToVideo(user.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Diamond motion video generated successfully",
    data: result,
  });
});

/**
 * 4. Generate Diamond Motion Video from Image
 */
const imageToVideo = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await AIService.imageToVideo(user.id, req.file!, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Image animated to diamond motion video successfully",
    data: result,
  });
});

/**
 * 5. Generate AI Music from Prompt or Lyrics
 */
const textToMusic = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await AIService.textToMusic(user.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "AI music generated successfully",
    data: result,
  });
});

/**
 * 6. Clean & Enhance Uploaded Audio / Voice
 */
const enhanceAudio = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await AIService.enhanceAudio(user.id, req.file!, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Audio cleaned and enhanced successfully",
    data: result,
  });
});

/**
 * 7. Save AI Creation to "My Designs"
 */
const saveCreation = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await AIService.saveCreation(user.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Creation saved to My Designs successfully",
    data: result,
  });
});

export const AIController = {
  getHealthStatus,
  generateImage,
  textToVideo,
  imageToVideo,
  textToMusic,
  enhanceAudio,
  saveCreation,
};
