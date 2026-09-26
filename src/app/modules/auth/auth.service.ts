import bcrypt from "bcrypt";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../../../config";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import { verifyFirebaseIdToken } from "../../lib/firebase";
import { sendEmail } from "../../utils/sendEmail";
import {
  IAppleLogin,
  IChangePassword,
  IForgotPassword,
  IGoogleLogin,
  ILoginUser,
  IRegisterUser,
  IResendOtp,
  IResetPassword,
  IVerifyOtp,
} from "./auth.interface";
import {
  emailVerificationTemplate,
  passwordResetTemplate,
} from "../../utils/templates";

// Utility: Sanitize user object to never leak sensitive fields
const sanitizeUser = (user: any) => {
  const { password, ...sanitized } = user;
  return sanitized;
};

// Utility: Generate JWT Access Token
const generateAccessToken = (user: {
  id: string;
  email: string;
  role: string;
}) => {
  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(jwtPayload, config.jwt.secret as Secret, {
    expiresIn: config.jwt.expire_in as SignOptions["expiresIn"],
  });
};

// Utility: Generate JWT Refresh Token
const generateRefreshToken = (user: {
  id: string;
  email: string;
  role: string;
}) => {
  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(jwtPayload, config.jwt.refresh_secret as Secret, {
    expiresIn: config.jwt.refresh_expire_in as SignOptions["expiresIn"],
  });
};

/**
 * 1. Register User (Step 1: Save User & Send OTP)
 */
const registerUser = async (payload: IRegisterUser) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  // Check if account already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser && existingUser.isVerified) {
    throw new AppError(
      "An account with this email address already exists. Please log in instead.",
      400,
    );
  }

  // Hash password securely
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.password_salt),
  );

  let user = existingUser;
  if (!user) {
    // Create new unverified user
    user = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        authProvider: "email",
        status: "active",
        isVerified: false,
      },
    });
  } else {
    // If existing user was not verified, update details
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: payload.name.trim(),
        password: hashedPassword,
      },
    });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any previous registration OTPs
  await prisma.otp.deleteMany({
    where: { email: normalizedEmail, type: "REGISTRATION" },
  });

  // Save new OTP
  await prisma.otp.create({
    data: {
      email: normalizedEmail,
      otp,
      type: "REGISTRATION",
      expiresAt,
    },
  });

  // Send verification email
  const template = emailVerificationTemplate({ name: user.name, otp });
  await sendEmail({
    to: normalizedEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return {
    message:
      "Registration initiated successfully. A verification code (OTP) has been sent to your email.",
    email: normalizedEmail,
  };
};

/**
 * 2. Verify Registration OTP (Step 2: Activate & Issue Access Token)
 */
const verifyRegistrationOtp = async (payload: IVerifyOtp) => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const inputOtp = payload.otp.trim();

  // Find OTP record
  const otpRecord = await prisma.otp.findFirst({
    where: {
      email: normalizedEmail,
      otp: inputOtp,
      type: "REGISTRATION",
    },
  });

  if (!otpRecord) {
    throw new AppError(
      "Invalid verification code. Please check your email or request a new code.",
      400,
    );
  }

  // Check expiration
  if (otpRecord.expiresAt < new Date()) {
    await prisma.otp.delete({ where: { id: otpRecord.id } });
    throw new AppError(
      "Verification code has expired. Please request a new code.",
      400,
    );
  }

  // Delete used OTP
  await prisma.otp.delete({ where: { id: otpRecord.id } });

  // Update user as verified
  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      isVerified: true,
      status: "active",
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
    message: "Account verified successfully! Welcome to Diamond Pay.",
  };
};

/**
 * 3. Resend OTP (Registration or Forgot Password)
 */
const resendOtp = async (payload: IResendOtp) => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const type = payload.type || "REGISTRATION";

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError("No account found with this email address.", 404);
  }

  // Status check
  if (user.status === "blocked") {
    throw new AppError(
      "Your account has been suspended. Please contact customer support.",
      403,
    );
  }

  if (user.status === "inactive") {
    throw new AppError(
      "Your account is currently inactive. Please contact customer support.",
      403,
    );
  }

  // If already verified, do not allow resending registration OTP
  if (type === "REGISTRATION" && user.isVerified) {
    throw new AppError(
      "This account is already verified. Please log in directly.",
      400,
    );
  }

  // For password reset, social login accounts without password cannot reset password
  if (type === "FORGOT_PASSWORD" && !user.password) {
    const provider = user.authProvider === "google" ? "Google" : "Apple";
    throw new AppError(
      `This account is registered with ${provider} sign-in. Password reset is not available.`,
      400,
    );
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate previous OTPs
  await prisma.otp.deleteMany({
    where: { email: normalizedEmail, type },
  });

  await prisma.otp.create({
    data: {
      email: normalizedEmail,
      otp,
      type,
      expiresAt,
    },
  });

  const isRegistration = type === "REGISTRATION";
  const template = isRegistration
    ? emailVerificationTemplate({ name: user.name, otp })
    : passwordResetTemplate({ name: user.name, otp });

  await sendEmail({
    to: normalizedEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return {
    message: "A new verification code has been sent to your email address.",
    email: normalizedEmail,
  };
};

/**
 * 4. Login User (Email & Password)
 */
const loginUser = async (payload: ILoginUser) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(
      "No account found with this email address. Please check your email or sign up.",
      404,
    );
  }

  // Account status check
  if (user.status === "blocked") {
    throw new AppError(
      "Your account has been suspended. Please contact customer support.",
      403,
    );
  }

  if (user.status === "inactive") {
    throw new AppError(
      "Your account is currently inactive. Please contact customer support.",
      403,
    );
  }

  // If user has not verified their email yet
  if (!user.isVerified) {
    throw new AppError(
      "Your email is not verified yet. Please enter the OTP sent to your email or click resend.",
      403,
    );
  }

  // If user signed up via Google or Apple and has not set a password
  if (!user.password) {
    const providerName =
      user.authProvider === "google"
        ? "Google"
        : user.authProvider === "apple"
          ? "Apple"
          : "social";
    throw new AppError(
      `This account is registered with ${providerName} sign-in. Please use "Continue with ${providerName}" to log in.`,
      400,
    );
  }

  // Validate password
  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(
      "Incorrect password. Please verify your password or use 'Forgot Password'.",
      401,
    );
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

/**
 * 5. Google Sign-In / Login (via Firebase Admin SDK or Google OAuth)
 */
const googleLogin = async (payload: IGoogleLogin) => {
  let email = payload.email?.toLowerCase().trim();
  let name = payload.name?.trim();
  let googleId = payload.googleId;
  let avatar = payload.avatar;
  let firebaseUid: string | undefined;

  if (payload.idToken) {
    let verifiedViaFirebase = false;

    // 1. Try Firebase Admin verification
    try {
      const decodedFirebase = await verifyFirebaseIdToken(payload.idToken);
      if (decodedFirebase) {
        verifiedViaFirebase = true;
        firebaseUid = decodedFirebase.uid;
        googleId = decodedFirebase.uid;
        if (decodedFirebase.email) email = decodedFirebase.email.toLowerCase().trim();
        if (decodedFirebase.name && !name) name = decodedFirebase.name.trim();
        if (decodedFirebase.picture && !avatar) avatar = decodedFirebase.picture;
      }
    } catch (firebaseErr: any) {
      // If Firebase failed, fallback to standard Google OAuth tokeninfo
      console.warn("ℹ️ [Google Login]: Firebase verify failed, falling back to Google OAuth tokeninfo:", firebaseErr.message);

      try {
        const response = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${payload.idToken}`
        );
        if (response.ok) {
          const tokenInfo: any = await response.json();
          if (tokenInfo.email) email = tokenInfo.email.toLowerCase().trim();
          if (tokenInfo.name && !name) name = tokenInfo.name.trim();
          if (tokenInfo.sub) googleId = tokenInfo.sub;
          if (tokenInfo.picture && !avatar) avatar = tokenInfo.picture;
        } else if (!email || !googleId) {
          throw new AppError(firebaseErr.message || "Invalid or expired Google authentication token.", 401);
        }
      } catch (oauthErr: any) {
        if (oauthErr instanceof AppError) throw oauthErr;
        if (!email || !googleId) {
          throw new AppError(
            firebaseErr.message || "Unable to verify Google credentials. Please try again.",
            401
          );
        }
      }
    }
  }

  if (!email && !googleId && !firebaseUid) {
    throw new AppError(
      "Google login requires a valid Google ID token or email address.",
      400
    );
  }

  let user = null;
  if (firebaseUid) {
    user = await prisma.user.findFirst({ where: { firebaseUid } });
  }
  if (!user && googleId) {
    user = await prisma.user.findFirst({ where: { googleId } });
  }
  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (user) {
    if (user.status === "blocked") {
      throw new AppError(
        "Your account has been suspended. Please contact customer support.",
        403
      );
    }
    if (user.status === "inactive") {
      throw new AppError(
        "Your account is currently inactive. Please contact customer support.",
        403
      );
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId || googleId,
        firebaseUid: user.firebaseUid || firebaseUid,
        avatar: user.avatar || avatar,
        fcmToken: payload.fcmToken ? payload.fcmToken.trim() : user.fcmToken,
        isVerified: true,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        name: name || "Google User",
        email: email || `${googleId || firebaseUid}@google.user`,
        googleId,
        firebaseUid,
        avatar,
        fcmToken: payload.fcmToken ? payload.fcmToken.trim() : null,
        authProvider: "google",
        isVerified: true,
        status: "active",
        role: "user",
      },
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

/**
 * 6. Apple Sign-In / Login (via Firebase Admin SDK or Apple Token)
 */
const appleLogin = async (payload: IAppleLogin) => {
  const tokenToVerify = payload.idToken || payload.identityToken;
  let email = payload.email?.toLowerCase().trim();
  let name = payload.name?.trim();
  let appleId = payload.appleId;
  let firebaseUid: string | undefined;

  if (tokenToVerify) {
    // 1. Try Firebase Admin verification
    try {
      const decodedFirebase = await verifyFirebaseIdToken(tokenToVerify);
      if (decodedFirebase) {
        firebaseUid = decodedFirebase.uid;
        appleId = decodedFirebase.uid || (decodedFirebase as any).sub;
        if (decodedFirebase.email) email = decodedFirebase.email.toLowerCase().trim();
        if (decodedFirebase.name && !name) name = decodedFirebase.name.trim();
      }
    } catch (firebaseErr: any) {
      console.warn("ℹ️ [Apple Login]: Firebase verify failed, attempting direct Apple JWT decode:", firebaseErr.message);

      // Fallback: standard Apple JWT decode
      try {
        const decoded = jwt.decode(tokenToVerify) as any;
        if (decoded) {
          if (!appleId && decoded.sub) appleId = decoded.sub;
          if (decoded.email && !email) email = decoded.email.toLowerCase().trim();
        }
      } catch {
        // proceed with appleId if available
      }

      if (!appleId && !email) {
        throw new AppError(firebaseErr.message || "Invalid or expired Apple credentials.", 401);
      }
    }
  }

  if (!appleId && !firebaseUid && !email) {
    throw new AppError("Apple ID or valid Firebase ID token is required.", 400);
  }

  let user = null;
  if (firebaseUid) {
    user = await prisma.user.findFirst({ where: { firebaseUid } });
  }
  if (!user && appleId) {
    user = await prisma.user.findFirst({ where: { appleId } });
  }
  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (user) {
    if (user.status === "blocked") {
      throw new AppError(
        "Your account has been suspended. Please contact customer support.",
        403
      );
    }
    if (user.status === "inactive") {
      throw new AppError(
        "Your account is currently inactive. Please contact customer support.",
        403
      );
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        appleId: user.appleId || appleId,
        firebaseUid: user.firebaseUid || firebaseUid,
        name: name || user.name,
        fcmToken: payload.fcmToken ? payload.fcmToken.trim() : user.fcmToken,
        isVerified: true,
      },
    });
  } else {
    const fallbackEmail = email || `${appleId || firebaseUid}@privaterelay.apple.com`;

    user = await prisma.user.create({
      data: {
        name: name || "Apple User",
        email: fallbackEmail,
        appleId: appleId || firebaseUid,
        firebaseUid,
        fcmToken: payload.fcmToken ? payload.fcmToken.trim() : null,
        authProvider: "apple",
        isVerified: true,
        status: "active",
        role: "user",
      },
    });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

/**
 * 7. Forgot Password (Step 1: Generate & Send OTP)
 */
const forgotPassword = async (payload: IForgotPassword) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(
      "No account found with this email address. Please check your email and try again.",
      404,
    );
  }

  if (user.status === "blocked" || user.status === "inactive") {
    throw new AppError(
      `Your account is currently ${user.status}. Please contact support.`,
      403,
    );
  }

  if (!user.password) {
    const provider = user.authProvider === "google" ? "Google" : "Apple";
    throw new AppError(
      `This account is registered with ${provider} sign-in. Password reset is not available.`,
      400,
    );
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Invalidate any old forgot-password OTPs
  await prisma.otp.deleteMany({
    where: { email: normalizedEmail, type: "FORGOT_PASSWORD" },
  });

  await prisma.otp.create({
    data: {
      email: normalizedEmail,
      otp,
      type: "FORGOT_PASSWORD",
      expiresAt,
    },
  });

  // Send Email
  const template = passwordResetTemplate({ name: user.name, otp });
  await sendEmail({
    to: normalizedEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return {
    message: "A password reset code (OTP) has been sent to your email address.",
    email: normalizedEmail,
  };
};

/**
 * 8. Verify Forgot Password OTP (Step 2: Exchange for Reset Token)
 */
const verifyForgotOtp = async (payload: IVerifyOtp) => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const inputOtp = payload.otp.trim();

  const otpRecord = await prisma.otp.findFirst({
    where: {
      email: normalizedEmail,
      otp: inputOtp,
      type: "FORGOT_PASSWORD",
    },
  });

  if (!otpRecord) {
    throw new AppError(
      "Invalid reset code. Please check your email or request a new code.",
      400,
    );
  }

  if (otpRecord.expiresAt < new Date()) {
    await prisma.otp.delete({ where: { id: otpRecord.id } });
    throw new AppError(
      "Reset code has expired. Please request a new code.",
      400,
    );
  }

  // Invalidate verified OTP
  await prisma.otp.delete({ where: { id: otpRecord.id } });

  // Generate short-lived reset token (valid for 15 minutes)
  const resetToken = jwt.sign(
    { email: normalizedEmail, purpose: "reset-password" },
    config.jwt.secret as Secret,
    { expiresIn: "15m" },
  );

  return {
    message: "Code verified successfully. You may now reset your password.",
    email: normalizedEmail,
    resetToken,
  };
};

/**
 * 9. Reset Password (Step 3: Update Password with Reset Token or OTP)
 */
const resetPassword = async (payload: IResetPassword) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  // Validate either resetToken or direct OTP
  if (payload.resetToken) {
    try {
      const decoded = jwt.verify(
        payload.resetToken,
        config.jwt.secret as Secret,
      ) as any;
      if (
        decoded.email !== normalizedEmail ||
        decoded.purpose !== "reset-password"
      ) {
        throw new AppError("Invalid or expired password reset token.", 400);
      }
    } catch {
      throw new AppError(
        "Invalid or expired password reset token. Please restart the forgot password process.",
        400,
      );
    }
  } else if (payload.otp) {
    const otpRecord = await prisma.otp.findFirst({
      where: {
        email: normalizedEmail,
        otp: payload.otp.trim(),
        type: "FORGOT_PASSWORD",
      },
    });

    if (!otpRecord) {
      throw new AppError(
        "Invalid reset code. Please verify and try again.",
        400,
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      await prisma.otp.delete({ where: { id: otpRecord.id } });
      throw new AppError(
        "Reset code has expired. Please request a new code.",
        400,
      );
    }

    await prisma.otp.delete({ where: { id: otpRecord.id } });
  } else {
    throw new AppError("A valid reset token or OTP code is required.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError("No account found with this email address.", 404);
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.password_salt),
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message:
      "Password has been successfully reset. You can now log in with your new password.",
  };
};

/**
 * 10. Change Password (Authenticated User)
 */
const changePassword = async (userId: string, payload: IChangePassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  if (user.password) {
    const isPasswordMatched = await bcrypt.compare(
      payload.oldPassword,
      user.password,
    );

    if (!isPasswordMatched) {
      throw new AppError(
        "Current password does not match. Please verify and try again.",
        400,
      );
    }
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.password_salt),
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: newHashedPassword,
    },
  });

  return { message: "Password updated successfully." };
};

/**
 * 11. Refresh Token
 */
const refreshToken = async (token: string) => {
  if (!token) {
    throw new AppError("Refresh token is required.", 400);
  }

  let decoded: JwtPayload & { id: string; email: string; role: string };
  try {
    try {
      decoded = jwt.verify(
        token,
        config.jwt.refresh_secret as Secret
      ) as JwtPayload & {
        id: string;
        email: string;
        role: string;
      };
    } catch {
      // Fallback for tokens signed with main secret
      decoded = jwt.verify(
        token,
        config.jwt.secret as Secret
      ) as JwtPayload & {
        id: string;
        email: string;
        role: string;
      };
    }
  } catch {
    throw new AppError("Invalid or expired token. Please log in again.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  if (user.status === "blocked" || user.status === "inactive") {
    throw new AppError(`Your account is currently ${user.status}.`, 403);
  }

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const AuthService = {
  registerUser,
  verifyRegistrationOtp,
  resendOtp,
  loginUser,
  googleLogin,
  appleLogin,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
  changePassword,
  refreshToken,
};
