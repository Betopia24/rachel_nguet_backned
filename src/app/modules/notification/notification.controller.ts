import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { NotificationService } from "./notification.service";

/**
 * 1. Get Logged In User's Notifications
 */
const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.getUserNotifications(user.id, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: result.data,
    metaData: result.meta,
  });
});

/**
 * 2. Mark Single Notification as Read
 */
const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.markAsRead(user.id, req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

/**
 * 3. Mark All Notifications as Read
 */
const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.markAllAsRead(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

/**
 * 4. Delete Single Notification
 */
const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.deleteNotification(user.id, req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * 5. Clear All Notifications
 */
const clearAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await NotificationService.clearAllNotifications(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
