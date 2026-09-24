export type TDesignType = "UPLOADED" | "AI_GENERATED";
export type TMediaType = "IMAGE" | "VIDEO" | "MUSIC" | "AUDIO";
export type TDesignTab = "all" | "generated" | "uploaded" | "video" | "music";

export interface IUploadDesignPayload {
  title?: string;
  type?: TDesignType;
  mediaType?: TMediaType;
  prompt?: string;
  duration?: number;
}

export interface IUpdateDesignPayload {
  title?: string;
}

export interface IDesignFilterOptions {
  tab?: string;
  type?: TDesignType;
  mediaType?: TMediaType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IDesignStats {
  totalDesigns: number;
  counts: {
    all: number;
    generated: number;
    uploaded: number;
    video: number;
    music: number;
  };
}


