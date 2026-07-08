import { requireAdminAccess, parseTags } from "@/lib/admin-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { supabase, response } = await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "音乐名称不能为空。" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("music_tracks")
    .insert({
      name,
      bucket: body.bucket || null,
      path: body.path || null,
      public_url: body.publicUrl || null,
      usage_note: body.usage || body.usageNote || null,
      mood_tags: parseTags(body.moodTags || body.tags),
      is_active: body.isActive ?? true,
    })
    .select("id,name,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: `音乐保存失败：${error.message}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, music: data, message: "音乐配置已保存。" });
}
