import { publicImages } from "@/lib/demo-data";
import type { AiProvider, CreateJobInput, CreateJobResult } from "./types";

function createReadableId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const mockProvider: AiProvider = {
  name: "mock",
  async createJob(input: CreateJobInput): Promise<CreateJobResult> {
    const isVideo = input.jobType === "image_to_video" || input.jobType === "video_render";
    const inputImageUrl = input.inputImageUrls?.[0];

    return {
      jobId: createReadableId("dj_job"),
      provider: input.provider || "mock",
      model: input.model || (isVideo ? "mock-video-v1" : "mock-image-v1"),
      jobType: input.jobType,
      status: "succeeded",
      message: isVideo
        ? "演示视频任务已生成。接入真实模型通道后会返回视频地址。"
        : inputImageUrl
          ? "演示形象图已基于客户素材生成。接入真实模型通道后会返回换装后的新图片。"
          : "演示形象图已生成。接入真实模型通道后会返回生成图片。",
      previewUrl: isVideo ? publicImages.flatlay : inputImageUrl || publicImages.portrait,
      providerJobId: createReadableId("mock"),
      createdAt: new Date().toISOString(),
    };
  },
};
