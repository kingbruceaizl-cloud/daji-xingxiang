import { requireAdminAccess } from "@/lib/admin-api";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { NextResponse } from "next/server";

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
      { ok: false, message: "告警编号无效。" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const now = new Date().toISOString();
  const updates =
    action === "acknowledge"
      ? {
          status: "acknowledged",
          acknowledged_at: now,
          acknowledged_by: userId,
        }
      : action === "resolve"
        ? {
            status: "resolved",
            resolved_at: now,
            resolved_by: userId,
          }
        : action === "reopen"
          ? {
              status: "open",
              acknowledged_at: null,
              acknowledged_by: null,
              resolved_at: null,
              resolved_by: null,
            }
          : null;

  if (!updates) {
    return NextResponse.json(
      { ok: false, message: "不支持这个告警操作。" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("system_alerts")
    .update(updates)
    .eq("id", id)
    .select("id,status,source_type,source_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("告警状态更新") },
      { status: 400 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "没有找到这个系统告警。" },
      { status: 404 },
    );
  }

  if (data.source_type === "ai_job" && data.source_id) {
    await supabase.from("job_events").insert({
      job_id: data.source_id,
      status: "running",
      message:
        action === "acknowledge"
          ? "管理员已确认任务告警。"
          : action === "resolve"
            ? "管理员已关闭任务告警。"
            : "管理员已重新打开任务告警。",
      payload: {
        action: `alert_${action}`,
        alertId: id,
        operatorId: userId,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      action === "acknowledge"
        ? "告警已确认。"
        : action === "resolve"
          ? "告警已关闭。"
          : "告警已重新打开。",
  });
}
