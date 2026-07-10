import { requireAdminAccess } from "@/lib/admin-api";
import {
  getAiTaskRouteDefinition,
  isAiTaskRouteKey,
  type AiTaskRouteKey,
} from "@/lib/ai/model-routes";
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

function parseTaskRoutes(
  value: unknown,
  fallback: {
    provider: string;
    model: string;
    defaultParams: Record<string, unknown>;
  },
) {
  const items = Array.isArray(value) ? value : value ? [value] : [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const route = item as Record<string, unknown>;
    const taskKey = String(route.taskKey || route.task || "").trim();

    if (!isAiTaskRouteKey(taskKey)) {
      return [];
    }

    const definition = getAiTaskRouteDefinition(taskKey as AiTaskRouteKey);
    const provider = String(route.provider || fallback.provider).trim().toLowerCase();
    const model = String(route.model || fallback.model).trim();
    const defaultParams =
      route.defaultParams && typeof route.defaultParams === "object"
        ? (route.defaultParams as Record<string, unknown>)
        : fallback.defaultParams;

    return [
      {
        task_key: taskKey,
        display_name: String(route.displayName || definition.label),
        description: String(route.description || definition.description),
        provider,
        model,
        default_params: defaultParams,
        is_active: route.isActive === undefined ? true : Boolean(route.isActive),
      },
    ];
  });
}

export async function POST(request: Request) {
  const { supabase, response } = await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const providerName = String(body.provider || "").trim().toLowerCase();
  const modelName = String(body.name || "").trim();
  const defaultParams =
    body.defaultParams && typeof body.defaultParams === "object"
      ? (body.defaultParams as Record<string, unknown>)
      : {};

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
        default_params: defaultParams,
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

  const taskRoutes = parseTaskRoutes(body.taskRoutes || body.taskRoute, {
    provider: providerName,
    model: modelName,
    defaultParams,
  });

  if (taskRoutes.length) {
    const { error: routeError } = await supabase
      .from("ai_model_routes")
      .upsert(taskRoutes, { onConflict: "task_key" });

    if (routeError) {
      return NextResponse.json(
        { ok: false, message: createSafeServerErrorMessage("模型能力路由保存") },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    model: data,
    routes: taskRoutes,
    message: taskRoutes.length ? "模型配置和能力路由已保存。" : "模型配置已保存。",
  });
}
