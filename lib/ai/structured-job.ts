import { resolveAiInputAssets } from "@/lib/assets/resolve-ai-input";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { after } from "next/server";
import {
  createRealAiProviderLoginMessage,
  normalizeAiProvider,
  realAiProviderRequiresLogin,
} from "./access";
import { AiServiceError } from "./errors";
import { createAndDispatchAiJob, runAiWorkerBatch } from "./job-orchestrator";
import { resolveAiModelRoute } from "./model-routing";
import type { AiJobType } from "./types";

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function assertStructuredPayloadSize(value: unknown, label: string) {
  const length = JSON.stringify(value ?? null).length;
  if (length > 30_000) {
    throw new AiServiceError(
      "AI_PROVIDER_REQUEST_FAILED",
      `${label}内容过长，请精简后重试。`,
      400,
    );
  }
}

export async function submitStructuredJob(input: {
  request: Request;
  body: Record<string, unknown>;
  jobType: Extract<AiJobType, "text_generation" | "image_understanding">;
  prompt: string;
  responseName: string;
  responseSchema: Record<string, unknown>;
  structuredTask: string;
  requireImage?: boolean;
}) {
  const ownerId = await getCurrentUserId();
  const modelRoute = await resolveAiModelRoute(input.jobType, {
    provider: input.body.provider,
    model: input.body.model,
  });
  const provider = normalizeAiProvider(modelRoute.provider);
  if (realAiProviderRequiresLogin(provider) && !ownerId) {
    throw new AiServiceError(
      "AI_ACCESS_DENIED",
      createRealAiProviderLoginMessage(provider),
      401,
    );
  }

  const inputAssetIds = stringArray(input.body.inputAssetIds);
  const requestedInputImageUrls = stringArray(input.body.inputImageUrls);
  if (input.requireImage && !inputAssetIds.length && !requestedInputImageUrls.length) {
    throw new AiServiceError(
      "AI_PROVIDER_REQUEST_FAILED",
      "请先上传至少一张客户图片再开始分析。",
      400,
    );
  }

  const projectId =
    typeof input.body.projectId === "string" ? input.body.projectId : undefined;
  const inputImageUrls =
    provider === "mock"
      ? requestedInputImageUrls
      : await resolveAiInputAssets({
          assetIds: inputAssetIds,
          ownerId,
          projectId,
        });

  if (provider !== "mock" && requestedInputImageUrls.length && !inputAssetIds.length) {
    throw new AiServiceError(
      "AI_ACCESS_DENIED",
      "真实分析只接受已经保存到素材库的图片。",
      400,
    );
  }

  const job = await createAndDispatchAiJob({
    provider,
    model: modelRoute.model || undefined,
    jobType: input.jobType,
    prompt: input.prompt,
    projectId,
    inputImageUrls,
    inputAssetIds,
    ownerId,
    idempotencyKey:
      input.request.headers.get("idempotency-key") ||
      (typeof input.body.idempotencyKey === "string"
        ? input.body.idempotencyKey
        : undefined),
    modelRouteKey: modelRoute.taskKey,
    modelRouteSource: modelRoute.source,
    modelRouteParams: {
      ...modelRoute.defaultParams,
      structuredTask: input.structuredTask,
      responseName: input.responseName,
      responseSchema: input.responseSchema,
    },
  });

  if (job.provider !== "mock" && job.status === "pending") {
    after(async () => {
      await runAiWorkerBatch({ limit: 1 });
    });
  }

  return job;
}
