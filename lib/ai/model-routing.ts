import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAiTaskRouteDefinition,
  isAiTaskRouteKey,
  type AiTaskRouteKey,
} from "./model-routes";
import { getAiExecutionMode } from "./execution-mode";

type RequestedRoute = {
  provider?: unknown;
  model?: unknown;
};

export type ResolvedAiModelRoute = {
  taskKey: AiTaskRouteKey;
  provider: string;
  model: string;
  source: "manual" | "admin" | "environment" | "demo";
  defaultParams: Record<string, unknown>;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackRoute(taskKey: AiTaskRouteKey): ResolvedAiModelRoute {
  const definition = getAiTaskRouteDefinition(taskKey);
  const mode = getAiExecutionMode();

  if (mode === "real") {
    const modelByTask: Partial<Record<AiTaskRouteKey, string>> = {
      text_generation: process.env.ARK_TEXT_MODEL_ID || "",
      image_understanding: process.env.ARK_TEXT_MODEL_ID || "",
      text_to_image: process.env.ARK_IMAGE_MODEL_ID || "",
      image_to_image: process.env.ARK_IMAGE_MODEL_ID || "",
      image_to_video: process.env.ARK_VIDEO_MODEL_ID || "",
      video_generation: process.env.ARK_VIDEO_MODEL_ID || "",
    };

    return {
      taskKey,
      provider: "volcengine",
      model: modelByTask[taskKey] || "",
      source: "environment",
      defaultParams: {},
    };
  }

  return {
    taskKey,
    provider: definition.fallbackProvider,
    model: definition.fallbackModel,
    source: "demo",
    defaultParams: {},
  };
}

export async function resolveAiModelRoute(
  taskKey: AiTaskRouteKey,
  requested: RequestedRoute = {},
): Promise<ResolvedAiModelRoute> {
  const fallback = fallbackRoute(taskKey);
  const executionMode = getAiExecutionMode();
  const requestedProvider = cleanString(requested.provider).toLowerCase();
  const requestedModel = cleanString(requested.model);

  if (requestedProvider && requestedProvider !== "auto") {
    return {
      taskKey,
      provider: requestedProvider,
      model: requestedModel,
      source: "manual",
      defaultParams: {},
    };
  }


  if (executionMode === "mock") {
    return fallback;
  }

  const supabase = createAdminClient();

  if (!supabase || !isAiTaskRouteKey(taskKey)) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("ai_model_routes")
    .select("task_key,provider,model,default_params,is_active")
    .eq("task_key", taskKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return fallback;
  }

  return {
    taskKey,
    provider: cleanString(data.provider).toLowerCase() || fallback.provider,
    model: cleanString(data.model) || fallback.model,
    source: "admin",
    defaultParams:
      data.default_params && typeof data.default_params === "object"
        ? (data.default_params as Record<string, unknown>)
        : {},
  };
}
