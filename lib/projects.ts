import {
  generationJobs,
  projects as demoProjects,
  publicImages,
} from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

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
  previewUrl: string | null;
  createdAt: string;
};

export type ProjectJobSummary = {
  id: string;
  provider: string;
  model: string;
  type: string;
  status: string;
  prompt: string;
  updatedAt: string;
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
        .select("id,title,kind,public_url,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("ai_jobs")
        .select("id,provider,model,job_type,status,prompt,updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

    const project = {
      id: projectData.id,
      name: projectData.name,
      status: projectData.status,
      customerName: projectData.customer_name,
      updatedAt: formatUpdatedAt(projectData.updated_at),
      cover: publicImages.portrait,
    };

    return {
      source: "supabase",
      project,
      assets:
        assetData?.map((asset) => ({
          id: asset.id,
          title: asset.title || "项目素材",
          kind: String(asset.kind || "素材"),
          previewUrl: asset.public_url || null,
          createdAt: formatUpdatedAt(asset.created_at),
        })) || [],
      jobs:
        jobData?.map((job) => ({
          id: job.id,
          provider: job.provider,
          model: job.model,
          type: String(job.job_type || "生成任务"),
          status: String(job.status || "未知"),
          prompt: job.prompt || "暂无提示词",
          updatedAt: formatUpdatedAt(job.updated_at),
        })) || [],
    };
  } catch {
    return fallbackProjectDetail(projectId, "demo");
  }
}
