import { JsonCreateForm } from "@/components/admin/json-create-form";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const sampleStyle = `{
  "name": "新中式轻礼服",
  "description": "适合宴会、婚礼、节日和品牌形象照。",
  "positivePrompt": "温润东方美学，缎面材质，低饱和红金点缀，清透妆面，高级棚拍，保留人物五官特征",
  "negativePrompt": "低清晰度，变形五官，过度磨皮，夸张滤镜，多余手指",
  "tags": "国风,宴会,婚礼"
}`;

export default async function AdminStylesPage() {
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
          <p className="text-sm font-medium text-red-700">风格模板</p>
          <h1 className="mt-2 text-3xl font-semibold">维护提示词风格模板。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            风格模板会参与自动提示词拼接，帮助形象顾问减少重复输入。
          </p>
          <div className="mt-6 grid gap-3">
            {catalog.styles.map((style) => (
              <div key={style.name} className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{style.name}</h2>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">
                    {style.tag}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-500">{style.prompt}</p>
              </div>
            ))}
          </div>
        </section>
        <JsonCreateForm
          endpoint="/api/admin/styles"
          initialValue={sampleStyle}
          submitText="保存风格"
        />
      </div>
    </main>
  );
}
