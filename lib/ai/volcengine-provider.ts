import { AiServiceError } from "./errors";
import type {
  AiProvider,
  CreateJobInput,
  CreateJobResult,
  JobStatusResult,
} from "./types";

const DEFAULT_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-260128";

type ArkError = {
  code?: string;
  message?: string;
};

type ArkImageResult = {
  url?: string;
  b64_json?: string;
  size?: string;
};

type ArkImageResponse = {
  model?: string;
  created?: number;
  data?: ArkImageResult[];
  usage?: Record<string, unknown>;
  error?: ArkError;
};

type ArkResponseContent = {
  type?: string;
  text?: string;
};

type ArkResponsesResponse = {
  id?: string;
  model?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: ArkResponseContent[];
  }>;
  usage?: Record<string, unknown>;
  error?: ArkError;
};

type ArkVideoTask = {
  id?: string;
  model?: string;
  status?: string;
  error?: ArkError;
  content?: {
    video_url?: string;
    last_frame_url?: string;
    file_url?: string;
  };
  usage?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
  duration?: number;
  ratio?: string;
  resolution?: string;
};

function arkBaseConfig() {
  const apiKey = process.env.ARK_API_KEY?.trim();
  const baseUrl = (process.env.ARK_BASE_URL || DEFAULT_ARK_BASE_URL).replace(
    /\/$/,
    "",
  );

  if (!apiKey) {
    throw new AiServiceError(
      "AI_CONFIGURATION_ERROR",
      "火山方舟 API Key 尚未配置，真实模型调用已停止。",
      503,
    );
  }

  return { apiKey, baseUrl };
}

function requireModel(input: CreateJobInput, kind: "image" | "text" | "video") {
  const model =
    input.model?.trim() ||
    (kind === "image"
      ? process.env.ARK_IMAGE_MODEL_ID?.trim()
      : kind === "text"
        ? process.env.ARK_TEXT_MODEL_ID?.trim()
        : process.env.ARK_VIDEO_MODEL_ID?.trim());

  if (!model) {
    throw new AiServiceError(
      "AI_CONFIGURATION_ERROR",
      kind === "image"
        ? "火山方舟生图模型 ID 尚未配置，真实生图已停止。"
        : kind === "text"
          ? "火山方舟文字与视觉模型 ID 尚未配置，真实分析已停止。"
          : "火山方舟视频模型 ID 尚未配置，真实视频生成已停止。",
      503,
    );
  }

  return model;
}

function integerParam(
  params: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
) {
  const value = Number(params?.[key]);
  return Number.isInteger(value) ? value : fallback;
}

function stringParam(
  params: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
) {
  const value = params?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function booleanParam(
  params: Record<string, unknown> | undefined,
  key: string,
  fallback: boolean,
) {
  const value = params?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function safeProviderFailure(
  response: Response,
  json: { error?: ArkError },
  taskLabel: string,
) {
  if (response.status === 401 || response.status === 403) {
    return new AiServiceError(
      "AI_CONFIGURATION_ERROR",
      "火山方舟鉴权失败，请管理员检查 API Key 和模型权限。",
      503,
    );
  }

  if (response.status === 429) {
    return new AiServiceError(
      "AI_PROVIDER_REQUEST_FAILED",
      `${taskLabel}较多，请稍后重试。`,
      429,
    );
  }

  const providerCode = json.error?.code;
  const suffix = providerCode ? `（${providerCode}）` : "";
  return new AiServiceError(
    "AI_PROVIDER_REQUEST_FAILED",
    `火山方舟没有完成本次${taskLabel}${suffix}，请稍后重试。`,
    502,
  );
}

function buildImageRequest(input: CreateJobInput, model: string) {
  const images = input.inputImageUrls?.filter(Boolean) || [];
  const image = images.length === 1 ? images[0] : images.length ? images : undefined;

  return {
    model,
    prompt: input.prompt,
    ...(image ? { image } : {}),
    size: stringParam(input.modelRouteParams, "size", "2K"),
    sequential_image_generation: stringParam(
      input.modelRouteParams,
      "sequential_image_generation",
      "disabled",
    ),
    stream: false,
    response_format: "url",
    watermark: booleanParam(input.modelRouteParams, "watermark", false),
    ...(input.ownerId ? { user_id: input.ownerId } : {}),
  };
}

function responseText(json: ArkResponsesResponse) {
  if (typeof json.output_text === "string" && json.output_text.trim()) {
    return json.output_text.trim();
  }

  return (json.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" || typeof item.text === "string")
    .map((item) => item.text || "")
    .join("")
    .trim();
}

function parseStructuredOutput(value: string) {
  const normalized = value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function postArkJson<T>(input: {
  url: string;
  apiKey: string;
  body: Record<string, unknown>;
  taskLabel: string;
  timeoutMs: number;
}) {
  let response: Response;
  try {
    response = await fetch(input.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.body),
      signal: AbortSignal.timeout(input.timeoutMs),
    });
  } catch {
    throw new AiServiceError(
      "AI_PROVIDER_REQUEST_FAILED",
      `连接火山方舟${input.taskLabel}服务超时，请稍后重试。`,
      504,
    );
  }

  const json = (await response.json().catch(() => ({}))) as T & {
    error?: ArkError;
  };
  if (!response.ok) {
    throw safeProviderFailure(response, json, input.taskLabel);
  }

  return json;
}

async function getArkJson<T>(input: {
  url: string;
  apiKey: string;
  taskLabel: string;
  timeoutMs: number;
}) {
  let response: Response;
  try {
    response = await fetch(input.url, {
      headers: { Authorization: `Bearer ${input.apiKey}` },
      signal: AbortSignal.timeout(input.timeoutMs),
    });
  } catch {
    throw new AiServiceError(
      "AI_PROVIDER_REQUEST_FAILED",
      `连接火山方舟${input.taskLabel}服务超时，请稍后重试。`,
      504,
    );
  }

  const json = (await response.json().catch(() => ({}))) as T & {
    error?: ArkError;
  };
  if (!response.ok) {
    throw safeProviderFailure(response, json, input.taskLabel);
  }

  return json;
}

async function createStructuredJob(
  input: CreateJobInput,
): Promise<CreateJobResult> {
  const { apiKey, baseUrl } = arkBaseConfig();
  const model = requireModel(input, "text");
  const images = input.inputImageUrls?.filter(Boolean) || [];
  const responseSchema = input.modelRouteParams?.responseSchema;
  const responseName = stringParam(
    input.modelRouteParams,
    "responseName",
    "daji_structured_result",
  );
  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: input.prompt },
    ...images.map((imageUrl) => ({ type: "input_image", image_url: imageUrl })),
  ];
  const body: Record<string, unknown> = {
    model,
    input: [{ role: "user", content }],
    stream: false,
  };

  if (responseSchema && typeof responseSchema === "object") {
    body.text = {
      format: {
        type: "json_schema",
        name: responseName,
        schema: responseSchema,
        strict: true,
      },
    };
  }

  const json = await postArkJson<ArkResponsesResponse>({
    url: `${baseUrl}/responses`,
    apiKey,
    body,
    taskLabel: input.jobType === "image_understanding" ? "图片分析" : "方案生成",
    timeoutMs: 120_000,
  });
  const textOutput = responseText(json);
  const structuredOutput = parseStructuredOutput(textOutput);

  if (!textOutput || (responseSchema && !structuredOutput)) {
    throw new AiServiceError(
      "AI_PROVIDER_RESPONSE_INVALID",
      "火山方舟已返回内容，但结构化结果无法解析，请稍后重试。",
      502,
    );
  }

  return {
    jobId: input.localJobId || crypto.randomUUID(),
    provider: "volcengine",
    model: json.model || model,
    jobType: input.jobType,
    status: "succeeded",
    message:
      input.jobType === "image_understanding"
        ? "客户素材分析已完成。"
        : "结构化形象方案已生成。",
    textOutput,
    structuredOutput: structuredOutput || undefined,
    providerJobId: json.id,
    providerMetadata: { usage: json.usage },
    createdAt: new Date().toISOString(),
  };
}

async function createImageJob(input: CreateJobInput): Promise<CreateJobResult> {
  const { apiKey, baseUrl } = arkBaseConfig();
  const model = requireModel(input, "image");
  const json = await postArkJson<ArkImageResponse>({
    url: `${baseUrl}/images/generations`,
    apiKey,
    body: buildImageRequest(input, model),
    taskLabel: "生图任务",
    timeoutMs: 120_000,
  });
  const resultUrls = json.data?.map((item) => item.url).filter(Boolean) as
    | string[]
    | undefined;

  if (!resultUrls?.length) {
    throw new AiServiceError(
      "AI_PROVIDER_RESPONSE_INVALID",
      "火山方舟已返回结果，但没有可保存的图片地址。",
      502,
    );
  }

  return {
    jobId: input.localJobId || crypto.randomUUID(),
    provider: "volcengine",
    model: json.model || model || DEFAULT_IMAGE_MODEL,
    jobType: input.jobType,
    status: "succeeded",
    message: "形象图片已生成，正在保存到大吉形象素材库。",
    previewUrl: resultUrls[0],
    resultUrls,
    providerMetadata: {
      created: json.created,
      usage: json.usage,
    },
    createdAt: new Date().toISOString(),
  };
}

function buildVideoRequest(input: CreateJobInput, model: string) {
  const images = input.inputImageUrls?.filter(Boolean) || [];
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: input.prompt },
    ...images.map((imageUrl, index) => ({
      type: "image_url",
      image_url: { url: imageUrl },
      role: stringParam(
        input.modelRouteParams,
        "imageRole",
        index === 0 ? "first_frame" : "reference_image",
      ),
    })),
  ];

  return {
    model,
    content,
    return_last_frame: booleanParam(
      input.modelRouteParams,
      "returnLastFrame",
      true,
    ),
    generate_audio: booleanParam(
      input.modelRouteParams,
      "generateAudio",
      true,
    ),
    camera_fixed: booleanParam(
      input.modelRouteParams,
      "cameraFixed",
      false,
    ),
    watermark: booleanParam(input.modelRouteParams, "watermark", false),
    resolution: stringParam(input.modelRouteParams, "resolution", "720p"),
    ratio: stringParam(input.modelRouteParams, "ratio", "9:16"),
    duration: integerParam(input.modelRouteParams, "duration", 13),
    ...(input.ownerId ? { safety_identifier: input.ownerId } : {}),
  };
}

async function createVideoJob(input: CreateJobInput): Promise<CreateJobResult> {
  const { apiKey, baseUrl } = arkBaseConfig();
  const model = requireModel(input, "video");
  const json = await postArkJson<ArkVideoTask>({
    url: `${baseUrl}/contents/generations/tasks`,
    apiKey,
    body: buildVideoRequest(input, model),
    taskLabel: "视频生成",
    timeoutMs: 60_000,
  });

  if (!json.id) {
    throw new AiServiceError(
      "AI_PROVIDER_RESPONSE_INVALID",
      "火山方舟已接收视频请求，但没有返回可恢复的任务编号。",
      502,
    );
  }

  return {
    jobId: input.localJobId || crypto.randomUUID(),
    provider: "volcengine",
    model: json.model || model,
    jobType: input.jobType,
    status: "queued",
    message: "变装视频已提交，后台会持续查询并保存结果。",
    providerJobId: json.id,
    providerMetadata: { createdAt: json.created_at },
    createdAt: new Date().toISOString(),
  };
}

function normalizeVideoStatus(value?: string) {
  if (value === "succeeded") {
    return "succeeded" as const;
  }
  if (value === "failed") {
    return "failed" as const;
  }
  if (value === "cancelled" || value === "canceled") {
    return "canceled" as const;
  }
  if (value === "running") {
    return "running" as const;
  }
  return "queued" as const;
}

async function getVideoJobStatus(providerJobId: string): Promise<JobStatusResult> {
  const { apiKey, baseUrl } = arkBaseConfig();
  const json = await getArkJson<ArkVideoTask>({
    url: `${baseUrl}/contents/generations/tasks/${encodeURIComponent(providerJobId)}`,
    apiKey,
    taskLabel: "视频任务查询",
    timeoutMs: 30_000,
  });
  const status = normalizeVideoStatus(json.status);
  const resultUrls = [json.content?.video_url, json.content?.file_url].filter(
    (value): value is string => Boolean(value),
  );

  if (status === "succeeded" && !resultUrls.length) {
    throw new AiServiceError(
      "AI_PROVIDER_RESPONSE_INVALID",
      "视频任务已完成，但火山方舟没有返回可保存的视频地址。",
      502,
    );
  }

  return {
    provider: "volcengine",
    providerJobId,
    status,
    message:
      status === "succeeded"
        ? "变装视频已生成，正在保存到素材库。"
        : status === "failed"
          ? "火山方舟没有完成这个视频任务。"
          : status === "canceled"
            ? "火山方舟视频任务已取消。"
            : status === "running"
              ? "火山方舟正在生成变装视频。"
              : "变装视频正在排队。",
    resultUrls,
    raw: {
      errorCode: json.error?.code,
      duration: json.duration,
      ratio: json.ratio,
      resolution: json.resolution,
      usage: json.usage,
      lastFrameUrl: json.content?.last_frame_url,
    },
    updatedAt: json.updated_at
      ? new Date(json.updated_at * 1000).toISOString()
      : new Date().toISOString(),
  };
}

export const volcengineProvider: AiProvider = {
  name: "volcengine",
  async createJob(input) {
    if (input.jobType === "text_generation" || input.jobType === "image_understanding") {
      return createStructuredJob(input);
    }
    if (input.jobType === "text_to_image" || input.jobType === "image_to_image") {
      return createImageJob(input);
    }
    if (input.jobType === "image_to_video" || input.jobType === "video_generation") {
      return createVideoJob(input);
    }

    throw new AiServiceError(
      "AI_PROVIDER_NOT_SUPPORTED",
      "当前火山方舟通道尚未开放这个任务能力。",
      400,
    );
  },
  async getJobStatus(providerJobId) {
    return getVideoJobStatus(providerJobId);
  },
};
