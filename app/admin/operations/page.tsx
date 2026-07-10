import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { OperationsMonitor } from "@/components/admin/operations-monitor";
import { getAdminOperationsData } from "@/lib/admin-operations";
import { getAdminPageState } from "@/lib/admin-page";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

async function AdminOperationsContent() {
  await connection();

  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const data = await getAdminOperationsData();

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
          <p className="text-sm font-medium text-red-700">运行监控</p>
          <h1 className="mt-2 text-3xl font-semibold">
            查看生成服务健康状态并处理系统告警。
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            汇总真实任务成功率、完成耗时、模型通道表现和失败原因，帮助运营及时发现卡住或失败的生成任务。
          </p>
        </section>

        <OperationsMonitor data={data} />
      </div>
    </main>
  );
}

export default function AdminOperationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在加载运行监控...
        </main>
      }
    >
      <AdminOperationsContent />
    </Suspense>
  );
}
