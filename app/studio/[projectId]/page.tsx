import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { getProjectDetailById } from "@/lib/projects";
import { connection } from "next/server";
import { Suspense } from "react";

function structuredOutput(response?: Record<string, unknown>) {
  const value = response?.structuredOutput;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

async function StudioProjectContent({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
}) {
  await connection();

  const [{ projectId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { project, source, assets, jobs } = await getProjectDetailById(projectId);
  const queryName = Array.isArray(resolvedSearchParams.name)
    ? resolvedSearchParams.name[0]
    : resolvedSearchParams.name;
  const projectTitle = queryName?.trim() || project.name;
  const mediaJob = jobs.find((job) =>
    [
      "text_to_image",
      "image_to_image",
      "image_to_video",
      "video_generation",
      "video_render",
    ].includes(job.rawType || ""),
  );
  const structuredJobs = jobs
    .map((job) => ({ job, output: structuredOutput(job.responsePayload) }))
    .filter((item) => item.output);
  const initialAnalysis = structuredJobs.find(
    ({ job, output }) =>
      job.rawType === "image_understanding" && typeof output?.faceShape === "string",
  )?.output;
  const initialPlan = structuredJobs.find(
    ({ output }) => typeof output?.styleDirection === "string",
  )?.output;
  const initialPromptPackage = structuredJobs.find(
    ({ output }) => typeof output?.imagePrompt === "string",
  )?.output;

  return (
    <StudioWorkspace
      projectId={project.id || projectId}
      projectTitle={projectTitle}
      initialAssets={assets}
      initialJob={source === "supabase" ? mediaJob : undefined}
      initialAnalysis={source === "supabase" ? initialAnalysis : undefined}
      initialPlan={source === "supabase" ? initialPlan : undefined}
      initialPromptPackage={
        source === "supabase"
          ? (initialPromptPackage as
              | {
                  imagePrompt: string;
                  negativePrompt: string;
                  videoPrompt: string;
                  shotPlan: Array<{
                    order: number;
                    durationSeconds: number;
                    description: string;
                  }>;
                  reviewNotes: string[];
                }
              | undefined)
          : undefined
      }
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
        <main className="min-h-screen bg-[#f7f6f3] p-8 text-[#171513]">
          正在打开形象大师工作台...
        </main>
      }
    >
      <StudioProjectContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
