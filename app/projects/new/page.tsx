import { NewProjectForm } from "@/components/projects/new-project-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/projects" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回项目列表
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-md border border-stone-200 bg-white p-6">
          <p className="text-sm font-medium text-red-700">新建项目</p>
          <h1 className="mt-2 text-3xl font-semibold">创建客户形象设计项目。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            项目会承载客户素材、商品搭配、提示词、图片生成任务和变装视频任务。
            第一阶段无需登录即可创建本地项目；配置 Supabase 后，项目会写入数据库。
          </p>
        </section>
        <NewProjectForm />
      </div>
    </main>
  );
}
