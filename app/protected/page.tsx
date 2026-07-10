import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { hasEnvVars } from "@/lib/utils";
import {
  adminModules,
  providerCards,
  stats,
  workflowSteps,
} from "@/lib/demo-data";
import { getProjectsData } from "@/lib/projects";
import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { ArrowRight, Bell, CheckCircle2, Clock3, PlayCircle } from "lucide-react";

const generationQueue = [
  { name: "张女士形象图", status: "生成完成", icon: CheckCircle2 },
  { name: "低能量变装视频", status: "等待回调", icon: Clock3 },
  { name: "商品库同步", status: "待配置", icon: Bell },
];

async function UserDetails() {
  if (!hasEnvVars) {
    return (
      <div className="mt-4 rounded-md bg-stone-50 p-4 text-sm leading-6 text-stone-600">
        当前为本地演示模式。配置 Supabase 环境变量后，这里会显示真实账号摘要。
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const claims = data.claims as {
    email?: string;
    role?: string;
    sub?: string;
  };
  const accountId = claims.sub ? `${claims.sub.slice(0, 8)}...` : "已登录";

  return (
    <div className="mt-4 grid gap-3 rounded-md bg-stone-50 p-4 text-sm text-stone-600">
      <div className="flex items-center justify-between gap-3">
        <span className="text-stone-400">账号邮箱</span>
        <span className="font-medium text-stone-900">
          {claims.email || "已登录账号"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-stone-400">账号编号</span>
        <span>{accountId}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-stone-400">当前权限</span>
        <span>{claims.role || "普通登录用户"}</span>
      </div>
    </div>
  );
}

async function ProtectedContent() {
  await connection();

  const { projects, source } = await getProjectsData();

  return (
    <div className="space-y-8">
      <section className="rounded-md border border-stone-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-medium text-red-700">今日工作台</p>
            <h1 className="mt-2 text-3xl font-semibold">
              形象项目、生成任务和后台配置都在这里。
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              当前是 MVP 演示数据。连接 Supabase 后，项目、素材、商品和生成任务会写入数据库。
            </p>
            <p className="mt-3 text-xs text-stone-400">
              当前项目数据源：{source === "supabase" ? "Supabase" : "演示数据"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white"
            >
              新建设计
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-900"
            >
              后台配置
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-stone-200 bg-white p-5"
          >
            <div className="text-2xl font-semibold">{item.value}</div>
            <p className="mt-1 text-sm text-stone-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-stone-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">最近项目</h2>
              <p className="mt-1 text-sm text-stone-500">
                从这里继续客户形象设计。
              </p>
            </div>
            <Link href="/projects" className="text-sm text-red-700">
              查看全部
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.name}
                className="overflow-hidden rounded-md border border-stone-200"
              >
                <Image
                  src={project.cover}
                  alt={project.name}
                  width={640}
                  height={480}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold">
                    {project.name}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                    <span>{project.status}</span>
                    <span>{project.updatedAt}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">生成队列</h2>
          <div className="mt-5 space-y-3">
            {generationQueue.map(({ name, status, icon: Icon }) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-md border border-stone-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-red-700" />
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <span className="text-xs text-stone-500">{status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">登录摘要</h2>
          <Suspense>
            <UserDetails />
          </Suspense>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">下一步开发重点</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {workflowSteps.slice(0, 4).map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-md border border-stone-200 p-4"
                >
                  <Icon className="h-5 w-5 text-red-700" />
                  <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {providerCards.map((provider) => {
          const Icon = provider.icon;
          return (
            <div
              key={provider.name}
              className="rounded-md border border-stone-200 bg-white p-4"
            >
              <Icon className="h-5 w-5 text-red-700" />
              <h3 className="mt-3 text-sm font-semibold">{provider.name}</h3>
              <p className="mt-1 text-xs text-red-700">{provider.status}</p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                {provider.ability}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <div
              key={module.name}
              className="rounded-md border border-stone-200 bg-white p-4"
            >
              <Icon className="h-5 w-5 text-red-700" />
              <h3 className="mt-3 text-sm font-semibold">{module.name}</h3>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                {module.detail}
              </p>
            </div>
          );
        })}
      </section>

      <Link
        href="/projects/new"
        className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-red-900/20"
      >
        <PlayCircle className="h-4 w-4" />
        开始生成
      </Link>
    </div>
  );
}

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-md border border-stone-200 bg-white p-6">
          正在加载工作台...
        </div>
      }
    >
      <ProtectedContent />
    </Suspense>
  );
}
