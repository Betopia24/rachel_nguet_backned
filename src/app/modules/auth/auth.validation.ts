import { z } from "zod";

const registerValidationSchema = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: "Full name is required" })
        .min(2, "Name must be at least 2 characters")
        .trim(),
      email: z
        .string({ required_error: "Email address is required" })
        .email("Please provide a valid email address")
        .toLowerCase()
        .trim(),
      password: z
        .string({ required_error: "Password is required" })
        .min(6, "Password must be at least 6 characters long"),
      confirmPassword: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.confirmPassword !== undefined && data.confirmPassword !== "") {
          return data.password === data.confirmPassword;
        }
        return true;
      },
      {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }
    ),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email address is required" })
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required"),
  }),
});

const googleLoginValidationSchema = z.object({
  body: z
    .object({
      idToken: z.string().optional(),
      googleId: z.string().optional(),
      email: z.string().email("Please provide a valid email address").optional(),
      name: z.string().optional(),
      avatar: z.string().optional(),
    })
    .refine((data) => data.idToken || (data.email && data.googleId), {
      message: "Either Google ID token or email and Google ID must be provided",
      path: ["idToken"],
    }),
});

const appleLoginValidationSchema = z.object({
  body: z.object({
    appleId: z.string({ required_error: "Apple ID / Sub is required" }),
    identityToken: z.string().optional(),
    email: z.string().email("Invalid email format").optional().or(z.literal("")),
    name: z.string().optional(),
  }),
});

const forgotPasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email address is required" })
      .email("Please provide a valid email address")
      .toLowerCase()
      .trim(),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z
    .object({
      email: z
        .string({ required_error: "Email address is required" })
        .email("Please provide a valid email address")
        .toLowerCase()
        .trim(),
      newPassword: z
        .string({ required_error: "New password is required" })
        .min(6, "New password must be at least 6 characters long"),
      confirmPassword: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.confirmPassword !== undefined && data.confirmPassword !== "") {
          return data.newPassword === data.confirmPassword;
        }
        return true;
      },
      {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }
    ),
});

const changePasswordValidationSchema = z.object({
  body: z
    .object({
      oldPassword: z.string({ required_error: "Current password is required" }),
      newPassword: z
        .string({ required_error: "New password is required" })
        .min(6, "New password must be at least 6 characters long"),
      confirmPassword: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.confirmPassword !== undefined && data.confirmPassword !== "") {
          return data.newPassword === data.confirmPassword;
        }
        return true;
      },
      {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }
    ),
});

const refreshTokenValidationSchema = z.object({
  cookies: z
    .object({
      refreshToken: z.string({ required_error: "Refresh token is required" }),
    })
    .optional(),
  body: z
    .object({
      token: z.string().optional(),
    })
    .optional(),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  googleLoginValidationSchema,
  appleLoginValidationSchema,
  forgotPasswordValidationSchema,
  resetPasswordValidationSchema,
  changePasswordValidationSchema,
  refreshTokenValidationSchema,
};

