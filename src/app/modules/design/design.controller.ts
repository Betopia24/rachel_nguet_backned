import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DesignService } from "./design.service";

const uploadDesign = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await DesignService.uploadDesign(user.id, req.file!, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Design uploaded successfully",
    data: result,
  });
});

const getMyDesigns = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await DesignService.getMyDesigns(user.id, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Designs retrieved successfully",
    data: result.data,
    metaData: result.meta,
  });
});

const getRecentDesigns = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const mediaType = req.query.mediaType as any;
  const result = await DesignService.getRecentDesigns(user.id, limit, mediaType);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Recent designs retrieved successfully",
    data: result,
  });
});

const getDesignById = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await DesignService.getDesignById(user.id, req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Design retrieved successfully",
    data: result,
  });
});

const deleteDesign = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await DesignService.deleteDesign(user.id, user.role, req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

export const DesignController = {
  uploadDesign,
  getMyDesigns,
  getRecentDesigns,
  getDesignById,
  deleteDesign,
};
