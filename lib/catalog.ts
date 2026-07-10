import {
  demoProducts,
  generationJobs,
  musicTracks,
  productCategories,
  providerCards,
  scriptTemplates,
  stylePresets,
  videoTemplates,
} from "@/lib/demo-data";
import { formatJobStatusLabel, formatJobTypeLabel } from "@/lib/ai/display";
import {
  aiTaskRouteDefinitions,
  formatAiTaskRouteLabel,
} from "@/lib/ai/model-routes";
import { createAdminClient } from "@/lib/supabase/admin";

export type CatalogData = {
  source: "supabase" | "demo";
  productCategories: Array<{
    id?: string;
    name: string;
    count?: number;
    items?: string[];
  }>;
  products: Array<{
    id?: string;
    name: string;
    type: string;
    category?: string;
    price?: string;
    image?: string | null;
    promptText?: string;
    tags?: string[];
  }>;
  styles: Array<{
    id?: string;
    name: string;
    tag?: string;
    prompt: string;
  }>;
  providers: Array<{
    id?: string;
    name: string;
    status: string;
    ability: string;
  }>;
  modelRoutes: Array<{
    id?: string;
    taskKey: string;
    name: string;
    description: string;
    provider: string;
    model: string;
    status: string;
  }>;
  videoTemplates: Array<{
    id?: string;
    name: string;
    aspectRatio: string;
    durationSeconds: number;
    cameraDirection: string;
    transitionStyle: string;
    promptTemplate: string;
  }>;
  scriptTemplates: Array<{
    id?: string;
    name: string;
    content: string;
    tags: string[];
  }>;
  musicTracks: Array<{
    id?: string;
    name: string;
    moodTags: string[];
    usage?: string;
    publicUrl?: string | null;
  }>;
  jobs: Array<{
    id: string;
    provider: string;
    model: string;
    type: string;
    status: string;
    prompt: string;
    updatedAt: string;
    errorMessage?: string | null;
  }>;
};

function demoCatalog(): CatalogData {
  return {
    source: "demo",
    productCategories: productCategories.map((category) => ({
      name: category.name,
      count: category.count,
      items: category.items,
    })),
    products: demoProducts,
    styles: stylePresets,
    providers: providerCards.map((provider) => ({
      name: provider.name,
      status: provider.status,
      ability: provider.ability,
    })),
    modelRoutes: aiTaskRouteDefinitions.map((route) => ({
      taskKey: route.key,
      name: route.label,
      description: route.description,
      provider: route.fallbackProvider,
      model: route.fallbackModel,
      status: "演示兜底",
    })),
    videoTemplates,
    scriptTemplates,
    musicTracks,
    jobs: generationJobs,
  };
}

export async function getCatalogData(): Promise<CatalogData> {
  const supabase = createAdminClient();

  if (!supabase) {
    return demoCatalog();
  }

  const [
    categoriesResult,
    productsResult,
    stylesResult,
    providersResult,
    videoTemplatesResult,
    scriptTemplatesResult,
    musicTracksResult,
    modelRoutesResult,
    jobsResult,
  ] = await Promise.all([
      supabase
        .from("product_categories")
        .select("id,name,slug,is_active")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("products")
        .select("id,name,type,price,image_url,prompt_text,tags,product_categories(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("style_presets")
        .select("id,name,positive_prompt,tags")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("ai_providers")
        .select("id,name,display_name,is_active")
        .eq("is_active", true)
        .order("created_at"),
      supabase
        .from("video_templates")
        .select("id,name,aspect_ratio,duration_seconds,camera_direction,transition_style,prompt_template,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("script_templates")
        .select("id,name,content,tags,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("music_tracks")
        .select("id,name,public_url,usage_note,mood_tags,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(24),
      supabase
        .from("ai_model_routes")
        .select("id,task_key,display_name,description,provider,model,is_active,updated_at")
        .eq("is_active", true)
        .order("created_at"),
      supabase
        .from("ai_jobs")
        .select("id,provider,model,job_type,status,prompt,error_message,updated_at,created_at")
        .order("created_at", { ascending: false })
        .limit(16),
    ]);

  if (
    categoriesResult.error ||
    productsResult.error ||
    stylesResult.error ||
    providersResult.error ||
    videoTemplatesResult.error ||
    scriptTemplatesResult.error ||
    musicTracksResult.error ||
    modelRoutesResult.error ||
    jobsResult.error
  ) {
    return demoCatalog();
  }

  return {
    source: "supabase",
    productCategories: (categoriesResult.data || []).map((category) => ({
      id: category.id,
      name: category.name,
    })),
    products: (productsResult.data || []).map((product) => {
      const relation = product.product_categories;
      const category = Array.isArray(relation) ? relation[0] : relation;

      return {
        id: product.id,
        name: product.name,
        type: product.type === "sku" ? "真实商品" : "搭配素材",
        category: category?.name,
        price:
          product.price === null || product.price === undefined
            ? "素材"
            : `¥${Number(product.price).toFixed(0)}`,
        image: product.image_url,
        promptText: product.prompt_text,
        tags: product.tags || [],
      };
    }),
    styles: (stylesResult.data || []).map((style) => ({
      id: style.id,
      name: style.name,
      tag: style.tags?.[0],
      prompt: style.positive_prompt,
    })),
    providers: (providersResult.data || []).map((provider) => ({
      id: provider.id,
      name: provider.display_name,
      status: "已配置",
      ability: "能力由模型配置决定",
    })),
    modelRoutes: (modelRoutesResult.data || []).map((route) => ({
      id: route.id,
      taskKey: route.task_key,
      name: route.display_name || formatAiTaskRouteLabel(route.task_key),
      description: route.description,
      provider: route.provider,
      model: route.model,
      status: "已启用",
    })),
    videoTemplates: (videoTemplatesResult.data || []).map((template) => ({
      id: template.id,
      name: template.name,
      aspectRatio: template.aspect_ratio,
      durationSeconds: template.duration_seconds,
      cameraDirection: template.camera_direction,
      transitionStyle: template.transition_style,
      promptTemplate: template.prompt_template,
    })),
    scriptTemplates: (scriptTemplatesResult.data || []).map((script) => ({
      id: script.id,
      name: script.name,
      content: script.content,
      tags: script.tags || [],
    })),
    musicTracks: (musicTracksResult.data || []).map((track) => ({
      id: track.id,
      name: track.name,
      moodTags: track.mood_tags || [],
      usage: track.usage_note || undefined,
      publicUrl: track.public_url,
    })),
    jobs: (jobsResult.data || []).map((job) => ({
      id: job.id,
      provider: job.provider,
      model: job.model,
      type: formatJobTypeLabel(job.job_type),
      status: formatJobStatusLabel(job.status),
      prompt: job.prompt,
      updatedAt: job.updated_at || job.created_at,
      errorMessage: job.error_message,
    })),
  };
}
