import { getProjectsData } from "@/lib/projects";
import { ArrowLeft, CalendarClock, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function ProjectsPage() {
  const { projects, source } = await getProjectsData();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回大吉形象
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            新建项目
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-8 rounded-md border border-stone-200 bg-white p-6">
          <p className="text-sm font-medium text-red-700">项目列表</p>
          <h1 className="mt-2 text-3xl font-semibold">
            管理客户形象设计项目。
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            每个项目会记录客户素材、已选商品、提示词、生成图片和变装视频。
          </p>
          <p className="mt-3 text-xs text-stone-400">
            当前数据源：{source === "supabase" ? "Supabase" : "演示数据"}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.name}
              href={project.id ? `/projects/${project.id}` : "/projects/demo-xinzhongshi"}
              className="overflow-hidden rounded-md border border-stone-200 bg-white"
            >
              <Image
                src={project.cover}
                alt={project.name}
                width={640}
                height={480}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-5">
                <h2 className="font-semibold">{project.name}</h2>
                <div className="mt-4 flex items-center justify-between text-sm text-stone-500">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    {project.updatedAt}
                  </span>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">
                    {project.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
