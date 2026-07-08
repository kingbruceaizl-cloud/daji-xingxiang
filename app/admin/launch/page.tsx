import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getAdminPageState } from "@/lib/admin-page";
import { getLaunchReadiness, type LaunchCheckItem } from "@/lib/launch-readiness";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Rocket,
} from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

function statusLabel(status: LaunchCheckItem["status"]) {
  if (status === "ready") {
    return "已就绪";
  }

  if (status === "warning") {
    return "需确认";
  }

  return "待配置";
}

function StatusIcon({ status }: { status: LaunchCheckItem["status"] }) {
  if (status === "ready") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-700" />;
  }

  if (status === "warning") {
    return <AlertTriangle className="h-5 w-5 text-amber-700" />;
  }

  return <CircleDashed className="h-5 w-5 text-stone-400" />;
}

function statusClassName(status: LaunchCheckItem["status"]) {
  if (status === "ready") {
    return "bg-emerald-50 text-emerald-800";
  }

  if (status === "warning") {
    return "bg-amber-50 text-amber-800";
  }

  return "bg-stone-100 text-stone-600";
}

async function AdminLaunchContent() {
  await connection();

  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const readiness = await getLaunchReadiness();
  const readyCount = readiness.checks.filter((item) => item.status === "ready").length;
  const missingCount = readiness.checks.filter(
    (item) => item.status === "missing",
  ).length;
  const warningCount = readiness.checks.filter(
    (item) => item.status === "warning",
  ).length;

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/admin" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回后台
          </Link>
          <Link
            href="/api/health"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
          >
            查看接口结果
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-8 rounded-md border border-stone-200 bg-white p-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                <Rocket className="h-4 w-4" />
                上线体检
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                检查大吉形象是否具备正式发布条件。
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
                这里会检查应用地址、Supabase、数据库、存储桶和 AI 模型通道。
                本地演示可以缺少这些配置，正式上线前需要全部处理。
              </p>
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm">
              <div className="font-semibold">{readiness.summary}</div>
              <div className="mt-2 text-xs text-stone-500">
                最近检查：{new Date(readiness.generatedAt).toLocaleString("zh-CN")}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-3 md:grid-cols-3">
          {[
            { label: "已就绪", value: readyCount, className: "text-emerald-700" },
            { label: "待配置", value: missingCount, className: "text-red-700" },
            { label: "需确认", value: warningCount, className: "text-amber-700" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-stone-200 bg-white p-5"
            >
              <div className={`text-3xl font-semibold ${item.className}`}>
                {item.value}
              </div>
              <div className="mt-1 text-sm text-stone-500">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-3">
          {readiness.checks.map((item) => (
            <article
              key={item.key}
              className="rounded-md border border-stone-200 bg-white p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <StatusIcon status={item.status} />
                  <div>
                    <h2 className="font-semibold">{item.label}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-500">
                      {item.detail}
                    </p>
                    <p className="mt-2 text-xs text-stone-400">
                      配置项：{item.key}
                    </p>
                  </div>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusClassName(
                    item.status,
                  )}`}
                >
                  {statusLabel(item.status)}
                </span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

export default function AdminLaunchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在检查上线配置...
        </main>
      }
    >
      <AdminLaunchContent />
    </Suspense>
  );
}
