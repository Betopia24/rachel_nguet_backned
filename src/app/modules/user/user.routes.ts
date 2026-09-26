import { Router } from "express";
import { auth } from "../../middleware/auth";
import { uploadAvatar } from "../../middleware/fileUpload";
import { parseBodyData } from "../../middleware/parseBodyData";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.get("/me", auth("user", "admin"), UserController.getMe);

router.patch(
  "/me",
  auth("user", "admin"),
  uploadAvatar,
  parseBodyData,
  validateRequest(UserValidation.updateProfileValidationSchema),
  UserController.updateMe
);

// Save or Update User's FCM Device Push Notification Token
router.post(
  "/fcm-token",
  auth("user", "admin"),
  validateRequest(UserValidation.updateFcmTokenValidationSchema),
  UserController.updateFcmToken
);

router.get("/", auth("admin"), UserController.getAllUsers);

router.get("/:id", auth("admin"), UserController.getUserById);

router.patch(
  "/:id/status",
  auth("admin"),
  validateRequest(UserValidation.updateUserStatusValidationSchema),
  UserController.updateUserStatus
);

export const userRoutes = router;
