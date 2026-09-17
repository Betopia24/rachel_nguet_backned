export type TDesignType = "UPLOADED" | "AI_GENERATED";

export interface IUploadDesignPayload {
  title?: string;
  type?: TDesignType;
  prompt?: string;
}

export interface IDesignFilterOptions {
  type?: TDesignType;
  page?: number;
  limit?: number;
}
