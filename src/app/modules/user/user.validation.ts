import { z } from "zod";

const updateProfileValidationSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      avatar: z.string().optional(),
      data: z.any().optional(),
    })
    .passthrough(),
});


const updateUserStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(["active", "inactive", "blocked"]).optional(),
    role: z.enum(["user", "admin"]).optional(),
  }),
});

const updateFcmTokenValidationSchema = z.object({
  body: z.object({
    fcmToken: z.string({ required_error: "fcmToken is required" }),
  }),
});

export const UserValidation = {
  updateProfileValidationSchema,
  updateUserStatusValidationSchema,
  updateFcmTokenValidationSchema,
};
