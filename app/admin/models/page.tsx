import { JsonCreateForm } from "@/components/admin/json-create-form";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const sampleModel = `{
  "provider": "kie",
  "providerDisplayName": "KIE",
  "name": "gpt-image-2-image-to-image",
  "displayName": "GPT Image 2 图生图",
  "capabilities": "image_to_image",
  "defaultParams": {
    "aspectRatio": "auto",
    "quality": "high"
  }
}`;

export default async function AdminModelsPage() {
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

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <p className="text-sm font-medium text-red-700">模型配置</p>
          <h1 className="mt-2 text-3xl font-semibold">维护 AI 模型通道与模型能力。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            当前已预留 KIE、OpenAI、即梦、可灵和通义。密钥仍然只放在服务端环境变量。
          </p>
          <div className="mt-6 space-y-3">
            {catalog.providers.map((provider) => (
              <div key={provider.name} className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{provider.name}</h2>
                  <span className="text-xs text-red-700">{provider.status}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">{provider.ability}</p>
              </div>
            ))}
          </div>
        </section>
        <JsonCreateForm
          endpoint="/api/admin/models"
          initialValue={sampleModel}
          submitText="保存模型"
        />
      </div>
    </main>
  );
}
