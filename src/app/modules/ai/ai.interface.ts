export type TAspectRatio = "1:1" | "16:9" | "9:16";
export type TMusicMode = "prompt" | "lyrics";
export type TMediaType = "IMAGE" | "VIDEO" | "MUSIC" | "AUDIO";

// ==========================================
// 1. Image Generation Types
// ==========================================
export interface IGenerateImagePayload {
  prompt: string;
  aspect_ratio?: TAspectRatio;
  number_of_images?: number;
  title?: string;
  saveToDesigns?: boolean;
}

export interface IGeneratedImageItem {
  /** 1-based position within the request (stays stable even if others failed). */
  index?: number;
  bucket: string;
  key: string;
  s3_uri: string;
  /** Full-resolution image. */
  url: string;
  /** ~720px WebP preview; null if thumbnail creation failed. */
  thumbnail_url?: string | null;
  thumbnail_key?: string | null;
}

export interface IFailedImageItem {
  index: number;
  status_code: number;
  code: string;
  message: string;
}

export interface IGenerateImageResponse {
  /** "completed" = all images ok, "partial" = some failed. */
  status: string;
  prompt: string;
  final_prompt?: string;
  model?: string;
  requested?: number;
  images: IGeneratedImageItem[];
  failed?: IFailedImageItem[];
  /** Shared by every image of this request (and by every saved design). */
  generationId?: string;
  partial?: boolean;
  savedDesigns?: any[];
}

// ==========================================
// 2. Video Generation Types
// ==========================================
export interface ITextToVideoPayload {
  prompt: string;
  duration_seconds?: number;
  aspect_ratio?: "16:9" | "9:16";
  title?: string;
  saveToDesigns?: boolean;
}

export interface IImageToVideoPayload {
  prompt: string;
  duration_seconds?: number;
  aspect_ratio?: "16:9" | "9:16";
  title?: string;
  saveToDesigns?: boolean;
}

export interface IVideoResult {
  bucket?: string;
  key?: string;
  s3_uri?: string;
  url?: string;
  [key: string]: any;
}

export interface IGenerateVideoResponse {
  status: string;
  prompt: string;
  final_prompt?: string;
  model?: string;
  duration_seconds?: number;
  aspect_ratio?: string;
  video?: IVideoResult;
  videos?: IVideoResult[];
  savedDesign?: any;
  [key: string]: any;
}

// ==========================================
// 3. Music Generation Types
// ==========================================
export interface ITextToMusicPayload {
  mode: TMusicMode;
  prompt?: string;
  lyrics?: string;
  song_name?: string;
  style?: string | string[] | null;
  instrumental?: boolean;
  saveToDesigns?: boolean;
}

export interface IMusicAudioItem {
  bucket: string;
  key: string;
  s3_uri: string;
  url: string;
}

export interface IGenerateMusicResponse {
  status: string;
  source_type?: string;
  mode: TMusicMode;
  song_name?: string;
  style?: string | string[] | null;
  instrumental?: boolean;
  refined_by_openai?: boolean;
  estimated_duration_seconds?: number;
  final_prompt?: string;
  composition_plan?: any;
  audio?: IMusicAudioItem;
  savedDesign?: any;
  [key: string]: any;
}

// ==========================================
// 4. Audio Enhancement Types
// ==========================================
export interface IEnhanceAudioPayload {
  prompt: string;
  title?: string;
  saveToDesigns?: boolean;
}

export interface IEnhanceAudioResponse {
  status: string;
  audio?: IMusicAudioItem;
  savedDesign?: any;
  [key: string]: any;
}

// ==========================================
// 5. Save Creation To Designs
// ==========================================
export interface ISaveCreationPayload {
  title: string;
  mediaUrl: string;
  mediaType: TMediaType;
  publicId?: string;
  fileSize?: number;
  mimeType?: string;
  prompt?: string;
  duration?: number;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  generationId?: string;
  generationIndex?: number;
}
