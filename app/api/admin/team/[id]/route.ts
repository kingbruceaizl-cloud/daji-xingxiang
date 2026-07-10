import { requireAdminAccess } from "@/lib/admin-api";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { NextResponse } from "next/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function limitedInteger(value: unknown, fallback: number, minimum: number) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue >= minimum
    ? numberValue
    : fallback;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, response, userId, role: operatorRole } =
    await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, message: "员工编号无效。" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const requestedRole = ["owner", "admin", "staff"].includes(body.role)
    ? String(body.role)
    : null;

  if (requestedRole) {
    if (operatorRole !== "owner") {
      return NextResponse.json(
        { ok: false, message: "只有负责人可以修改员工角色。" },
        { status: 403 },
      );
    }
    if (id === userId) {
      return NextResponse.json(
        { ok: false, message: "不能在这里修改自己的负责人角色。" },
        { status: 400 },
      );
    }

    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    if (!target) {
      return NextResponse.json(
        { ok: false, message: "没有找到这个员工账号。" },
        { status: 404 },
      );
    }
    if (target.role === "owner" && requestedRole !== "owner") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "owner");
      if ((count || 0) <= 1) {
        return NextResponse.json(
          { ok: false, message: "系统必须保留至少一位负责人。" },
          { status: 400 },
        );
      }
    }

    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: requestedRole })
      .eq("id", id);
    if (roleError) {
      return NextResponse.json(
        { ok: false, message: createSafeServerErrorMessage("员工角色更新") },
        { status: 400 },
      );
    }
  }

  const limits = body.limits && typeof body.limits === "object" ? body.limits : {};
  const { error: limitsError } = await supabase.from("usage_limits").upsert(
    {
      user_id: id,
      monthly_text_limit: limitedInteger(limits.monthlyTextLimit, 500, -1),
      monthly_image_limit: limitedInteger(limits.monthlyImageLimit, 100, -1),
      monthly_video_limit: limitedInteger(limits.monthlyVideoLimit, 20, -1),
      max_concurrent_jobs: limitedInteger(limits.maxConcurrentJobs, 2, 1),
      is_generation_enabled:
        typeof limits.isGenerationEnabled === "boolean"
          ? limits.isGenerationEnabled
          : true,
    },
    { onConflict: "user_id" },
  );
  if (limitsError) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("员工用量限制更新") },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "员工权限与用量限制已更新。" });
}
