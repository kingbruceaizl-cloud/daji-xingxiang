import { resolveAiInputAssets } from "@/lib/assets/resolve-ai-input";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAiJob, getProviderJobStatus } from "./index";
import { AiServiceError } from "./errors";
import {
  getGeneratedResultAssets,
  saveGeneratedResultAssets,
} from "./result-assets";
import type {
  AiJobStatus,
  AiJobType,
  AiWorkerRunResult,
  CreateJobInput,
  CreateJobResult,
} from "./types";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

type PersistedAiJob = {
  id: string;
  owner_id: string | null;
  project_id: string | null;
  provider: string;
  model: string;
  job_type: AiJobType;
  status: AiJobStatus;
  prompt: string;
  input_asset_ids: string[] | null;
  provider_job_id: string | null;
  retry_count: number | null;
  max_retries: number | null;
  created_at: string;
};

type JobRuntime = {
  dispatch_payload: {
    selectedProducts?: string[];
    styleName?: string | null;
    modelRouteKey?: string;
    modelRouteSource?: string;
    modelRouteParams?: Record<string, unknown>;
  } | null;
  provider_result_urls: string[] | null;
  provider_metadata: Record<string, unknown> | null;
};

type ProcessOutcome = "succeeded" | "deferred" | "retrying" | "failed";

function safeRequestSnapshot(input: CreateJobInput) {
  return {
    taskKey: input.modelRouteKey,
    routeSource: input.modelRouteSource,
    routeParams: input.modelRouteParams,
    inputAssetIds: input.inputAssetIds || [],
    selectedProducts: input.selectedProducts || [],
    styleName: input.styleName || null,
  };
}

function runtimePayload(input: CreateJobInput) {
  return {
    selectedProducts: input.selectedProducts || [],
    styleName: input.styleName || null,
    modelRouteKey: input.modelRouteKey,
    modelRouteSource: input.modelRouteSource,
    modelRouteParams: input.modelRouteParams || {},
  };
}

async function addJobEvent(
  supabase: SupabaseAdminClient,
  jobId: string,
  status: AiJobStatus,
  message: string,
  payload: Record<string, unknown> = {},
) {
  await supabase.from("job_events").insert({
    job_id: jobId,
    status,
    message,
    payload,
  });
}

async function assertProjectOwnership(
  supabase: SupabaseAdminClient,
  ownerId: string,
  projectId?: string,
) {
  if (!projectId) {
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) {
    throw new AiServiceError(
      "AI_ACCESS_DENIED",
      "当前账号不能在这个项目中创建生成任务。",
      403,
    );
  }
}

async function findIdempotentJob(
  supabase: SupabaseAdminClient,
  ownerId: string,
  idempotencyKey?: string,
) {
  if (!idempotencyKey) {
    return null;
  }

  const { data } = await supabase
    .from("ai_jobs")
    .select(
      "id,provider,model,job_type,status,provider_job_id,error_message,output_asset_ids,created_at",
    )
    .eq("owner_id", ownerId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const outputAssets = await getGeneratedResultAssets(
    supabase,
    data.output_asset_ids,
  );

  return {
    jobId: data.id,
    provider: data.provider,
    model: data.model,
    jobType: data.job_type,
    status: data.status,
    message: data.error_message || "已恢复之前提交的同一生成任务。",
    providerJobId: data.provider_job_id || undefined,
    outputAssetIds: data.output_asset_ids,
    outputAssets,
    previewUrl: outputAssets[0]?.url || undefined,
    createdAt: data.created_at,
  } as CreateJobResult;
}

async function createLocalJob(
  supabase: SupabaseAdminClient,
  input: CreateJobInput,
) {
  const { data, error } = await supabase
    .rpc("enqueue_ai_job", {
      p_owner_id: input.ownerId,
      p_project_id: input.projectId || null,
      p_provider: input.provider,
      p_model: input.model,
      p_job_type: input.jobType,
      p_task_key: input.modelRouteKey || input.jobType,
      p_prompt: input.prompt,
      p_input_asset_ids: input.inputAssetIds || [],
      p_request_payload: safeRequestSnapshot(input),
      p_persistence_status:
        input.provider === "mock" ? "not_required" : "pending",
      p_idempotency_key: input.idempotencyKey || null,
    })
    .select("id,created_at")
    .single();

  if (error || !data) {
    const quotaMessages: Record<string, string> = {
      GENERATION_DISABLED: "当前账号的真实模型生成功能已暂停，请联系管理员。",
      CONCURRENT_LIMIT_REACHED: "当前进行中的生成任务较多，请等待任务完成后再试。",
      MONTHLY_TEXT_LIMIT_REACHED: "本月文字与分析任务额度已用完，请联系管理员调整。",
      MONTHLY_IMAGE_LIMIT_REACHED: "本月图片生成额度已用完，请联系管理员调整。",
      MONTHLY_VIDEO_LIMIT_REACHED: "本月视频生成额度已用完，请联系管理员调整。",
    };
    const quotaKey = Object.keys(quotaMessages).find((key) =>
      error?.message?.includes(key),
    );
    if (quotaKey) {
      throw new AiServiceError(
        "AI_QUOTA_EXCEEDED",
        quotaMessages[quotaKey],
        429,
      );
    }
    throw new AiServiceError(
      "AI_PERSISTENCE_REQUIRED",
      "生成任务无法写入数据库，请先完成团队与用量迁移后重试。",
      503,
    );
  }

  const { error: runtimeError } = await supabase.from("ai_job_runtime").insert({
    job_id: data.id,
    dispatch_payload: runtimePayload(input),
  });

  if (runtimeError) {
    await supabase.from("ai_jobs").delete().eq("id", data.id);
    throw new AiServiceError(
      "AI_PERSISTENCE_REQUIRED",
      "后台任务运行表尚未就绪，请先完成数据库升级。",
      503,
    );
  }

  await addJobEvent(supabase, data.id, "pending", "生成任务已保存并进入后台队列。", {
    provider: input.provider,
    model: input.model,
    taskKey: input.modelRouteKey,
  });

  return data;
}

function errorCode(error: unknown) {
  return error instanceof AiServiceError
    ? error.code
    : "AI_PROVIDER_REQUEST_FAILED";
}

function errorMessage(error: unknown) {
  return error instanceof AiServiceError
    ? error.message
    : "生成服务暂时不可用，请稍后重试。";
}

function isRetriable(error: unknown) {
  return (
    !(error instanceof AiServiceError) ||
    error.code === "AI_PROVIDER_REQUEST_FAILED" ||
    error.code === "AI_RESULT_PERSISTENCE_FAILED"
  );
}

function retryDelayMs(retryCount: number) {
  return [15_000, 60_000, 5 * 60_000][Math.min(retryCount, 2)];
}

async function finishWithError(
  supabase: SupabaseAdminClient,
  job: PersistedAiJob,
  error: unknown,
): Promise<ProcessOutcome> {
  const code = errorCode(error);
  const message = errorMessage(error);
  const nextRetryCount = Number(job.retry_count || 0) + 1;
  const maxRetries = Number(job.max_retries || 3);

  if (isRetriable(error) && nextRetryCount <= maxRetries) {
    const nextPollAt = new Date(
      Date.now() + retryDelayMs(nextRetryCount - 1),
    ).toISOString();

    await supabase
      .from("ai_jobs")
      .update({
        status: "retrying",
        retry_count: nextRetryCount,
        next_poll_at: nextPollAt,
        lease_owner: null,
        lease_expires_at: null,
        error_code: code,
        error_message: message,
      })
      .eq("id", job.id);
    await addJobEvent(supabase, job.id, "retrying", "任务将在后台自动重试。", {
      errorCode: code,
      retryCount: nextRetryCount,
      nextPollAt,
    });

    return "retrying";
  }

  await supabase
    .from("ai_jobs")
    .update({
      status: "failed",
      error_code: code,
      error_message: message,
      completed_at: new Date().toISOString(),
      lease_owner: null,
      lease_expires_at: null,
      next_poll_at: null,
    })
    .eq("id", job.id);
  await addJobEvent(supabase, job.id, "failed", message, {
    errorCode: code,
    retryCount: nextRetryCount,
  });

  return "failed";
}

async function loadRuntime(supabase: SupabaseAdminClient, jobId: string) {
  const { data, error } = await supabase
    .from("ai_job_runtime")
    .select("dispatch_payload,provider_result_urls,provider_metadata")
    .eq("job_id", jobId)
    .maybeSingle();

  if (error || !data) {
    throw new AiServiceError(
      "AI_PERSISTENCE_REQUIRED",
      "任务运行数据不存在，无法继续执行。",
      503,
    );
  }

  return data as JobRuntime;
}

async function deferProviderJob(
  supabase: SupabaseAdminClient,
  job: PersistedAiJob,
  status: AiJobStatus,
  message: string,
  providerJobId?: string,
) {
  const nextPollAt = new Date(Date.now() + 15_000).toISOString();

  await supabase
    .from("ai_jobs")
    .update({
      status,
      provider_job_id: providerJobId || job.provider_job_id,
      next_poll_at: nextPollAt,
      last_polled_at: new Date().toISOString(),
      lease_owner: null,
      lease_expires_at: null,
    })
    .eq("id", job.id);
  await addJobEvent(supabase, job.id, status, message, { nextPollAt });
}

async function processClaimedJob(
  supabase: SupabaseAdminClient,
  job: PersistedAiJob,
): Promise<ProcessOutcome> {
  try {
    const runtime = await loadRuntime(supabase, job.id);
    let resultUrls = runtime.provider_result_urls?.filter(Boolean) || [];
    let providerMetadata = runtime.provider_metadata || {};
    let providerJobId = job.provider_job_id || undefined;

    if (!resultUrls.length && providerJobId) {
      const providerStatus = await getProviderJobStatus(
        job.provider,
        providerJobId,
      );

      if (providerStatus) {
        if (
          providerStatus.status === "queued" ||
          providerStatus.status === "running" ||
          providerStatus.status === "submitting"
        ) {
          await deferProviderJob(
            supabase,
            job,
            providerStatus.status,
            providerStatus.message,
            providerJobId,
          );
          return "deferred";
        }

        if (providerStatus.status === "failed" || providerStatus.status === "canceled") {
          throw new AiServiceError(
            "AI_PROVIDER_REQUEST_FAILED",
            providerStatus.message || "模型服务没有完成这个任务。",
            502,
          );
        }

        resultUrls = providerStatus.resultUrls?.filter(Boolean) || [];
        providerMetadata = { polledAt: providerStatus.updatedAt };
      } else {
        throw new AiServiceError(
          "AI_PROVIDER_RESPONSE_INVALID",
          "当前模型通道无法恢复这个第三方任务，请联系管理员检查任务协议。",
          502,
        );
      }
    }

    if (!resultUrls.length && !providerJobId) {
      const inputImageUrls = await resolveAiInputAssets({
        assetIds: job.input_asset_ids || [],
        ownerId: job.owner_id,
        projectId: job.project_id || undefined,
      });
      const payload = runtime.dispatch_payload || {};
      const providerResult = await createAiJob({
        provider: job.provider,
        model: job.model,
        jobType: job.job_type,
        prompt: job.prompt,
        projectId: job.project_id || undefined,
        ownerId: job.owner_id,
        localJobId: job.id,
        inputAssetIds: job.input_asset_ids || [],
        inputImageUrls,
        selectedProducts: payload.selectedProducts || [],
        styleName: payload.styleName || undefined,
        modelRouteKey: payload.modelRouteKey,
        modelRouteSource: payload.modelRouteSource,
        modelRouteParams: payload.modelRouteParams || {},
      });

      providerJobId = providerResult.providerJobId;
      resultUrls = providerResult.resultUrls?.filter(Boolean) || [];
      providerMetadata = providerResult.providerMetadata || {};

      await supabase.from("ai_job_runtime").update({
        provider_result_urls: resultUrls,
        provider_metadata: providerMetadata,
      }).eq("job_id", job.id);

      await supabase
        .from("ai_jobs")
        .update({
          status: resultUrls.length ? "persisting" : providerResult.status,
          provider_job_id: providerJobId || null,
          response_payload: {
            message: providerResult.message,
            resultCount: resultUrls.length,
            textOutput: providerResult.textOutput,
            structuredOutput: providerResult.structuredOutput,
            providerMetadata,
          },
          persistence_status: resultUrls.length ? "running" : "not_required",
        })
        .eq("id", job.id);

      const hasStructuredResult = Boolean(
        providerResult.textOutput || providerResult.structuredOutput,
      );
      if (hasStructuredResult && providerResult.status === "succeeded") {
        await supabase
          .from("ai_jobs")
          .update({
            status: "succeeded",
            persistence_status: "not_required",
            error_code: null,
            error_message: null,
            completed_at: new Date().toISOString(),
            lease_owner: null,
            lease_expires_at: null,
            next_poll_at: null,
          })
          .eq("id", job.id);
        await addJobEvent(
          supabase,
          job.id,
          "succeeded",
          providerResult.message,
          { structured: Boolean(providerResult.structuredOutput) },
        );
        return "succeeded";
      }

      if (!resultUrls.length) {
        if (
          providerResult.status === "queued" ||
          providerResult.status === "running" ||
          providerResult.status === "submitting"
        ) {
          await deferProviderJob(
            supabase,
            job,
            providerResult.status,
            providerResult.message,
            providerJobId,
          );
          return "deferred";
        }

        throw new AiServiceError(
          "AI_PROVIDER_RESPONSE_INVALID",
          "模型服务没有返回可保存的生成结果。",
          502,
        );
      }
    }

    await supabase
      .from("ai_jobs")
      .update({ status: "persisting", persistence_status: "running" })
      .eq("id", job.id);
    await addJobEvent(supabase, job.id, "persisting", "正在保存生成结果。", {
      resultCount: resultUrls.length,
    });

    const saveResult = await saveGeneratedResultAssets({
      supabase,
      jobId: job.id,
      ownerId: job.owner_id,
      projectId: job.project_id,
      jobType: job.job_type,
      resultUrls,
      provider: job.provider,
      providerJobId: providerJobId || job.id,
    });
    const persistenceSucceeded =
      saveResult.assetIds.length > 0 && saveResult.failures.length === 0;

    if (!persistenceSucceeded) {
      throw new AiServiceError(
        "AI_RESULT_PERSISTENCE_FAILED",
        "图片已经生成，但保存到素材库失败，后台会自动重试。",
        503,
      );
    }

    await supabase
      .from("ai_jobs")
      .update({
        status: "succeeded",
        persistence_status: "succeeded",
        error_code: null,
        error_message: null,
        completed_at: new Date().toISOString(),
        lease_owner: null,
        lease_expires_at: null,
        next_poll_at: null,
      })
      .eq("id", job.id);
    await addJobEvent(
      supabase,
      job.id,
      "succeeded",
      "形象图片已生成并保存到素材库。",
      { outputAssetIds: saveResult.assetIds },
    );

    return "succeeded";
  } catch (error) {
    return finishWithError(supabase, job, error);
  }
}

async function processMockJob(
  supabase: SupabaseAdminClient,
  input: CreateJobInput,
  localJob: { id: string; created_at: string },
) {
  try {
    const result = await createAiJob({ ...input, localJobId: localJob.id });

    await supabase
      .from("ai_jobs")
      .update({
        status: result.status,
        provider_job_id: result.providerJobId || null,
        response_payload: {
          message: result.message,
          textOutput: result.textOutput,
          structuredOutput: result.structuredOutput,
        },
        completed_at:
          result.status === "succeeded" ? new Date().toISOString() : null,
      })
      .eq("id", localJob.id);
    await addJobEvent(supabase, localJob.id, result.status, result.message);

    return { ...result, jobId: localJob.id, createdAt: localJob.created_at };
  } catch (error) {
    await finishWithError(
      supabase,
      {
        id: localJob.id,
        owner_id: input.ownerId || null,
        project_id: input.projectId || null,
        provider: input.provider || "mock",
        model: input.model || "mock-image-v1",
        job_type: input.jobType,
        status: "submitting",
        prompt: input.prompt,
        input_asset_ids: input.inputAssetIds || [],
        provider_job_id: null,
        retry_count: 0,
        max_retries: 0,
        created_at: localJob.created_at,
      },
      error,
    );
    throw error;
  }
}

export async function createAndDispatchAiJob(originalInput: CreateJobInput) {
  const supabase = createAdminClient();

  if (originalInput.provider === "mock" && (!supabase || !originalInput.ownerId)) {
    return createAiJob(originalInput);
  }

  if (!supabase) {
    throw new AiServiceError(
      "AI_PERSISTENCE_REQUIRED",
      "真实生成需要先配置 Supabase 服务端连接。",
      503,
    );
  }

  if (!originalInput.ownerId) {
    throw new AiServiceError(
      "AI_ACCESS_DENIED",
      "请先登录后再创建真实生成任务。",
      401,
    );
  }

  await assertProjectOwnership(
    supabase,
    originalInput.ownerId,
    originalInput.projectId,
  );

  const previous = await findIdempotentJob(
    supabase,
    originalInput.ownerId,
    originalInput.idempotencyKey,
  );
  if (previous) {
    return previous;
  }

  const localJob = await createLocalJob(supabase, originalInput);

  if (originalInput.provider === "mock") {
    return processMockJob(supabase, originalInput, localJob);
  }

  return {
    jobId: localJob.id,
    provider: originalInput.provider || "volcengine",
    model: originalInput.model || "",
    jobType: originalInput.jobType,
    status: "pending",
    message: "任务已保存，后台正在排队生成；关闭或刷新页面不会丢失。",
    createdAt: localJob.created_at,
  } satisfies CreateJobResult;
}

export async function runAiWorkerBatch(input: {
  limit?: number;
  workerId?: string;
} = {}): Promise<AiWorkerRunResult> {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new AiServiceError(
      "AI_PERSISTENCE_REQUIRED",
      "后台任务服务尚未连接 Supabase。",
      503,
    );
  }

  const workerId = input.workerId || `worker_${crypto.randomUUID()}`;
  const limit = Math.min(Math.max(input.limit || 1, 1), 3);
  const { data, error } = await supabase.rpc("claim_ai_jobs", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 300,
  });

  if (error) {
    throw new AiServiceError(
      "AI_PERSISTENCE_REQUIRED",
      "后台任务领取失败，请检查数据库任务迁移。",
      503,
    );
  }

  const jobs = (data || []) as PersistedAiJob[];
  const result: AiWorkerRunResult = {
    workerId,
    claimed: jobs.length,
    succeeded: 0,
    deferred: 0,
    retrying: 0,
    failed: 0,
  };

  for (const job of jobs) {
    const outcome = await processClaimedJob(supabase, job);
    result[outcome] += 1;
  }

  return result;
}
