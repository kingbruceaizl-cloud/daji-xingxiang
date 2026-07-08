import { projects as demoProjects, publicImages } from "@/lib/demo-data";
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

function fallbackProjects(): ProjectSummary[] {
  return demoProjects;
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
        ...fallbackProjects()[0],
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
          ...fallbackProjects()[0],
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
          ...fallbackProjects()[0],
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
        ...fallbackProjects()[0],
        id: projectId,
      },
    };
  }
}
