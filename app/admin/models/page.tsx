import { JsonCreateForm } from "@/components/admin/json-create-form";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { formatModelLabel, formatProviderLabel } from "@/lib/ai/display";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

const sampleModel = `{
  "provider": "volcengine",
  "providerDisplayName": "火山方舟（豆包）",
  "name": "doubao-seedream-5-0-260128",
  "displayName": "Seedream 5.0 完整版",
  "capabilities": ["text_to_image", "image_to_image"],
  "defaultParams": {
    "size": "2K",
    "sequential_image_generation": "disabled",
    "watermark": false
  },
  "taskRoutes": [
    {
      "taskKey": "image_to_image",
      "displayName": "图生图",
      "description": "基于客户照片生成换装形象图",
      "isActive": true
    }
  ]
}`;

const modelFieldHints = [
  "通道标识：用于服务端识别模型供应商，正式通道使用 volcengine。",
  "通道显示名：后台和工作台展示给操作者看的名称。",
  "模型名称：供应商接口要求的模型标识。",
  "模型显示名：后台展示用的中文模型名称。",
  "能力类型：文生图、图生图、图生视频等能力的内部标记。",
  "任务路由：声明这个模型默认处理哪些行动内容，例如图生图或图生视频。",
  "默认参数：模型调用时默认使用的画幅、质量等参数。",
];

async function AdminModelsContent() {
  await connection();

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
            当前正式通道为火山方舟，并预留 OpenAI、即梦、可灵和通义。密钥只放在服务端环境变量。
          </p>
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold">模型通道</h2>
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
          <div className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold">任务能力路由</h2>
            {catalog.modelRoutes.map((route) => (
              <div
                key={route.taskKey}
                className="rounded-md border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">{route.name}</h3>
                    <p className="mt-2 text-xs leading-5 text-stone-500">
                      {route.description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-red-700">{route.status}</span>
                </div>
                <p className="mt-3 text-xs text-stone-500">
                  当前路由：{formatProviderLabel(route.provider)} /{" "}
                  {formatModelLabel(route.model, route.provider)}
                </p>
              </div>
            ))}
          </div>
        </section>
        <JsonCreateForm
          endpoint="/api/admin/models"
          initialValue={sampleModel}
          fieldHints={modelFieldHints}
          submitText="保存模型"
        />
      </div>
    </main>
  );
}

export default function AdminModelsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在加载模型配置...
        </main>
      }
    >
      <AdminModelsContent />
    </Suspense>
  );
}
