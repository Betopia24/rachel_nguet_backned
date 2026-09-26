import { NotificationType } from "@prisma/client";
import { Message } from "firebase-admin/messaging";
import { AppError } from "../../error/AppError";
import { getFirebaseMessaging } from "../../lib/firebase";
import { prisma } from "../../lib/prisma";
import {
  INotificationFilterOptions,
  ISendNotificationPayload,
} from "./notification.interface";

/**
 * 1. Send Notification (Persists to Database & Dispatches Push Notification via FCM)
 */
const sendNotification = async (payload: ISendNotificationPayload) => {
  const { userId, title, body, type = "GENERAL", metadata } = payload;

  // 1. Save Notification in MongoDB for In-App Notification Center
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type,
      metadata: metadata ? metadata : undefined,
    },
  });

  // 2. Fetch User to retrieve FCM Token
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fcmToken: true, email: true },
    });

    if (!user || !user.fcmToken) {
      // User doesn't have an active FCM token registered yet
      return notification;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn(
        "⚠️ [Push Notification]: Firebase Admin messaging is not initialized. Notification saved to DB only."
      );
      return notification;
    }

    // Convert metadata values to strings as required by FCM data payload
    const stringifiedData: Record<string, string> = {
      notificationId: notification.id,
      type: String(type),
      clickAction: "FLUTTER_NOTIFICATION_CLICK",
    };

    if (metadata && typeof metadata === "object") {
      Object.entries(metadata).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          stringifiedData[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
        }
      });
    }

    // Construct FCM Message Payload
    const message: Message = {
      token: user.fcmToken,
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
        headers: {
          "apns-priority": "10",
        },
      },
    };

    const response = await messaging.send(message);
    console.log(
      `📲 [FCM Push Notification Sent]: User ${user.email} (${userId}) -> Msg ID: ${response}`
    );
  } catch (error: any) {
    console.error("❌ [FCM Push Notification Error]:", error?.message || error);

    // If token is invalid or no longer registered, clear it from database
    const errorCode = error?.code || error?.errorInfo?.code;
    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token" ||
      errorCode === "messaging/invalid-argument"
    ) {
      console.warn(
        `🧹 [FCM Token Cleanup]: Clearing obsolete FCM token for user ${userId}.`
      );
      await prisma.user
        .update({
          where: { id: userId },
          data: { fcmToken: null },
        })
        .catch(() => null);
    }
  }

  return notification;
};

/**
 * 2. Get User Notifications (Paginated with Unread Count)
 */
const getUserNotifications = async (
  userId: string,
  filters: INotificationFilterOptions
) => {
  const { page = 1, limit = 20, isRead, type } = filters;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const whereCondition: any = { userId };

  if (isRead !== undefined && isRead !== "") {
    whereCondition.isRead = isRead === "true" || isRead === true;
  }

  if (type) {
    whereCondition.type = type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where: whereCondition }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
      unreadCount,
    },
    data: notifications,
  };
};

/**
 * 3. Mark Single Notification as Read
 */
const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updated;
};

/**
 * 4. Mark All Notifications as Read for User
 */
const markAllAsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return {
    count: result.count,
    message: `${result.count} notification(s) marked as read.`,
  };
};

/**
 * 5. Delete a Single Notification
 */
const deleteNotification = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { message: "Notification deleted successfully." };
};

/**
 * 6. Clear All Notifications for User
 */
const clearAllNotifications = async (userId: string) => {
  const result = await prisma.notification.deleteMany({
    where: { userId },
  });

  return {
    count: result.count,
    message: `${result.count} notification(s) deleted successfully.`,
  };
};

export const NotificationService = {
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
};
