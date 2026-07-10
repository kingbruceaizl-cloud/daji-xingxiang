import { getGeneratedResultAssets } from "@/lib/ai/result-assets";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { NextResponse } from "next/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function canReadJob(ownerId?: string | null) {
  const userId = await getCurrentUserId();
  return Boolean(userId && ownerId && userId === ownerId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "任务查询服务尚未连接数据库。" },
      { status: 503 },
    );
  }

  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, message: "生成任务编号无效。" },
      { status: 400 },
    );
  }

  const { data } = await supabase
    .from("ai_jobs")
    .select(
      "id,owner_id,provider,model,job_type,status,prompt,provider_job_id,error_code,error_message,response_payload,output_asset_ids,persistence_status,retry_count,created_at,updated_at,completed_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "没有找到这个生成任务。" },
      { status: 404 },
    );
  }

  if (!(await canReadJob(data.owner_id))) {
    return NextResponse.json(
      { ok: false, message: "当前账号没有权限查看这个生成任务。" },
      { status: 403 },
    );
  }

  const outputAssets = await getGeneratedResultAssets(
    supabase,
    data.output_asset_ids,
  );

  return NextResponse.json({
    ok: true,
    source: "supabase",
    job: {
      id: data.id,
      provider: data.provider,
      model: data.model,
      jobType: data.job_type,
      status: data.status,
      prompt: data.prompt,
      providerJobId: data.provider_job_id,
      errorCode: data.error_code,
      errorMessage: data.error_message,
      message:
        data.error_message ||
        (data.status === "succeeded" ? "任务已完成。" : "任务状态已更新。"),
      response: data.response_payload,
      outputAssetIds: data.output_asset_ids,
      outputAssets,
      previewUrl: outputAssets[0]?.url || null,
      persistenceStatus: data.persistence_status,
      retryCount: data.retry_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
    },
  });
}
