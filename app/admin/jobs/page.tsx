import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { JobsManager } from "@/components/admin/jobs-manager";
import { getAdminPageState } from "@/lib/admin-page";
import { getCatalogData } from "@/lib/catalog";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

async function AdminJobsContent() {
  await connection();

  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const catalog = await getCatalogData({ jobScope: "all" });

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

        <JobsManager jobs={catalog.jobs} />
      </div>
    </main>
  );
}

export default function AdminJobsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在加载生成任务...
        </main>
      }
    >
      <AdminJobsContent />
    </Suspense>
  );
}
