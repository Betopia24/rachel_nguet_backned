import type { Design } from "@prisma/client";

/**
 * Shape of a design as returned to the app.
 *
 * - `imageUrl`      always the full-resolution file (unchanged, backwards compatible)
 * - `thumbnailUrl`  small WebP preview for lists/grids. For old IMAGE designs that
 *                   have no thumbnail yet it falls back to `imageUrl`, so the app can
 *                   always render `thumbnailUrl` for images without a null check.
 *                   Video/music never have one (null).
 * - `generationId`  shared by every image of one generation batch; null for single
 *                   uploads, videos and anything created before this field existed.
 */
export const serializeDesign = (design: Design) => ({
  ...design,
  thumbnailUrl:
    design.thumbnailUrl ?? (design.mediaType === "IMAGE" ? design.imageUrl : null),
  generationId: design.generationId ?? null,
  generationIndex: design.generationIndex ?? null,
});

export type TSerializedDesign = ReturnType<typeof serializeDesign>;
