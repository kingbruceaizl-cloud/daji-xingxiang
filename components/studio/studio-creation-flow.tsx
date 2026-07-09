"use client";

import { CustomerAssetsPanel } from "@/components/studio/customer-assets-panel";
import { StudioGeneratePanel } from "@/components/studio/generate-panel";
import { getCategoryIcon } from "@/lib/category-icons";
import type { CatalogData } from "@/lib/catalog";
import { publicImages } from "@/lib/demo-data";
import { Check, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type StudioCreationFlowProps = {
  catalog: CatalogData;
  projectId?: string;
};

function buildPrompt(style: CatalogData["styles"][number] | undefined, productNames: string[]) {
  return [
    "保留客户五官特征，生成一张高级商业棚拍形象图。",
    style ? `风格采用${style.name}，${style.prompt}` : "风格采用新中式轻礼服。",
    productNames.length ? `搭配${productNames.join("、")}。` : "由系统推荐商品搭配。",
  ].join("");
}

export function StudioCreationFlow({
  catalog,
  projectId,
}: StudioCreationFlowProps) {
  const initialStyleName = catalog.styles[0]?.name || "新中式轻礼服";
  const [selectedStyleName, setSelectedStyleName] = useState(initialStyleName);
  const [activeCategoryName, setActiveCategoryName] = useState("全部");
  const [selectedProductNames, setSelectedProductNames] = useState(
    catalog.products.slice(0, 3).map((product) => product.name),
  );

  const selectedStyle =
    catalog.styles.find((style) => style.name === selectedStyleName) ||
    catalog.styles[0];
  const visibleProducts =
    activeCategoryName === "全部"
      ? catalog.products
      : catalog.products.filter((product) => product.category === activeCategoryName);
  const selectedProductSet = useMemo(
    () => new Set(selectedProductNames),
    [selectedProductNames],
  );
  const selectedProducts = catalog.products.filter((product) =>
    selectedProductSet.has(product.name),
  );
  const prompt = buildPrompt(selectedStyle, selectedProductNames);

  function toggleProduct(productName: string) {
    setSelectedProductNames((current) =>
      current.includes(productName)
        ? current.filter((name) => name !== productName)
        : [...current, productName],
    );
  }

  return (
    <>
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
            {catalog.styles.map((style) => {
              const isSelected = selectedStyleName === style.name;

              return (
                <button
                  key={style.name}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedStyleName(style.name)}
                  className={`rounded-md border p-4 text-left ${
                    isSelected
                      ? "border-red-200 bg-red-50"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{style.name}</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-stone-500">
                      {style.tag || "风格"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-stone-500">
                    {style.prompt}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-red-700">商品搭配</p>
              <h2 className="mt-1 text-xl font-semibold">
                从商品库挑选真实商品和素材。
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500">
              已选 {selectedProductNames.length} 件
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveCategoryName("全部")}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left ${
                  activeCategoryName === "全部"
                    ? "border-red-200 bg-red-50"
                    : "border-stone-200 bg-stone-50"
                }`}
              >
                <span className="text-sm font-medium">全部商品</span>
                <span className="text-xs text-stone-400">{catalog.products.length}</span>
              </button>
              {catalog.productCategories.map((category) => {
                const Icon = getCategoryIcon(category.name);
                const isActive = activeCategoryName === category.name;

                return (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setActiveCategoryName(category.name)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left ${
                      isActive
                        ? "border-red-200 bg-red-50"
                        : "border-stone-200 bg-stone-50"
                    }`}
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
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {visibleProducts.map((product) => {
                  const isSelected = selectedProductSet.has(product.name);

                  return (
                    <button
                      key={product.name}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleProduct(product.name)}
                      className={`overflow-hidden rounded-md border text-left ${
                        isSelected
                          ? "border-red-300 bg-red-50"
                          : "border-stone-200 bg-white"
                      }`}
                    >
                      <div className="relative">
                        <Image
                          src={product.image || publicImages.flatlay}
                          alt={product.name}
                          width={420}
                          height={420}
                          className="aspect-square w-full object-cover"
                        />
                        <span
                          className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full ${
                            isSelected
                              ? "bg-red-700 text-white"
                              : "bg-white/90 text-stone-500"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-current" />
                          )}
                        </span>
                      </div>
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
                    </button>
                  );
                })}
              </div>

              <div className="rounded-md bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">已选商品</p>
                  <button
                    type="button"
                    onClick={() => setSelectedProductNames([])}
                    disabled={!selectedProductNames.length}
                    className="text-xs text-stone-500 disabled:opacity-40"
                  >
                    清空选择
                  </button>
                </div>
                {selectedProducts.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedProducts.map((product) => (
                      <button
                        key={product.name}
                        type="button"
                        onClick={() => toggleProduct(product.name)}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-stone-600"
                      >
                        {product.name}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-stone-500">
                    暂未选择商品，生成时会使用系统推荐搭配。
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside>
        <StudioGeneratePanel
          prompt={prompt}
          projectId={projectId}
          initialInputImageUrl={publicImages.portrait}
          selectedProducts={selectedProductNames}
          styleName={selectedStyle?.name || "新中式轻礼服"}
          videoTemplates={catalog.videoTemplates}
          scriptTemplates={catalog.scriptTemplates}
          musicTracks={catalog.musicTracks}
        />
      </aside>
    </>
  );
}
