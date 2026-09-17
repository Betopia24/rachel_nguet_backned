import { z } from "zod";

const uploadDesignValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    type: z.enum(["UPLOADED", "AI_GENERATED"]).optional(),
    prompt: z.string().optional(),
  }),
});

export const DesignValidation = {
  uploadDesignValidationSchema,
};
