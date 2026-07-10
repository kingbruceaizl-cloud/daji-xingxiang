import { requireAdminAccess } from "@/lib/admin-api";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { NextResponse } from "next/server";

function parseCapabilities(value: unknown) {
  const allowed = new Set([
    "text_to_image",
    "image_to_image",
    "image_to_video",
    "video_generation",
    "copywriting",
  ]);

  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[，,]/)
      : [];

  return items.map(String).map((item) => item.trim()).filter((item) => allowed.has(item));
}

export async function POST(request: Request) {
  const { supabase, response } = await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const providerName = String(body.provider || "").trim().toLowerCase();
  const modelName = String(body.name || "").trim();

  if (!providerName || !modelName) {
    return NextResponse.json(
      { ok: false, message: "模型通道和模型名称不能为空。" },
      { status: 400 },
    );
  }

  const { data: provider, error: providerError } = await supabase
    .from("ai_providers")
    .upsert(
      {
        name: providerName,
        display_name: body.providerDisplayName || providerName,
        is_active: true,
      },
      { onConflict: "name" },
    )
    .select("id")
    .single();

  if (providerError) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("模型通道保存") },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ai_models")
    .upsert(
      {
        provider_id: provider.id,
        name: modelName,
        display_name: body.displayName || modelName,
        capabilities: parseCapabilities(body.capabilities),
        default_params: body.defaultParams || {},
        is_active: body.isActive ?? true,
      },
      { onConflict: "provider_id,name" },
    )
    .select("id,name,display_name,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("模型保存") },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, model: data, message: "模型配置已保存。" });
}
