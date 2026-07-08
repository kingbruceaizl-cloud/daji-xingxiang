export type AiJobType =
  | "text_to_image"
  | "image_to_image"
  | "image_to_video"
  | "video_render"
  | "copywriting";

export type AiJobStatus = "queued" | "running" | "succeeded" | "failed";

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
};

export type CreateJobResult = {
  jobId: string;
  provider: string;
  model: string;
  jobType: AiJobType;
  status: AiJobStatus;
  message: string;
  previewUrl?: string;
  providerJobId?: string;
  createdAt: string;
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
