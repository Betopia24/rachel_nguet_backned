import { NotificationType } from "@prisma/client";

export interface ISendNotificationPayload {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  metadata?: Record<string, any>;
}

export interface INotificationFilterOptions {
  page?: number | string;
  limit?: number | string;
  isRead?: boolean | string;
  type?: NotificationType;
}
