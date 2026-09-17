import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

// Standard Authentication
router.post(
  "/register",
  validateRequest(AuthValidation.registerValidationSchema),
  AuthController.registerUser
);

router.post(
  "/login",
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginUser
);

// Social Authentication (Google & Apple)
router.post(
  "/google-login",
  validateRequest(AuthValidation.googleLoginValidationSchema),
  AuthController.googleLogin
);

router.post(
  "/apple-login",
  validateRequest(AuthValidation.appleLoginValidationSchema),
  AuthController.appleLogin
);

// Password Management
router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword
);

router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword
);

router.post(
  "/change-password",
  auth("user", "admin"),
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword
);

// Token Refresh
router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refreshToken
);

export const authRoutes = router;

