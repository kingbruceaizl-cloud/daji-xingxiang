import { requireAdminAccess } from "@/lib/admin-api";
import { runAiWorkerBatch } from "@/lib/ai/job-orchestrator";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { after, NextResponse } from "next/server";

export const maxDuration = 300;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, response, userId } = await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, message: "任务编号无效。" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const { data: job, error: readError } = await supabase
    .from("ai_jobs")
    .select("id,status,provider_job_id")
    .eq("id", id)
    .maybeSingle();

  if (readError || !job) {
    return NextResponse.json(
      { ok: false, message: "没有找到这个生成任务。" },
      { status: 404 },
    );
  }

  if (action === "retry") {
    if (!["failed", "canceled"].includes(job.status)) {
      return NextResponse.json(
        { ok: false, message: "只有失败或已取消的任务可以重新执行。" },
        { status: 400 },
      );
    }

    const { data: runtime } = await supabase
      .from("ai_job_runtime")
      .select("job_id,provider_result_urls")
      .eq("job_id", id)
      .maybeSingle();
    if (!runtime) {
      return NextResponse.json(
        { ok: false, message: "任务运行信息不完整，不能自动重试。" },
        { status: 409 },
      );
    }

    const { data: restartedJob, error } = await supabase
      .from("ai_jobs")
      .update({
        status: "pending",
        retry_count: 0,
        persistence_status: "pending",
        error_code: null,
        error_message: null,
        completed_at: null,
        next_poll_at: new Date().toISOString(),
        lease_owner: null,
        lease_expires_at: null,
      })
      .eq("id", id)
      .is("lease_owner", null)
      .select("id")
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { ok: false, message: createSafeServerErrorMessage("任务重试") },
        { status: 400 },
      );
    }
    if (!restartedJob) {
      return NextResponse.json(
        { ok: false, message: "任务状态刚刚发生变化，请刷新后再重试。" },
        { status: 409 },
      );
    }

    await supabase.from("job_events").insert({
      job_id: id,
      status: "pending",
      message: "管理员已重新启动任务。",
      payload: {
        action: "manual_retry",
        operatorId: userId,
        resumesProviderJob: Boolean(job.provider_job_id),
        resumesPersistence: Boolean(runtime.provider_result_urls?.length),
      },
    });
    after(async () => {
      try {
        await runAiWorkerBatch({ limit: 1 });
      } catch {
        // The scheduled worker remains the durable fallback.
      }
    });

    return NextResponse.json({ ok: true, message: "任务已重新进入后台队列。" });
  }

  if (action === "cancel") {
    if (["succeeded", "failed", "canceled"].includes(job.status)) {
      return NextResponse.json(
        { ok: false, message: "当前任务状态不能取消。" },
        { status: 400 },
      );
    }

    const { data: canceledJob, error } = await supabase
      .from("ai_jobs")
      .update({
        status: "canceled",
        completed_at: new Date().toISOString(),
        next_poll_at: null,
        lease_owner: null,
        lease_expires_at: null,
      })
      .eq("id", id)
      .is("lease_owner", null)
      .select("id")
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { ok: false, message: createSafeServerErrorMessage("任务取消") },
        { status: 400 },
      );
    }
    if (!canceledJob) {
      return NextResponse.json(
        { ok: false, message: "任务正在执行关键步骤，请稍后再取消。" },
        { status: 409 },
      );
    }

    await supabase.from("job_events").insert({
      job_id: id,
      status: "canceled",
      message: "管理员已停止系统继续处理该任务。",
      payload: { action: "manual_cancel", operatorId: userId },
    });

    return NextResponse.json({
      ok: true,
      message: "任务已在本系统中取消；已提交到模型平台的任务可能仍会产生费用。",
    });
  }

  return NextResponse.json(
    { ok: false, message: "不支持这个任务操作。" },
    { status: 400 },
  );
}
