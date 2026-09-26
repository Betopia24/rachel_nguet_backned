import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import config from "../../../config";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { mapProductToTier, SUBSCRIPTION_PLANS } from "./subscription.constant";
import { IRevenueCatWebhookPayload } from "./subscription.interface";
import { NotificationService } from "../notification/notification.service";

/**
 * 1. Process RevenueCat Webhook Events
 */
const handleWebhookEvent = async (
  payload: IRevenueCatWebhookPayload,
  authHeader?: string
) => {
  // Optional security: Validate RevenueCat Webhook Authorization Header if configured
  if (config.revenuecat.webhook_auth_header) {
    const expectedHeader = config.revenuecat.webhook_auth_header.trim();
    const providedHeader = (authHeader || "").trim();

    if (
      providedHeader !== expectedHeader &&
      providedHeader !== `Bearer ${expectedHeader}`
    ) {
      throw new AppError("Unauthorized RevenueCat webhook request.", 401);
    }
  }

  if (!payload || !payload.event) {
    throw new AppError("Invalid RevenueCat webhook payload.", 400);
  }

  const { event } = payload;
  console.log(`🔔 [RevenueCat Webhook]: Event received -> ${event.type} for app_user_id: ${event.app_user_id}`);

  const appUserId = event.app_user_id;
  if (!appUserId) {
    return { received: true, message: "Missing app_user_id." };
  }

  // 1. Locate user in MongoDB (by MongoDB ID, Firebase UID, Google ID, Apple ID, or Email)
  let user = null;

  // Check if valid MongoDB ObjectID (24 hex characters)
  if (/^[0-9a-fA-F]{24}$/.test(appUserId)) {
    user = await prisma.user.findUnique({ where: { id: appUserId } });
  }

  if (!user) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: appUserId },
          { googleId: appUserId },
          { appleId: appUserId },
          { email: appUserId.toLowerCase() },
        ],
      },
    });
  }

  if (!user) {
    console.warn(`⚠️ [RevenueCat Webhook]: User not found for app_user_id: ${appUserId}`);
    return { received: true, message: `User not found for app_user_id: ${appUserId}` };
  }

  // 2. Map RevenueCat Product/Entitlement to internal Tier
  const tier: SubscriptionTier = mapProductToTier(
    event.product_id,
    event.entitlement_id || event.entitlement_ids?.[0]
  );

  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : null;
  const purchasedAt = event.purchased_at_ms
    ? new Date(event.purchased_at_ms)
    : new Date();

  let subscriptionStatus: SubscriptionStatus = "ACTIVE";
  let isSubscribed = user.isSubscribed;
  let userTier: SubscriptionTier = user.subscriptionTier;

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "NON_RENEWING_PURCHASE":
      subscriptionStatus = event.period_type === "TRIAL" ? "TRIAL" : "ACTIVE";
      isSubscribed = true;
      userTier = tier;
      break;

    case "CANCELLATION":
      // In In-App purchases, when user cancels subscription, access remains active until current period ends
      subscriptionStatus = "CANCELLED";
      if (expiresAt && expiresAt < new Date()) {
        isSubscribed = false;
        userTier = "FREE";
      }
      break;

    case "EXPIRATION":
      subscriptionStatus = "EXPIRED";
      isSubscribed = false;
      userTier = "FREE";
      break;

    case "SUBSCRIPTION_PAUSED":
      subscriptionStatus = "PAUSED";
      isSubscribed = false;
      break;

    case "BILLING_ISSUE":
      subscriptionStatus = "BILLING_ISSUE";
      break;

    default:
      console.log(`ℹ️ [RevenueCat Webhook]: Unhandled event type: ${event.type}`);
      break;
  }

  // 3. Update User record with new subscription status
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isSubscribed,
      subscriptionTier: userTier,
      subscriptionExpiresAt: expiresAt,
    },
  });

  // 4. Record/Log Subscription event in Database
  const subscriptionRecord = await prisma.subscription.create({
    data: {
      userId: user.id,
      appUserId,
      originalAppUserId: event.original_app_user_id || appUserId,
      productId: event.product_id,
      entitlementId: event.entitlement_id || event.entitlement_ids?.[0] || null,
      tier,
      status: subscriptionStatus,
      store: event.store || null,
      environment: event.environment || null,
      price: event.price_in_purchased_currency || null,
      currency: event.currency || "USD",
      periodType: event.period_type || null,
      purchasedAt,
      expiresAt,
      cancelledAt: event.type === "CANCELLATION" ? new Date() : null,
      isTrial: event.period_type === "TRIAL",
      rawEvent: JSON.stringify(event),
    },
  });

  // 5. Send Push & In-App Notification based on Subscription Outcome
  try {
    if (subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIAL") {
      const isRenewal = event.type === "RENEWAL";
      await NotificationService.sendNotification({
        userId: user.id,
        title: isRenewal ? "💎 Subscription Renewed!" : "💎 Subscription Activated!",
        body: isRenewal
          ? `Your ${userTier} subscription has been renewed successfully.`
          : `Congratulations! Your subscription to ${userTier} is now active. Enjoy all premium features!`,
        type: "SUBSCRIPTION_SUCCESS",
        metadata: {
          tier: userTier,
          status: subscriptionStatus,
          eventType: event.type,
          productId: event.product_id,
        },
      });
    } else if (subscriptionStatus === "BILLING_ISSUE") {
      await NotificationService.sendNotification({
        userId: user.id,
        title: "⚠️ Subscription Payment Issue",
        body: `Payment for your ${userTier} subscription could not be processed. Please update your payment method.`,
        type: "SUBSCRIPTION_FAILED",
        metadata: {
          tier: userTier,
          status: subscriptionStatus,
          eventType: event.type,
          productId: event.product_id,
        },
      });
    } else if (subscriptionStatus === "CANCELLED" || subscriptionStatus === "EXPIRED") {
      await NotificationService.sendNotification({
        userId: user.id,
        title: subscriptionStatus === "CANCELLED" ? "Subscription Cancelled" : "Subscription Expired",
        body:
          subscriptionStatus === "CANCELLED"
            ? `Your ${userTier} subscription has been cancelled.`
            : `Your ${userTier} subscription has expired. Renew today to keep enjoying premium features.`,
        type: "SUBSCRIPTION_FAILED",
        metadata: {
          tier: userTier,
          status: subscriptionStatus,
          eventType: event.type,
          productId: event.product_id,
        },
      });
    }
  } catch (notifyErr: any) {
    console.error("⚠️ [Subscription Notification Error]:", notifyErr?.message || notifyErr);
  }

  console.log(
    `✅ [RevenueCat Webhook Processed]: User ${user.email} -> Tier: ${userTier}, Subscribed: ${isSubscribed}, Status: ${subscriptionStatus}`
  );

  return {
    received: true,
    eventType: event.type,
    userId: user.id,
    tier: userTier,
    isSubscribed,
    subscriptionId: subscriptionRecord.id,
  };
};

/**
 * 2. Get Current Authenticated User Subscription Details
 */
const getMySubscription = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isSubscribed: true,
      subscriptionTier: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  // Determine if active
  const isCurrentlyActive =
    user.isSubscribed &&
    (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date());

  // Current plan details
  const activePlan = SUBSCRIPTION_PLANS.find(
    (p) => p.tier === user.subscriptionTier
  ) || null;

  // Latest subscription transaction
  const latestSubscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return {
    isSubscribed: isCurrentlyActive,
    tier: isCurrentlyActive ? user.subscriptionTier : "FREE",
    expiresAt: user.subscriptionExpiresAt,
    plan: isCurrentlyActive && activePlan ? activePlan : null,
    latestTransaction: latestSubscription
      ? {
          status: latestSubscription.status,
          productId: latestSubscription.productId,
          store: latestSubscription.store,
          isTrial: latestSubscription.isTrial,
          purchasedAt: latestSubscription.purchasedAt,
          expiresAt: latestSubscription.expiresAt,
        }
      : null,
  };
};

/**
 * 3. Get All Subscription Plans for Mobile Paywall Display
 */
const getSubscriptionPlans = async () => {
  return SUBSCRIPTION_PLANS;
};

export const SubscriptionService = {
  handleWebhookEvent,
  getMySubscription,
  getSubscriptionPlans,
};
