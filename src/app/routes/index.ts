import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes";
import { userRoutes } from "../modules/user/user.routes";
import { designRoutes } from "../modules/design/design.routes";
import { aiRoutes } from "../modules/ai/ai.routes";
import { subscriptionRoutes } from "../modules/subscription/subscription.routes";
import { notificationRoutes } from "../modules/notification/notification.routes";

export const router = Router();

const moduleRoutes: Array<{ path: string; route: Router }> = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/user",
    route: userRoutes,
  },
  {
    path: "/design",
    route: designRoutes,
  },
  {
    path: "/ai",
    route: aiRoutes,
  },
  {
    path: "/subscription",
    route: subscriptionRoutes,
  },
  {
    path: "/notification",
    route: notificationRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


