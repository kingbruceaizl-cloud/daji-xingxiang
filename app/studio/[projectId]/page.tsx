import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { getProjectById } from "@/lib/projects";
import { Suspense } from "react";

async function StudioProjectContent({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
}) {
  const [{ projectId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { project, source } = await getProjectById(projectId);
  const queryName = Array.isArray(resolvedSearchParams.name)
    ? resolvedSearchParams.name[0]
    : resolvedSearchParams.name;
  const projectTitle = queryName?.trim() || project.name;

  return (
    <StudioWorkspace
      projectId={project.id || projectId}
      projectTitle={projectTitle}
      subtitle={
        source === "supabase"
          ? "真实项目"
          : source === "local"
            ? "本地项目"
            : "演示项目"
      }
    />
  );
}

export default function StudioProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在打开形象大师工作台...
        </main>
      }
    >
      <StudioProjectContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
