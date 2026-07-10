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
      { ok: false, message: "视频模板名称不能为空。" },
      { status: 400 },
    );
  }

  const { data: template, error: templateError } = await supabase
    .from("video_templates")
    .insert({
      name,
      aspect_ratio: body.aspectRatio || "9:16",
      duration_seconds: Number(body.durationSeconds) || 13,
      camera_direction: body.cameraDirection || "",
      transition_style: body.transitionStyle || "",
      prompt_template: body.promptTemplate || "",
      is_active: body.isActive ?? true,
    })
    .select("id,name,created_at")
    .single();

  if (templateError) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("视频模板保存") },
      { status: 400 },
    );
  }

  let script = null;
  if (body.scriptName || body.scriptContent) {
    const { data, error } = await supabase
      .from("script_templates")
      .insert({
        name: body.scriptName || `${name}脚本`,
        content: body.scriptContent || "",
        tags: parseTags(body.scriptTags || body.tags),
        is_active: body.isActive ?? true,
      })
      .select("id,name,created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, message: createSafeServerErrorMessage("脚本文案保存") },
        { status: 400 },
      );
    }

    script = data;
  }

  return NextResponse.json({
    ok: true,
    template,
    script,
    message: script ? "视频模板和脚本文案已保存。" : "视频模板已保存。",
  });
}
