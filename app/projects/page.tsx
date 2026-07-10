import { getProjectsData } from "@/lib/projects";
import { ProductHeader } from "@/components/brand/product-header";
import { CalendarClock, Plus } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

async function ProjectsContent() {
  await connection();

  const { projects, source } = await getProjectsData();

  return (
    <main className="min-h-screen bg-[#f7f6f3] text-[#171513]">
      <ProductHeader
        section="客户项目"
        action={
          <Link
            href="/projects/new"
            className="brand-focus inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#c91d16] px-4 text-sm font-semibold text-white hover:bg-[#a91410]"
          >
            <Plus className="h-4 w-4" />
            新建项目
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
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
              className="group overflow-hidden rounded-md border border-[#e6e2dd] bg-white transition-colors hover:border-[#c91d16]/30"
            >
              <Image
                src={project.cover}
                alt={project.name}
                width={640}
                height={480}
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f6f3] p-8 text-[#171513]">
          正在加载项目列表...
        </main>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
