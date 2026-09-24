import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { SubscriptionService } from "./subscription.service";

/**
 * 1. RevenueCat Webhook Handler
 */
const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const result = await SubscriptionService.handleWebhookEvent(req.body, authHeader);

  // RevenueCat requires a 200 OK response to confirm event receipt
  res.status(200).json({
    success: true,
    message: "RevenueCat webhook event processed successfully",
    data: result,
  });
});

/**
 * 2. Get Current User Active Subscription
 */
const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  const result = await SubscriptionService.getMySubscription(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription details retrieved successfully",
    data: result,
  });
});

/**
 * 3. Get Subscription Plans (Choose Your Plan Screen)
 */
const getPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionService.getSubscriptionPlans();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription plans retrieved successfully",
    data: result,
  });
});

export const SubscriptionController = {
  handleWebhook,
  getMySubscription,
  getPlans,
};
