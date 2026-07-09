import { StudioCreationFlow } from "@/components/studio/studio-creation-flow";
import { getCatalogData } from "@/lib/catalog";
import { workflowSteps } from "@/lib/demo-data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type StudioWorkspaceProps = {
  projectId?: string;
  projectTitle: string;
  subtitle: string;
};

export async function StudioWorkspace({
  projectId,
  projectTitle,
  subtitle,
}: StudioWorkspaceProps) {
  const catalog = await getCatalogData();

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/projects" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回项目
          </Link>
          <div className="text-sm text-stone-500">{subtitle}：{projectTitle}</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[260px_1fr_320px]">
        <aside className="space-y-3">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const active = index === 2;
            return (
              <div
                key={step.title}
                className={`rounded-md border p-4 ${
                  active
                    ? "border-red-200 bg-red-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-sm">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-red-700" />
                </div>
                <h2 className="mt-3 text-sm font-semibold">{step.title}</h2>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  {step.description}
                </p>
              </div>
            );
          })}
        </aside>

        <StudioCreationFlow catalog={catalog} projectId={projectId} />
      </div>
    </main>
  );
}
