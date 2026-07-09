import { JsonCreateForm } from "@/components/admin/json-create-form";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { ArrowLeft, Clapperboard, FileText } from "lucide-react";
import Link from "next/link";

const sampleTemplate = `{
  "name": "白底旋转换装",
  "aspectRatio": "9:16",
  "durationSeconds": 13,
  "cameraDirection": "固定机位，全身构图，第一段轻微推进",
  "transitionStyle": "快速单次 360 度原地旋转",
  "promptTemplate": "纯白无缝棚拍背景，模特通过快速旋转换装，左侧出现商品清单卡片，整体干净高级。",
  "scriptName": "白底旋转换装脚本",
  "scriptContent": "开场展示客户原始造型，旋转后切换为目标搭配，左侧显示商品清单和数量标签。",
  "scriptTags": "变装,商品卡片,白底棚拍"
}`;

const videoTemplateFieldHints = [
  "模板名称：展示在工作台短视频配置里的模板名。",
  "视频比例和时长：用于约束竖屏短视频的画幅和秒数。",
  "运镜说明：描述机位、构图、推进或拉远方式。",
  "转场方式：描述旋转、闪切、遮挡或其他变装方式。",
  "默认提示词：用于创建视频任务时补充画面要求。",
  "脚本文案：用于字幕、商品卡片和短视频故事节奏。",
];

export default async function AdminVideoTemplatesPage() {
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

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section>
          <p className="text-sm font-medium text-red-700">视频脚本</p>
          <h1 className="mt-2 text-3xl font-semibold">维护变装短视频模板和脚本文案。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            模板控制时长、画幅、运镜和转场；脚本控制字幕、商品卡片和故事节奏。
          </p>

          <div className="mt-6 space-y-3">
            {catalog.videoTemplates.map((template) => (
              <div key={template.name} className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Clapperboard className="h-5 w-5 text-red-700" />
                    <div>
                      <h2 className="text-sm font-semibold">{template.name}</h2>
                      <p className="mt-1 text-xs text-stone-500">
                        {template.aspectRatio}｜{template.durationSeconds} 秒
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">
                    视频模板
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-500">
                  {template.cameraDirection}
                </p>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  {template.transitionStyle}
                </p>
                <p className="mt-3 rounded-md bg-stone-50 p-3 text-xs leading-5 text-stone-500">
                  {template.promptTemplate}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {catalog.scriptTemplates.map((script) => (
              <div key={script.name} className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-700" />
                  <h2 className="text-sm font-semibold">{script.name}</h2>
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-500">{script.content}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {script.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <JsonCreateForm
          endpoint="/api/admin/video-templates"
          initialValue={sampleTemplate}
          fieldHints={videoTemplateFieldHints}
          submitText="保存视频脚本"
        />
      </div>
    </main>
  );
}
