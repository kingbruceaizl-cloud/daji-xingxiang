import {
  generationJobs,
  projects as demoProjects,
  publicImages,
} from "@/lib/demo-data";
import { formatJobStatusLabel, formatJobTypeLabel } from "@/lib/ai/display";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import type { AiJobStatus } from "@/lib/ai/types";

export type ProjectSummary = {
  id?: string;
  name: string;
  status: string;
  updatedAt: string;
  cover: string;
  customerName?: string | null;
};

export type ProjectAssetSummary = {
  id: string;
  title: string;
  kind: string;
  rawKind?: string;
  previewUrl: string | null;
  createdAt: string;
};

export type ProjectJobSummary = {
  id: string;
  provider: string;
  model: string;
  type: string;
  rawType?: string;
  status: string;
  rawStatus?: AiJobStatus;
  prompt: string;
  updatedAt: string;
  providerJobId?: string | null;
  message?: string;
  outputAssetIds?: string[];
  outputAssets?: Array<{
    id: string;
    kind: string;
    title: string | null;
    url: string | null;
  }>;
  responsePayload?: Record<string, unknown>;
};

export type ProjectDetail = {
  source: "supabase" | "demo" | "local";
  project: ProjectSummary;
  assets: ProjectAssetSummary[];
  jobs: ProjectJobSummary[];
};

function fallbackProjects(): ProjectSummary[] {
  return demoProjects;
}

function fallbackProjectById(projectId: string) {
  return (
    fallbackProjects().find((project) => project.id === projectId) ||
    fallbackProjects()[0]
  );
}

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return "刚刚";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAssetKind(value?: string | null) {
  const labels: Record<string, string> = {
    customer_image: "客户图片",
    customer_video: "客户视频",
    product_image: "商品素材",
    generated_image: "生成图片",
    generated_video: "生成视频",
    music: "音乐素材",
  };

  return labels[value || ""] || "项目素材";
}

export async function getProjectsData(): Promise<{
  source: "supabase" | "demo";
  projects: ProjectSummary[];
}> {
  if (!hasEnvVars) {
    return { source: "demo", projects: fallbackProjects() };
  }

  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();

    if (!claims?.claims?.sub) {
      return { source: "demo", projects: fallbackProjects() };
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id,name,status,customer_name,updated_at")
      .order("updated_at", { ascending: false })
      .limit(12);

    if (error || !data?.length) {
      return { source: "demo", projects: fallbackProjects() };
    }

    return {
      source: "supabase",
      projects: data.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        customerName: project.customer_name,
        updatedAt: formatUpdatedAt(project.updated_at),
        cover: publicImages.portrait,
      })),
    };
  } catch {
    return { source: "demo", projects: fallbackProjects() };
  }
}

export async function getProjectById(projectId: string): Promise<{
  source: "supabase" | "demo" | "local";
  project: ProjectSummary;
}> {
  if (projectId.startsWith("local-")) {
    return {
      source: "local",
      project: {
        ...fallbackProjects()[0],
        id: projectId,
        status: "本地草稿",
      },
    };
  }

  if (!hasEnvVars) {
    return {
      source: "demo",
      project: {
        ...fallbackProjectById(projectId),
        id: projectId,
      },
    };
  }

  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();

    if (!claims?.claims?.sub) {
      return {
        source: "demo",
        project: {
          ...fallbackProjectById(projectId),
          id: projectId,
        },
      };
    }

    const { data, error } = await supabase
      .from("projects")
      .select("id,name,status,customer_name,updated_at")
      .eq("id", projectId)
      .maybeSingle();

    if (error || !data) {
      return {
        source: "demo",
        project: {
          ...fallbackProjectById(projectId),
          id: projectId,
        },
      };
    }

    return {
      source: "supabase",
      project: {
        id: data.id,
        name: data.name,
        status: data.status,
        customerName: data.customer_name,
        updatedAt: formatUpdatedAt(data.updated_at),
        cover: publicImages.portrait,
      },
    };
  } catch {
    return {
      source: "demo",
      project: {
        ...fallbackProjectById(projectId),
        id: projectId,
      },
    };
  }
}

function demoAssets(project: ProjectSummary): ProjectAssetSummary[] {
  return [
    {
      id: `${project.id || "demo"}-customer`,
      title: "演示客户素材",
      kind: "客户图片",
      previewUrl: project.cover,
      createdAt: project.updatedAt,
    },
    {
      id: `${project.id || "demo"}-generated`,
      title: "演示生成结果",
      kind: "形象图片",
      previewUrl: publicImages.flatlay,
      createdAt: project.updatedAt,
    },
  ];
}

function demoJobs(): ProjectJobSummary[] {
  return generationJobs.map((job) => ({
    id: job.id,
    provider: job.provider,
    model: job.model,
    type: job.type,
    status: job.status,
    prompt: job.prompt,
    updatedAt: job.updatedAt,
  }));
}

function fallbackProjectDetail(projectId: string, source: ProjectDetail["source"]) {
  const project = {
    ...fallbackProjectById(projectId),
    id: projectId,
    ...(source === "local" ? { status: "本地草稿" } : {}),
  };

  return {
    source,
    project,
    assets: demoAssets(project),
    jobs: demoJobs(),
  };
}

export async function getProjectDetailById(projectId: string): Promise<ProjectDetail> {
  if (projectId.startsWith("local-")) {
    return fallbackProjectDetail(projectId, "local");
  }

  if (!hasEnvVars) {
    return fallbackProjectDetail(projectId, "demo");
  }

  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();

    if (!claims?.claims?.sub) {
      return fallbackProjectDetail(projectId, "demo");
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("id,name,status,customer_name,updated_at")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !projectData) {
      return fallbackProjectDetail(projectId, "demo");
    }

    const [{ data: assetData }, { data: jobData }] = await Promise.all([
      supabase
        .from("asset_files")
        .select("id,title,kind,bucket,path,public_url,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_jobs")
        .select("id,provider,model,job_type,status,prompt,provider_job_id,error_message,response_payload,output_asset_ids,updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    const project = {
      id: projectData.id,
      name: projectData.name,
      status: projectData.status,
      customerName: projectData.customer_name,
      updatedAt: formatUpdatedAt(projectData.updated_at),
      cover: publicImages.portrait,
    };

    const resolvedAssets = await Promise.all(
      (assetData || []).map(async (asset) => {
        let previewUrl = asset.public_url || null;
        if (!previewUrl && asset.bucket && asset.path) {
          const { data: signed } = await supabase.storage
            .from(asset.bucket)
            .createSignedUrl(asset.path, 60 * 60);
          previewUrl = signed?.signedUrl || null;
        }

        return {
          id: asset.id,
          title: asset.title || "项目素材",
          kind: formatAssetKind(asset.kind),
          rawKind: String(asset.kind || ""),
          previewUrl,
          createdAt: formatUpdatedAt(asset.created_at),
        };
      }),
    );
    const assetsById = new Map(resolvedAssets.map((asset) => [asset.id, asset]));
    project.cover =
      resolvedAssets.find((asset) => asset.previewUrl)?.previewUrl || project.cover;

    return {
      source: "supabase",
      project,
      assets: resolvedAssets,
      jobs:
        jobData?.map((job) => ({
          id: job.id,
          provider: job.provider,
          model: job.model,
          type: formatJobTypeLabel(String(job.job_type || "")),
          rawType: String(job.job_type || ""),
          status: formatJobStatusLabel(String(job.status || "")),
          rawStatus: job.status as AiJobStatus,
          prompt: job.prompt || "暂无提示词",
          updatedAt: formatUpdatedAt(job.updated_at),
          providerJobId: job.provider_job_id,
          message:
            job.error_message ||
            (job.status === "succeeded" ? "任务已完成。" : "任务状态已恢复。"),
          outputAssetIds: (job.output_asset_ids || []) as string[],
          responsePayload:
            job.response_payload && typeof job.response_payload === "object"
              ? (job.response_payload as Record<string, unknown>)
              : undefined,
          outputAssets: ((job.output_asset_ids || []) as string[])
            .map((id) => assetsById.get(id))
            .filter(Boolean)
            .map((asset) => ({
              id: asset!.id,
              kind: asset!.rawKind || asset!.kind,
              title: asset!.title,
              url: asset!.previewUrl,
            })),
        })) || [],
    };
  } catch {
    return fallbackProjectDetail(projectId, "demo");
  }
}
