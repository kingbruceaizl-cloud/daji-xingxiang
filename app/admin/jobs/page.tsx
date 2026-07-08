import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { ArrowLeft, ListVideo } from "lucide-react";
import Link from "next/link";

const statusClassName: Record<string, string> = {
  succeeded: "bg-green-50 text-green-700",
  running: "bg-blue-50 text-blue-700",
  queued: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  canceled: "bg-stone-100 text-stone-500",
  已完成: "bg-green-50 text-green-700",
  等待生成: "bg-amber-50 text-amber-700",
  待接入: "bg-stone-100 text-stone-500",
};

const statusLabel: Record<string, string> = {
  succeeded: "已完成",
  running: "生成中",
  queued: "排队中",
  failed: "失败",
  canceled: "已取消",
};

const typeLabel: Record<string, string> = {
  text_to_image: "文生图",
  image_to_image: "图生图",
  image_to_video: "图生视频",
  video_render: "视频渲染",
  copywriting: "文案生成",
};

export default async function AdminJobsPage() {
  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const catalog = await getCatalogData();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/admin" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回后台
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-6">
          <p className="text-sm font-medium text-red-700">生成任务</p>
          <h1 className="mt-2 text-3xl font-semibold">查看图片、视频和文案生成记录。</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            这里用于排查模型通道、任务状态和失败原因。配置 Supabase 后会读取真实 `ai_jobs` 记录。
          </p>
        </section>

        <section className="overflow-x-auto rounded-md border border-stone-200 bg-white">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1fr_0.8fr_0.7fr_0.7fr] gap-4 border-b border-stone-200 px-5 py-3 text-xs font-medium text-stone-400">
              <span>任务</span>
              <span>模型通道</span>
              <span>类型</span>
              <span>状态</span>
            </div>
            <div className="divide-y divide-stone-200">
              {catalog.jobs.map((job) => (
                <div key={job.id} className="grid grid-cols-[1fr_0.8fr_0.7fr_0.7fr] gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ListVideo className="h-4 w-4 shrink-0 text-red-700" />
                      <h2 className="truncate text-sm font-semibold">{job.id}</h2>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">
                      {job.prompt || "暂无提示词。"}
                    </p>
                    {job.errorMessage && (
                      <p className="mt-2 text-xs text-red-700">失败原因：{job.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-sm text-stone-600">
                    <p>{job.provider}</p>
                    <p className="mt-1 text-xs text-stone-400">{job.model}</p>
                  </div>
                  <p className="text-sm text-stone-600">
                    {typeLabel[job.type] || job.type}
                  </p>
                  <div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusClassName[job.status] || "bg-stone-100 text-stone-500"}`}>
                      {statusLabel[job.status] || job.status}
                    </span>
                    <p className="mt-2 text-xs text-stone-400">{job.updatedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
