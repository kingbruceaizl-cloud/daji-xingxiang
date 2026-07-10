import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { connection } from "next/server";
import { Suspense } from "react";

async function StudioDemoContent() {
  await connection();

  return (
    <StudioWorkspace
      projectTitle="新中式宴会形象"
      subtitle="演示项目"
    />
  );
}

export default function StudioDemoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在打开形象大师演示...
        </main>
      }
    >
      <StudioDemoContent />
    </Suspense>
  );
}
