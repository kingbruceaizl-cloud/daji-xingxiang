import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { NextResponse } from "next/server";

export function requireAdminClient() {
  const supabase = createAdminClient();

  if (!supabase) {
    return {
      supabase: null,
      response: NextResponse.json(
        {
          ok: false,
          message: "请先配置 Supabase Service Role Key 后再写入后台数据。",
        },
        { status: 400 },
      ),
    };
  }

  return { supabase, response: null };
}

export async function requireAdminAccess() {
  const { supabase, response } = requireAdminClient();

  if (!supabase) {
    return { supabase: null, userId: null, response };
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return {
      supabase: null,
      userId: null,
      response: NextResponse.json(
        { ok: false, message: "请先登录后再操作后台。" },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      supabase: null,
      userId,
      response: NextResponse.json(
        { ok: false, message: `权限校验失败：${error.message}` },
        { status: 403 },
      ),
    };
  }

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return {
      supabase: null,
      userId,
      response: NextResponse.json(
        { ok: false, message: "当前账号没有后台管理权限。" },
        { status: 403 },
      ),
    };
  }

  return { supabase, userId, response: null };
}

export function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function parsePrice(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
