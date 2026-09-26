import { Router } from "express";
import { auth } from "../../middleware/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

// 1. Get All Notifications for Current User (with pagination, unreadCount & filter)
router.get(
  "/",
  auth("user", "admin"),
  NotificationController.getMyNotifications
);

// 2. Mark All Notifications as Read
router.patch(
  "/mark-all-read",
  auth("user", "admin"),
  NotificationController.markAllAsRead
);

// 3. Mark Single Notification as Read
router.patch(
  "/:id/read",
  auth("user", "admin"),
  NotificationController.markAsRead
);

// 4. Clear All Notifications
router.delete(
  "/clear-all",
  auth("user", "admin"),
  NotificationController.clearAllNotifications
);

// 5. Delete Single Notification
router.delete(
  "/:id",
  auth("user", "admin"),
  NotificationController.deleteNotification
);

export const notificationRoutes = router;
