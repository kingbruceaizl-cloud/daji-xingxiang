import { requireAdminAccess } from "@/lib/admin-api";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { supabase, response } = await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const displayName = String(body.displayName || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { ok: false, message: "请输入有效的员工邮箱。" },
      { status: 400 },
    );
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(
    /\/$/,
    "",
  );
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: displayName ? { display_name: displayName } : undefined,
    redirectTo: `${baseUrl}/auth/confirm?next=/auth/update-password`,
  });
  if (error) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("员工邀请发送") },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, message: "员工邀请已发送。" });
}
