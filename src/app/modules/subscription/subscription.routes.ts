import { Router } from "express";
import { auth } from "../../middleware/auth";
import { SubscriptionController } from "./subscription.controller";

const router = Router();

// 1. RevenueCat In-App Purchase Webhook Receiver
router.post(
  "/webhook",
  SubscriptionController.handleWebhook
);

// 2. Get Current Authenticated User Subscription
router.get(
  "/my-subscription",
  auth("user", "admin"),
  SubscriptionController.getMySubscription
);

// 3. Get Subscription Plans (for mobile "Choose Your Plan" paywall)
router.get(
  "/plans",
  SubscriptionController.getPlans
);

export const subscriptionRoutes = router;
