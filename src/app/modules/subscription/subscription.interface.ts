import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

export type TRevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "EXPIRATION"
  | "PRODUCT_CHANGE"
  | "SUBSCRIPTION_PAUSED"
  | "BILLING_ISSUE"
  | "SUBSCRIBER_ALIAS"
  | "TRANSFER";

export interface IRevenueCatEvent {
  id: string;
  type: TRevenueCatEventType;
  app_user_id: string;
  original_app_user_id?: string;
  product_id: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  store?: string;
  environment?: string;
  price_in_purchased_currency?: number;
  currency?: string;
  is_trial_conversion?: boolean;
  cancel_reason?: string;
  new_product_id?: string;
  [key: string]: any;
}

export interface IRevenueCatWebhookPayload {
  api_version: string;
  event: IRevenueCatEvent;
}

export interface IPlanFeature {
  title: string;
  description?: string;
}

export interface ISubscriptionPlan {
  id: string;
  productId: string;
  tier: SubscriptionTier;
  title: string;
  price: number;
  currency: string;
  period: string;
  buttonText: string;
  features: string[];
}
