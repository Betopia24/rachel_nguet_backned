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
  bucket: string;
  key: string;
  s3_uri: string;
  url: string;
}

export interface IGenerateImageResponse {
  status: string;
  prompt: string;
  final_prompt?: string;
  model?: string;
  images: IGeneratedImageItem[];
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
}
