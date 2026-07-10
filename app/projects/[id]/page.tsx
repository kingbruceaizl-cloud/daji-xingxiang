import {
  formatJobStatusLabel,
  formatJobTypeLabel,
  formatModelLabel,
  formatProviderLabel,
} from "@/lib/ai/display";
import { getProjectDetailById } from "@/lib/projects";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  ImageIcon,
  ListVideo,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { ProductHeader } from "@/components/brand/product-header";
import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

function getStructuredOutput(job: {
  responsePayload?: Record<string, unknown>;
}) {
  const value = job.responsePayload?.structuredOutput;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function structuredSummary(output: Record<string, unknown>) {
  if (typeof output.imagePrompt === "string") {
    return output.imagePrompt;
  }
  if (typeof output.summary === "string") {
    return output.summary;
  }

  return [output.faceShape, output.hair, output.skinTone]
    .filter((value): value is string => typeof value === "string" && Boolean(value))
    .join("；");
}

async function ProjectDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const { project, source, assets, jobs } = await getProjectDetailById(id);
  const studioHref = `/studio/${project.id || id}?name=${encodeURIComponent(project.name)}`;
  const structuredJobs = jobs
    .map((job) => ({ job, output: getStructuredOutput(job) }))
    .filter(
      (item): item is typeof item & { output: Record<string, unknown> } =>
        Boolean(item.output),
    );
  const sourceText =
    source === "supabase" ? "真实项目" : source === "local" ? "本地项目" : "演示项目";

  return (
    <main className="min-h-screen bg-[#f7f6f3] text-[#171513]">
      <ProductHeader
        section="项目详情"
        action={
          <div className="flex items-center gap-3">
            <Link href="/projects" className="flex items-center gap-3 text-sm font-semibold">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xl:inline">返回项目</span>
            </Link>
            <Link
              href={studioHref}
              className="brand-focus inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#c91d16] px-4 text-sm font-semibold text-white hover:bg-[#a91410]"
            >
              <WandSparkles className="h-4 w-4" />
              <span className="hidden sm:inline">进入形象大师</span>
            </Link>
          </div>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-md border border-stone-200 bg-white p-6">
            <p className="text-sm font-medium text-red-700">项目详情</p>
            <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-stone-500">
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                {project.status}
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1">
                {sourceText}
              </span>
              {project.customerName ? (
                <span className="rounded-full bg-stone-100 px-3 py-1">
                  客户：{project.customerName}
                </span>
              ) : null}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-stone-500">
              <CalendarClock className="h-4 w-4" />
              最近更新：{project.updatedAt}
            </p>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <ImageIcon className="h-4 w-4 text-red-700" />
              项目素材
            </div>
            {assets.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {assets.map((asset) => (
                  <article
                    key={asset.id}
                    className="overflow-hidden rounded-md border border-stone-200"
                  >
                    <div className="grid aspect-[4/3] place-items-center bg-stone-100 text-sm text-stone-400">
                      {asset.previewUrl ? (
                        <Image
                          src={asset.previewUrl}
                          alt={asset.title}
                          width={640}
                          height={480}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "私有素材"
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="text-sm font-semibold">{asset.title}</h2>
                      <p className="mt-2 text-xs text-stone-500">
                        {asset.kind}｜{asset.createdAt}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-md bg-stone-50 p-4 text-sm text-stone-500">
                暂无项目素材，进入形象大师后可上传客户图片或视频。
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-6 py-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardList className="h-4 w-4 text-red-700" />
                AI 方案记录
              </div>
              <span className="text-xs text-stone-400">
                {structuredJobs.length} 条
              </span>
            </div>
            {structuredJobs.length ? (
              <div className="divide-y divide-stone-100">
                {structuredJobs.map(({ job, output }) => (
                  <article key={job.id} className="px-6 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {formatJobTypeLabel(job.rawType || job.type)}
                      </p>
                      <span className="text-xs text-stone-400">{job.updatedAt}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
                      {structuredSummary(output) || "结构化结果已保存。"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="px-6 py-5 text-sm text-stone-500">
                完成客户分析、形象方案或提示词生成后，会在这里保留记录。
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
            <Image
              src={project.cover}
              alt={project.name}
              width={720}
              height={900}
              className="aspect-[4/5] w-full object-cover"
            />
            <div className="p-5">
              <p className="text-sm font-medium text-red-700">下一步</p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                进入形象大师后，可以继续上传素材、调整商品搭配、生成形象图片和变装视频。
              </p>
            </div>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <ListVideo className="h-4 w-4 text-red-700" />
              生成任务
            </div>
            <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-md border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-red-700" />
                      {formatJobTypeLabel(job.type)}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-stone-500">
                      {formatJobStatusLabel(job.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-stone-500">
                    {formatProviderLabel(job.provider)}｜
                    {formatModelLabel(job.model, job.provider)}｜{job.updatedAt}
                  </p>
                  <p className="mt-3 line-clamp-2 text-xs leading-5 text-stone-500">
                    {job.prompt}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f6f3] p-8 text-[#171513]">
          正在打开项目详情...
        </main>
      }
    >
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}
