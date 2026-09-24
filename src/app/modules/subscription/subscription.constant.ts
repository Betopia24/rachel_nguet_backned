import { SubscriptionTier } from "@prisma/client";
import { ISubscriptionPlan } from "./subscription.interface";

export const SUBSCRIPTION_PLANS: ISubscriptionPlan[] = [
  {
    id: "basic",
    productId: "diamond_basic",
    tier: "BASIC",
    title: "DIAMOND BASIC",
    price: 9,
    currency: "USD",
    period: "/ Month",
    buttonText: "Choose Basic",
    features: [
      "Create Account & Profile",
      "AI Image Generation - Create Image",
      "Diamond Wallet & Balance",
      "Basic App Access",
    ],
  },
  {
    id: "standard",
    productId: "diamond_standard",
    tier: "STANDARD",
    title: "DIAMOND STANDARD",
    price: 29,
    currency: "USD",
    period: "/ Month",
    buttonText: "Choose Standard",
    features: [
      "Unlimited Basic Features",
      "AI Music Generation - Create songs",
      "AI Video Generation - Create songs",
      "AI Design - Create design, logos, and artwork",
    ],
  },
  {
    id: "premium",
    productId: "diamond_premium",
    tier: "PREMIUM",
    title: "DIAMOND PREMIUM",
    price: 59,
    currency: "USD",
    period: "/ Month",
    buttonText: "Choose Premium",
    features: [
      "Unlimited Standard Features",
      "AI Photo Enhancement - Upload photo & let AI improve it",
      "AI Photo Identification - AI identifications and name photo",
      "AI Design - More styles and higher-quality result",
      "Priority Support",
    ],
  },
  {
    id: "design_pro",
    productId: "diamond_design_pro",
    tier: "DESIGN_PRO",
    title: "DIAMOND DESIGN PRO",
    price: 99,
    currency: "USD",
    period: "/ Month",
    buttonText: "Choose Design Pro",
    features: [
      "Full AI Design Studio - Professional design tools",
      "Upload Photos - AI Turns Them into design",
      "Marketplace - Sell design, music, and videos inside the app",
      "Highest quality Output",
      "Unlimited Usage",
      "Early access to new features",
    ],
  },
];

/**
 * Map RevenueCat product_id or entitlement_id to internal SubscriptionTier
 */
export const mapProductToTier = (productId: string, entitlementId?: string | null): SubscriptionTier => {
  const normalized = (productId || entitlementId || "").toLowerCase();

  if (normalized.includes("pro") || normalized.includes("design_pro")) {
    return "DESIGN_PRO";
  }
  if (normalized.includes("premium")) {
    return "PREMIUM";
  }
  if (normalized.includes("standard")) {
    return "STANDARD";
  }
  if (normalized.includes("basic")) {
    return "BASIC";
  }

  return "BASIC";
};
