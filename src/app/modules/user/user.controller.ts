import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserService } from "./user.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await UserService.getMe(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;

  // Support file upload under 'file', 'avatar', 'image', or 'profileImage'
  const file =
    req.file ||
    (req.files as any)?.file?.[0] ||
    (req.files as any)?.avatar?.[0] ||
    (req.files as any)?.image?.[0] ||
    (req.files as any)?.profileImage?.[0];

  const result = await UserService.updateMe(user.id, req.body, file);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile updated successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.getUserById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User retrieved successfully",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.updateUserStatus(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User status updated successfully",
    data: result,
  });
});

const updateFcmToken = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { fcmToken } = req.body;
  const result = await UserService.updateFcmToken(user.id, fcmToken);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const { password } = req.body || {};
  const result = await UserService.deleteMyAccount(user.id, password);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

const deleteUserByAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.deleteUserByAdmin(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

export const UserController = {
  getMe,
  updateMe,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateFcmToken,
  deleteMyAccount,
  deleteUserByAdmin,
};
