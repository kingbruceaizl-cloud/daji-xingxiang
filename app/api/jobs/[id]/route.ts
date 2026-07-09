import { getProviderJobStatus } from "@/lib/ai";
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
  if (!ownerId) {
    return true;
  }

  const userId = await getCurrentUserId();
  return userId === ownerId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  if (supabase) {
    let { data } = await supabase
      .from("ai_jobs")
      .select(
        "id,owner_id,provider,model,job_type,status,prompt,provider_job_id,error_message,response_payload,output_asset_ids,updated_at",
      )
      .eq("provider_job_id", id)
      .maybeSingle();

    if (!data && isUuid(id)) {
      const result = await supabase
        .from("ai_jobs")
        .select(
          "id,owner_id,provider,model,job_type,status,prompt,provider_job_id,error_message,response_payload,output_asset_ids,updated_at",
        )
        .eq("id", id)
        .maybeSingle();

      data = result.data;
    }

    if (data) {
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
          errorMessage: data.error_message,
          response: data.response_payload,
          outputAssetIds: data.output_asset_ids,
          outputAssets,
          previewUrl: outputAssets[0]?.url || null,
          updatedAt: data.updated_at,
        },
      });
    }
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");

  if (provider) {
    const providerStatus = await getProviderJobStatus(provider, id);

    if (providerStatus) {
      return NextResponse.json({
        ok: true,
        source: provider,
        job: providerStatus,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    source: "demo",
    job: {
      id,
      status: "succeeded",
      message: "演示任务已完成。配置 Supabase 或模型通道参数后可查询真实任务。",
      updatedAt: new Date().toISOString(),
    },
  });
}
