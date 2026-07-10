import type {
  AiJobStatus,
  AiProvider,
  CreateJobInput,
  CreateJobResult,
  JobStatusResult,
} from "./types";

import { createSafeServerErrorMessage } from "@/lib/server-error";

function createFallbackJobId() {
  return `kie_pending_${Date.now().toString(36)}`;
}

const KIE_BASE_URL = process.env.KIE_BASE_URL || "https://api.kie.ai";

type KieCreateTaskResponse = {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
  };
};

type KieRecordInfoResponse = {
  code?: number;
  msg?: string;
  data?: {
    taskId?: string;
    state?: "waiting" | "queuing" | "generating" | "success" | "fail" | string;
    resultJson?: string;
    failMsg?: string;
    progress?: number;
  };
};

function resolveImageModel(input: CreateJobInput) {
  if (input.model) {
    return input.model;
  }

  return input.jobType === "image_to_image"
    ? "gpt-image-2-image-to-image"
    : "gpt-image-2-text-to-image";
}

function buildKiePayload(input: CreateJobInput) {
  const model = resolveImageModel(input);

  const payload = {
    model,
    callBackUrl: input.callbackUrl,
    input: {
      prompt: input.prompt,
      aspect_ratio: "auto",
      ...(input.inputImageUrls?.length
        ? { input_urls: input.inputImageUrls }
        : {}),
    },
  };

  return payload;
}

function normalizeKieState(state?: string): AiJobStatus {
  if (state === "success") {
    return "succeeded";
  }
  if (state === "fail") {
    return "failed";
  }
  if (state === "generating" || state === "queuing") {
    return "running";
  }
  return "queued";
}

function parseResultUrls(resultJson?: string) {
  if (!resultJson) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(resultJson) as {
      resultUrls?: string[];
      urls?: string[];
      images?: string[];
    };

    return parsed.resultUrls || parsed.urls || parsed.images;
  } catch {
    return undefined;
  }
}

export const kieProvider: AiProvider = {
  name: "kie",
  async createJob(input: CreateJobInput): Promise<CreateJobResult> {
    if (!process.env.KIE_API_KEY) {
      const model =
        input.jobType === "text_to_image" || input.jobType === "image_to_image"
          ? resolveImageModel(input)
          : input.model || "待配置视频模型";

      return {
        jobId: createFallbackJobId(),
        provider: "kie",
        model,
        jobType: input.jobType,
        status: "queued",
        message: "KIE_API_KEY 尚未配置，任务已进入待接入状态。",
        createdAt: new Date().toISOString(),
      };
    }

    if (input.jobType !== "text_to_image" && input.jobType !== "image_to_image") {
      return {
        jobId: createFallbackJobId(),
        provider: "kie",
        model: input.model || "待配置视频模型",
        jobType: input.jobType,
        status: "queued",
        message: "KIE 视频模型尚未在项目中确认，当前任务已保持待配置状态。",
        createdAt: new Date().toISOString(),
      };
    }

    const payload = buildKiePayload(input);
    const response = await fetch(`${KIE_BASE_URL}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.KIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => ({}))) as KieCreateTaskResponse;
    const taskId = json.data?.taskId;

    if (!response.ok || !taskId) {
      return {
        jobId: createFallbackJobId(),
        provider: "kie",
        model: payload.model,
        jobType: input.jobType,
        status: "failed",
        message: createSafeServerErrorMessage("KIE 创建任务"),
        createdAt: new Date().toISOString(),
      };
    }

    return {
      jobId: taskId,
      provider: "kie",
      model: payload.model,
      jobType: input.jobType,
      status: "queued",
      message: "KIE 任务已提交，等待回调或轮询结果。",
      providerJobId: taskId,
      createdAt: new Date().toISOString(),
    };
  },

  async getJobStatus(providerJobId: string): Promise<JobStatusResult> {
    if (!process.env.KIE_API_KEY) {
      return {
        provider: "kie",
        providerJobId,
        status: "queued",
        message: "KIE_API_KEY 尚未配置，无法查询真实任务状态。",
        updatedAt: new Date().toISOString(),
      };
    }

    const url = new URL(`${KIE_BASE_URL}/api/v1/jobs/recordInfo`);
    url.searchParams.set("taskId", providerJobId);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.KIE_API_KEY}`,
      },
    });

    const json = (await response.json().catch(() => ({}))) as KieRecordInfoResponse;
    const data = json.data;

    if (!response.ok || !data) {
      return {
        provider: "kie",
        providerJobId,
        status: "failed",
        message: createSafeServerErrorMessage("KIE 查询任务"),
        raw: json,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      provider: "kie",
      providerJobId,
      status: normalizeKieState(data.state),
      message:
        normalizeKieState(data.state) === "failed"
          ? "KIE 任务失败，请在模型平台查看详情。"
          : "KIE 任务状态已更新。",
      progress: data.progress,
      resultUrls: parseResultUrls(data.resultJson),
      raw: json,
      updatedAt: new Date().toISOString(),
    };
  },
};
