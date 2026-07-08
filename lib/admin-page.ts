import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { hasEnvVars } from "@/lib/utils";
import { redirect } from "next/navigation";

export async function getAdminPageState() {
  if (!hasEnvVars) {
    return {
      mode: "demo" as const,
      userId: null,
      role: null,
      allowed: true,
      message: "演示模式：配置 Supabase 后后台会要求登录。",
    };
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/auth/login");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return {
      mode: "misconfigured" as const,
      userId,
      role: null,
      allowed: false,
      message: "Supabase Service Role Key 尚未配置，无法校验后台权限。",
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return {
      mode: "forbidden" as const,
      userId,
      role: null,
      allowed: false,
      message: error ? `权限校验失败：${error.message}` : "当前账号没有后台资料。",
    };
  }

  const allowed = ["owner", "admin"].includes(profile.role);

  return {
    mode: "supabase" as const,
    userId,
    role: profile.role,
    allowed,
    message: allowed ? "已通过后台权限校验。" : "当前账号没有后台管理权限。",
  };
}
