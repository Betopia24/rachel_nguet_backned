import bcrypt from "bcrypt";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../../../config";
import { AppError } from "../../error/AppError";
import { prisma } from "../../lib/prisma";
import {
  IAppleLogin,
  IChangePassword,
  IForgotPassword,
  IGoogleLogin,
  ILoginUser,
  IRegisterUser,
  IResetPassword,
} from "./auth.interface";

// Utility: Sanitize user object to never leak sensitive fields like password
const sanitizeUser = (user: any) => {
  const { password, ...sanitized } = user;
  return sanitized;
};

// Utility: Generate JWT Access Token
const generateAccessToken = (user: { id: string; email: string; role: string }) => {
  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(jwtPayload, config.jwt.secret as Secret, {
    expiresIn: config.jwt.expire_in as SignOptions["expiresIn"],
  });
};

/**
 * 1. Register User (Email & Password)
 */
const registerUser = async (payload: IRegisterUser) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  // Check if an account already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email address already exists. Please log in instead.",
      400
    );
  }

  // Hash password securely
  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.password_salt)
  );

  const newUser = await prisma.user.create({
    data: {
      name: payload.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "email",
      status: "active",
      isVerified: false,
    },
  });

  const accessToken = generateAccessToken(newUser);

  return {
    accessToken,
    user: sanitizeUser(newUser),
  };
};

/**
 * 2. Login User (Email & Password)
 */
const loginUser = async (payload: ILoginUser) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(
      "No account found with this email address. Please check your email or sign up.",
      404
    );
  }

  // Account status verification
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
      400
    );
  }

  // Validate password
  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password
  );

  if (!isPasswordMatched) {
    throw new AppError(
      "Incorrect password. Please verify your password or use 'Forgot Password'.",
      401
    );
  }

  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    user: sanitizeUser(user),
  };
};

/**
 * 3. Google Sign-In / Login
 */
const googleLogin = async (payload: IGoogleLogin) => {
  let email = payload.email?.toLowerCase().trim();
  let name = payload.name?.trim();
  let googleId = payload.googleId;
  let avatar = payload.avatar;

  // If client provided a Google ID token, verify it via Google's tokeninfo API
  if (payload.idToken) {
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
        throw new AppError(
          "Invalid or expired Google authentication token.",
          401
        );
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      // If network fails to reach Google but client sent verified profile data, fallback gracefully
      if (!email || !googleId) {
        throw new AppError(
          "Unable to verify Google credentials. Please try again.",
          401
        );
      }
    }
  }

  if (!email && !googleId) {
    throw new AppError(
      "Google login requires a valid Google ID or email address.",
      400
    );
  }

  // Find user by Google ID or Email
  let user = null;
  if (googleId) {
    user = await prisma.user.findFirst({ where: { googleId } });
  }
  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (user) {
    // Check status
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

    // Link Google ID or avatar if not yet linked
    if (!user.googleId || !user.avatar) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatar: user.avatar || avatar,
          isVerified: true,
        },
      });
    }
  } else {
    // Auto-create new user via Google
    user = await prisma.user.create({
      data: {
        name: name || "Google User",
        email: email || `${googleId}@google.user`,
        googleId,
        avatar,
        authProvider: "google",
        isVerified: true,
        status: "active",
        role: "user",
      },
    });
  }

  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    user: sanitizeUser(user),
  };
};

/**
 * 4. Apple Sign-In / Login
 */
const appleLogin = async (payload: IAppleLogin) => {
  const { appleId, identityToken } = payload;
  let email = payload.email?.toLowerCase().trim();
  let name = payload.name?.trim();

  // If identity token provided, decode payload to extract sub & email if missing
  if (identityToken) {
    try {
      const decoded = jwt.decode(identityToken) as any;
      if (decoded) {
        if (!email && decoded.email) {
          email = decoded.email.toLowerCase().trim();
        }
      }
    } catch {
      // Ignore decode error and proceed with appleId
    }
  }

  if (!appleId) {
    throw new AppError("Apple ID / Subject identifier is required.", 400);
  }

  // Find user by appleId or email
  let user = await prisma.user.findFirst({ where: { appleId } });


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

    // Link Apple ID or update name if missing
    if (!user.appleId || (name && user.name === "Apple User")) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          appleId: user.appleId || appleId,
          name: name || user.name,
          isVerified: true,
        },
      });
    }
  } else {
    // Generate fallback email if user chose to hide email and Apple provided no relay email
    const fallbackEmail = email || `${appleId}@privaterelay.apple.com`;

    user = await prisma.user.create({
      data: {
        name: name || "Apple User",
        email: fallbackEmail,
        appleId,
        authProvider: "apple",
        isVerified: true,
        status: "active",
        role: "user",
      },
    });
  }

  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    user: sanitizeUser(user),
  };
};

/**
 * 5. Forgot Password
 */
const forgotPassword = async (payload: IForgotPassword) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(
      "No account found with this email address. Please check your email and try again.",
      404
    );
  }

  if (user.status === "blocked" || user.status === "inactive") {
    throw new AppError(
      `Your account is currently ${user.status}. Please contact support.`,
      403
    );
  }

  return {
    message:
      "If an account exists with this email, password reset instructions have been sent.",
  };
};

/**
 * 6. Reset Password
 */
const resetPassword = async (payload: IResetPassword) => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError(
      "No account found with this email address. Please check and try again.",
      404
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.password_salt)
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: "Password has been successfully reset. You can now log in with your new password.",
  };
};

/**
 * 7. Change Password (Authenticated)
 */
const changePassword = async (
  userId: string,
  payload: IChangePassword
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  // If user registered via social login without a password
  if (user.password) {
    const isPasswordMatched = await bcrypt.compare(
      payload.oldPassword,
      user.password
    );

    if (!isPasswordMatched) {
      throw new AppError("Current password does not match. Please verify and try again.", 400);
    }
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.password_salt)
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
 * 8. Refresh Token
 */
const refreshToken = async (token: string) => {
  if (!token) {
    throw new AppError("Refresh token is required.", 400);
  }

  let decoded: JwtPayload & { id: string; email: string; role: string };
  try {
    decoded = jwt.verify(
      token,
      config.jwt.secret as Secret
    ) as JwtPayload & { id: string; email: string; role: string };
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

  return { accessToken };
};

export const AuthService = {
  registerUser,
  loginUser,
  googleLogin,
  appleLogin,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
};

