import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateJobInput, CreateJobResult } from "./types";

type PersistResult = {
  status: "saved" | "skipped" | "failed";
  message: string;
};

export async function persistAiJob(
  input: CreateJobInput,
  result: CreateJobResult,
): Promise<PersistResult> {
  const supabase = createAdminClient();

  if (!supabase) {
    return {
      status: "skipped",
      message: "未配置 Supabase Service Role Key，任务仅在演示模式返回。",
    };
  }

  const { error } = await supabase.from("ai_jobs").insert({
    owner_id: input.ownerId || null,
    project_id: input.projectId || null,
    provider: result.provider,
    model: result.model,
    job_type: result.jobType,
    status: result.status,
    prompt: input.prompt,
    request_payload: input,
    response_payload: result,
    provider_job_id: result.providerJobId || null,
  });

  if (error) {
    return {
      status: "failed",
      message: `任务返回成功，但写入 Supabase 失败：${error.message}`,
    };
  }

  return {
    status: "saved",
    message: "任务已写入 Supabase 任务表。",
  };
}
