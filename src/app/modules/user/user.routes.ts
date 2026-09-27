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

// Delete own account (supports both /me and /delete-account)
router.delete("/me", auth("user", "admin"), UserController.deleteMyAccount);
router.delete("/delete-account", auth("user", "admin"), UserController.deleteMyAccount);

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

// Admin deletes any user account by ID
router.delete("/:id", auth("admin"), UserController.deleteUserByAdmin);

export const userRoutes = router;
