import { requireAdminAccess, parseTags } from "@/lib/admin-api";
import { createSafeServerErrorMessage } from "@/lib/server-error";
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
      { ok: false, message: "风格名称不能为空。" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("style_presets")
    .insert({
      name,
      description: body.description || null,
      cover_url: body.coverUrl || null,
      positive_prompt: body.positivePrompt || body.prompt || "",
      negative_prompt: body.negativePrompt || "",
      tags: parseTags(body.tags),
      is_active: body.isActive ?? true,
    })
    .select("id,name,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("风格保存") },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, style: data, message: "风格模板已保存。" });
}
