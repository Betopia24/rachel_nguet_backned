export type TDesignType = "UPLOADED" | "AI_GENERATED";
export type TMediaType = "IMAGE" | "VIDEO" | "MUSIC" | "AUDIO";

export interface IUploadDesignPayload {
  title?: string;
  type?: TDesignType;
  mediaType?: TMediaType;
  prompt?: string;
  duration?: number;
}

export interface IDesignFilterOptions {
  type?: TDesignType;
  mediaType?: TMediaType;
  search?: string;
  page?: number;
  limit?: number;
}

