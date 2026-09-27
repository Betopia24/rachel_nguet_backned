import { z } from "zod";

const generateImageValidationSchema = z.object({
  body: z.object({
    prompt: z
      .string({
        required_error: "Prompt is required.",
      })
      .trim()
      .min(3, "Prompt must be at least 3 characters long."),
    aspect_ratio: z.enum(["1:1", "16:9", "9:16"]).default("1:1").optional(),
    number_of_images: z
      .number({
        invalid_type_error: "number_of_images must be an integer between 1 and 4.",
      })
      .int()
      .min(1, "Number of images must be at least 1.")
      .max(4, "Number of images cannot exceed 4.")
      .default(1)
      .optional(),
    title: z.string().trim().optional(),
    saveToDesigns: z.boolean().default(false).optional(),
  }),
});

const textToVideoValidationSchema = z.object({
  body: z.object({
    prompt: z
      .string({
        required_error: "Prompt is required.",
      })
      .trim()
      .min(3, "Prompt must be at least 3 characters long."),
    duration_seconds: z
      .number({
        invalid_type_error: "duration_seconds must be a number between 4 and 8.",
      })
      .int()
      .min(4, "Duration must be at least 4 seconds.")
      .max(8, "Duration cannot exceed 8 seconds.")
      .default(5)
      .optional(),
    aspect_ratio: z.enum(["16:9", "9:16"]).default("16:9").optional(),
    title: z.string().trim().optional(),
    saveToDesigns: z.boolean().default(false).optional(),
  }),
});

const imageToVideoValidationSchema = z.object({
  body: z.object({
    prompt: z
      .string({
        required_error: "Prompt is required.",
      })
      .trim()
      .min(3, "Prompt must be at least 3 characters long."),
    duration_seconds: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => (val !== undefined ? Number(val) : 5))
      .refine((val) => val >= 4 && val <= 8, {
        message: "Duration must be between 4 and 8 seconds.",
      }),
    aspect_ratio: z
      .string()
      .optional()
      .transform((val) => val || "16:9")
      .refine((val) => ["16:9", "9:16"].includes(val), {
        message: "Aspect ratio must be either '16:9' or '9:16'.",
      }),
    title: z.string().trim().optional(),
    saveToDesigns: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((val) => val === true || val === "true"),
  }),
});

const textToMusicValidationSchema = z.object({
  body: z
    .object({
      mode: z.enum(["prompt", "lyrics"], {
        required_error: "Music generation mode is required ('prompt' or 'lyrics').",
      }),
      song_name: z.string().trim().optional().nullable(),
      prompt: z.string().trim().optional().nullable(),
      lyrics: z.string().trim().optional().nullable(),
      style: z.string().trim().optional().nullable(),
      instrumental: z.boolean().default(false).optional(),
      saveToDesigns: z.boolean().default(false).optional(),
    })
});

const enhanceAudioValidationSchema = z.object({
  body: z.object({
    prompt: z
      .string({
        required_error: "Enhancement instructions (prompt) are required.",
      })
      .trim()
      .min(3, "Prompt must be at least 3 characters long."),
    title: z.string().trim().optional(),
    saveToDesigns: z
      .union([z.string(), z.boolean()])
      .optional()
      .transform((val) => val === true || val === "true"),
  }),
});

const saveCreationValidationSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: "Title is required.",
      })
      .trim()
      .min(1, "Title cannot be empty."),
    mediaUrl: z
      .string({
        required_error: "mediaUrl is required.",
      })
      .url("mediaUrl must be a valid URL."),
    mediaType: z.enum(["IMAGE", "VIDEO", "MUSIC", "AUDIO"], {
      required_error: "mediaType is required ('IMAGE', 'VIDEO', 'MUSIC', 'AUDIO').",
    }),
    publicId: z.string().optional(),
    fileSize: z.number().int().positive().optional(),
    mimeType: z.string().optional(),
    prompt: z.string().optional(),
    duration: z.number().int().positive().optional(),
  }),
});

export const AIValidation = {
  generateImageValidationSchema,
  textToVideoValidationSchema,
  imageToVideoValidationSchema,
  textToMusicValidationSchema,
  enhanceAudioValidationSchema,
  saveCreationValidationSchema,
};
