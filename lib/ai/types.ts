export type AiJobType =
  | "text_generation"
  | "image_understanding"
  | "text_to_image"
  | "image_to_image"
  | "image_to_video"
  | "video_generation"
  | "long_video_generation"
  | "video_render"
  | "copywriting";

export type AiJobStatus =
  | "pending"
  | "queued"
  | "submitting"
  | "running"
  | "persisting"
  | "retrying"
  | "succeeded"
  | "failed"
  | "canceled";

export type CreateJobInput = {
  provider?: string;
  model?: string;
  jobType: AiJobType;
  prompt: string;
  projectId?: string;
  inputImageUrls?: string[];
  selectedProducts?: string[];
  styleName?: string;
  callbackUrl?: string;
  ownerId?: string | null;
  localJobId?: string;
  idempotencyKey?: string;
  inputAssetIds?: string[];
  modelRouteKey?: string;
  modelRouteSource?: string;
  modelRouteParams?: Record<string, unknown>;
};

export type CreateJobResult = {
  jobId: string;
  provider: string;
  model: string;
  jobType: AiJobType;
  status: AiJobStatus;
  message: string;
  previewUrl?: string;
  resultUrls?: string[];
  providerJobId?: string;
  providerMetadata?: Record<string, unknown>;
  textOutput?: string;
  structuredOutput?: Record<string, unknown>;
  outputAssetIds?: string[];
  outputAssets?: Array<{
    id: string;
    kind: string;
    title: string | null;
    url: string | null;
  }>;
  createdAt: string;
};

export type AiWorkerRunResult = {
  workerId: string;
  claimed: number;
  succeeded: number;
  deferred: number;
  retrying: number;
  failed: number;
};

export type JobStatusResult = {
  provider: string;
  providerJobId: string;
  status: AiJobStatus;
  message: string;
  progress?: number;
  resultUrls?: string[];
  raw?: unknown;
  updatedAt: string;
};

export type AiProvider = {
  name: string;
  createJob(input: CreateJobInput): Promise<CreateJobResult>;
  getJobStatus?(providerJobId: string): Promise<JobStatusResult>;
};
