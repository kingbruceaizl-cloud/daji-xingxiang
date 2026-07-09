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
  ImageIcon,
  ListVideo,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

async function ProjectDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project, source, assets, jobs } = await getProjectDetailById(id);
  const studioHref = `/studio/${project.id || id}?name=${encodeURIComponent(project.name)}`;
  const sourceText =
    source === "supabase" ? "真实项目" : source === "local" ? "本地项目" : "演示项目";

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/projects" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回项目列表
          </Link>
          <Link
            href={studioHref}
            className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white"
          >
            <WandSparkles className="h-4 w-4" />
            进入形象大师
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px]">
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
            <div className="space-y-3">
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
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在打开项目详情...
        </main>
      }
    >
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}
