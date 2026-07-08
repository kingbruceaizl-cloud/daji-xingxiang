import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveGeneratedResultAssets } from "@/lib/ai/result-assets";

type KieCallbackPayload = {
  code?: number;
  msg?: string;
  taskId?: string;
  state?: string;
  status?: string;
  resultJson?: string;
  failMsg?: string;
  errorMessage?: string;
  data?: {
    taskId?: string;
    state?: string;
    status?: string;
    resultJson?: string;
    failMsg?: string;
    errorMessage?: string;
    progress?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function normalizeStatus(state?: string) {
  const value = state?.toLowerCase();

  if (value === "success" || value === "succeeded" || value === "completed") {
    return "succeeded";
  }

  if (value === "fail" || value === "failed" || value === "error") {
    return "failed";
  }

  if (value === "generating" || value === "running" || value === "processing") {
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
      videos?: string[];
    };

    return parsed.resultUrls || parsed.urls || parsed.images || parsed.videos;
  } catch {
    return undefined;
  }
}

function getPayloadData(payload: KieCallbackPayload) {
  return payload.data && typeof payload.data === "object" ? payload.data : payload;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function findAiJobByTaskId(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  taskId: string,
) {
  const providerJobResult = await supabase
    .from("ai_jobs")
    .select("id,status,owner_id,project_id,job_type,provider,provider_job_id")
    .eq("provider_job_id", taskId)
    .maybeSingle();

  if (providerJobResult.data || providerJobResult.error || !isUuid(taskId)) {
    return providerJobResult;
  }

  return supabase
    .from("ai_jobs")
    .select("id,status,owner_id,project_id,job_type,provider,provider_job_id")
    .eq("id", taskId)
    .maybeSingle();
}

export async function POST(request: Request) {
  const callbackSecret = process.env.KIE_CALLBACK_SECRET;
  const requestSecret = request.headers.get("x-daji-callback-secret");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  if (callbackSecret && requestSecret !== callbackSecret && querySecret !== callbackSecret) {
    return NextResponse.json(
      { ok: false, message: "回调密钥校验失败" },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => ({}))) as KieCallbackPayload;
  const data = getPayloadData(payload);
  const taskId = data.taskId || payload.taskId;
  const status = normalizeStatus(data.state || data.status || payload.state || payload.status);
  const resultUrls = parseResultUrls(data.resultJson || payload.resultJson);
  const errorMessage =
    data.failMsg || data.errorMessage || payload.failMsg || payload.errorMessage || null;

  if (!taskId) {
    return NextResponse.json(
      { ok: false, message: "KIE 回调缺少 taskId。", payload },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({
      ok: true,
      status: "skipped",
      message: "KIE 回调已接收；未配置 Supabase Service Role Key，未写入任务记录。",
      taskId,
      payload,
    });
  }

  const { data: existingJob, error: findError } = await findAiJobByTaskId(
    supabase,
    taskId,
  );

  if (findError) {
    return NextResponse.json(
      { ok: false, message: `KIE 回调查询任务失败：${findError.message}` },
      { status: 500 },
    );
  }

  if (!existingJob) {
    return NextResponse.json({
      ok: true,
      status: "skipped",
      message: "KIE 回调已接收，但没有找到对应的生成任务记录。",
      taskId,
      payload,
    });
  }

  const responsePayload = {
    ...payload,
    normalizedStatus: status,
    resultUrls,
  };

  const assetSaveResult =
    status === "succeeded" && resultUrls?.length
      ? await saveGeneratedResultAssets({
          supabase,
          jobId: existingJob.id,
          ownerId: existingJob.owner_id,
          projectId: existingJob.project_id,
          jobType: existingJob.job_type,
          resultUrls,
          provider: existingJob.provider,
          providerJobId: existingJob.provider_job_id || taskId,
        })
      : { assetIds: [], failures: [] };

  const { error: updateError } = await supabase
    .from("ai_jobs")
    .update({
      status,
      response_payload: {
        ...responsePayload,
        savedAssetIds: assetSaveResult.assetIds,
        assetSaveFailures: assetSaveResult.failures,
      },
      error_message: status === "failed" ? errorMessage : null,
    })
    .eq("id", existingJob.id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, message: `KIE 回调更新任务失败：${updateError.message}` },
      { status: 500 },
    );
  }

  const { error: eventError } = await supabase.from("job_events").insert({
    job_id: existingJob.id,
    status,
    message:
      status === "failed"
        ? errorMessage || "KIE 回调通知任务失败。"
        : assetSaveResult.failures.length
          ? "KIE 回调已同步任务状态，但部分生成结果转存失败。"
        : "KIE 回调已同步任务状态。",
    payload: {
      ...responsePayload,
      savedAssetIds: assetSaveResult.assetIds,
      assetSaveFailures: assetSaveResult.failures,
    },
  });

  if (eventError) {
    return NextResponse.json(
      { ok: false, message: `KIE 回调写入任务事件失败：${eventError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "KIE 回调已处理，生成任务状态已更新。",
    taskId,
    jobId: existingJob.id,
    jobStatus: status,
    resultUrls,
    savedAssetIds: assetSaveResult.assetIds,
    assetSaveFailures: assetSaveResult.failures,
  });
}
