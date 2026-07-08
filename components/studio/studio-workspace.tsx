import { CustomerAssetsPanel } from "@/components/studio/customer-assets-panel";
import { StudioGeneratePanel } from "@/components/studio/generate-panel";
import { getCatalogData } from "@/lib/catalog";
import { getCategoryIcon } from "@/lib/category-icons";
import { publicImages, workflowSteps } from "@/lib/demo-data";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
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
  const selectedProducts = catalog.products.slice(0, 3).map((product) => product.name);
  const selectedStyle = catalog.styles[0];
  const prompt = [
    "保留客户五官特征，生成一张高级商业棚拍形象图。",
    selectedStyle ? `风格采用${selectedStyle.name}，${selectedStyle.prompt}` : "风格采用新中式轻礼服。",
    selectedProducts.length ? `搭配${selectedProducts.join("、")}。` : "由系统推荐商品搭配。",
  ].join("");

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

        <section className="space-y-6">
          <CustomerAssetsPanel
            initialPreviewUrl={publicImages.portrait}
            projectId={projectId}
          />

          <div className="rounded-md border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">风格选择</p>
                <h2 className="mt-1 text-xl font-semibold">
                  本次选择：{selectedStyle?.name || "新中式轻礼服"}
                </h2>
              </div>
              <SlidersHorizontal className="h-5 w-5 text-stone-400" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {catalog.styles.map((style, index) => (
                <div
                  key={style.name}
                  className={`rounded-md border p-4 ${
                    index === 0
                      ? "border-red-200 bg-red-50"
                      : "border-stone-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{style.name}</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-stone-500">
                      {style.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-stone-500">
                    {style.prompt}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">商品搭配</p>
                <h2 className="mt-1 text-xl font-semibold">从商品库挑选真实商品和素材。</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500">
                已选 {selectedProducts.length || 0} 件
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
              <div className="space-y-2">
                {catalog.productCategories.map((category) => {
                  const Icon = getCategoryIcon(category.name);
                  return (
                    <button
                      key={category.name}
                      className="flex w-full items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-4 w-4 text-red-700" />
                        {category.name}
                      </span>
                      <span className="text-xs text-stone-400">
                        {category.count || "启用"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {catalog.products.slice(0, 6).map((product) => (
                  <article
                    key={product.name}
                    className="overflow-hidden rounded-md border border-stone-200"
                  >
                    <Image
                      src={product.image || publicImages.flatlay}
                      alt={product.name}
                      width={420}
                      height={420}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {product.name}
                        </h3>
                        <span className="shrink-0 text-xs text-red-700">
                          {product.price}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-stone-500">
                        {product.category}｜{product.type}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside>
          <StudioGeneratePanel
            prompt={prompt}
            projectId={projectId}
            initialInputImageUrl={publicImages.portrait}
            selectedProducts={selectedProducts}
            styleName={selectedStyle?.name || "新中式轻礼服"}
          />
        </aside>
      </div>
    </main>
  );
}
