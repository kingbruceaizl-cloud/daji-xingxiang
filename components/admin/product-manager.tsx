"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadButton } from "@/components/upload/upload-button";
import type { AdminProductItem } from "@/lib/admin-products";
import { publicImages } from "@/lib/demo-data";
import { Loader2, PackagePlus, Pencil, Power, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProductDraft = Omit<AdminProductItem, "id" | "tags" | "price"> & {
  id?: string;
  price: string;
  tags: string;
};

const emptyDraft: ProductDraft = {
  name: "",
  type: "sku",
  categoryName: "服装",
  sku: "",
  price: "",
  purchaseUrl: "",
  imageUrl: "",
  promptText: "",
  tags: "",
  isActive: true,
};

function toDraft(product: AdminProductItem): ProductDraft {
  return {
    ...product,
    price: product.price === null ? "" : String(product.price),
    tags: product.tags.join("，"),
  };
}

export function ProductManager({
  products,
  categories,
}: {
  products: AdminProductItem[];
  categories: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function update<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setMessage(null);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const endpoint = draft.id
        ? `/api/admin/products/${encodeURIComponent(draft.id)}`
        : "/api/admin/products";
      const response = await fetch(endpoint, {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.message || (response.ok ? "商品已保存。" : "商品保存失败。"));
      if (response.ok) {
        resetDraft();
        router.refresh();
      }
    } catch {
      setMessage("商品保存请求失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProduct(product: AdminProductItem) {
    if (!product.id) {
      return;
    }
    setActiveProductId(product.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(product.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !product.isActive }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.message || (response.ok ? "商品状态已更新。" : "商品状态更新失败。"));
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setMessage("商品状态更新失败，请稍后重试。");
    } finally {
      setActiveProductId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
      <form
        onSubmit={saveProduct}
        className="rounded-md border border-stone-200 bg-white p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              {draft.id ? "编辑商品" : "新增商品"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              商品信息会直接用于顾问选择与 AI 搭配提示。
            </p>
          </div>
          {draft.id ? (
            <Button type="button" variant="ghost" size="icon" onClick={resetDraft} title="取消编辑">
              <RotateCcw />
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="product-name">商品名称</Label>
            <Input
              id="product-name"
              className="mt-2"
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="例如：云纹缎面上衣"
              required
            />
          </div>

          <div>
            <Label htmlFor="product-type">商品类型</Label>
            <select
              id="product-type"
              value={draft.type}
              onChange={(event) => update("type", event.target.value as "sku" | "asset")}
              className="mt-2 h-11 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-red-300"
            >
              <option value="sku">真实可售商品</option>
              <option value="asset">搭配素材</option>
            </select>
          </div>
          <div>
            <Label htmlFor="product-category">商品分类</Label>
            <Input
              id="product-category"
              className="mt-2"
              list="product-category-options"
              value={draft.categoryName}
              onChange={(event) => update("categoryName", event.target.value)}
            />
            <datalist id="product-category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="product-sku">商品编号</Label>
            <Input
              id="product-sku"
              className="mt-2"
              value={draft.sku}
              onChange={(event) => update("sku", event.target.value)}
              placeholder="例如：大吉服装001"
            />
          </div>
          <div>
            <Label htmlFor="product-price">销售价格</Label>
            <Input
              id="product-price"
              className="mt-2"
              type="number"
              min="0"
              step="0.01"
              value={draft.price}
              onChange={(event) => update("price", event.target.value)}
              placeholder="搭配素材可留空"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="product-image">商品图片地址</Label>
            <Input
              id="product-image"
              className="mt-2"
              type="url"
              value={draft.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              placeholder="上传素材后会自动填写"
            />
            <div className="mt-3">
              <UploadButton
                bucket="product-assets"
                onUploaded={(asset) =>
                  update("imageUrl", asset.preview_url || asset.public_url || "")
                }
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="product-purchase">购买链接</Label>
            <Input
              id="product-purchase"
              className="mt-2"
              type="url"
              value={draft.purchaseUrl}
              onChange={(event) => update("purchaseUrl", event.target.value)}
              placeholder="真实商品可填写商城链接"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="product-prompt">AI 搭配描述</Label>
            <textarea
              id="product-prompt"
              value={draft.promptText}
              onChange={(event) => update("promptText", event.target.value)}
              className="mt-2 min-h-24 w-full rounded-md border border-stone-200 bg-white p-3 text-sm leading-6 outline-none focus:border-red-300"
              placeholder="描述材质、颜色、版型与适用场合"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="product-tags">标签</Label>
            <Input
              id="product-tags"
              className="mt-2"
              value={draft.tags}
              onChange={(event) => update("tags", event.target.value)}
              placeholder="例如：新中式，宴会，轻礼服"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <PackagePlus />}
            {draft.id ? "保存修改" : "保存商品"}
          </Button>
          {message ? (
            <p className="text-right text-sm text-stone-500" aria-live="polite">
              {message}
            </p>
          ) : null}
        </div>
      </form>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <p className="text-sm font-semibold">商品列表</p>
          <span className="text-xs text-stone-400">{products.length} 件</span>
        </div>
        <div className="max-h-[860px] divide-y divide-stone-100 overflow-y-auto">
          {products.map((product) => (
            <article key={product.id || product.name} className="flex gap-4 p-4">
              <Image
                src={product.imageUrl || publicImages.flatlay}
                alt={product.name}
                width={96}
                height={96}
                className="h-16 w-16 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{product.name}</h2>
                    <p className="mt-1 text-xs text-stone-500">
                      {product.categoryName}｜
                      {product.type === "sku" ? "真实商品" : "搭配素材"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                      product.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {product.isActive ? "启用" : "停用"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setDraft(toDraft(product))}>
                    <Pencil />
                    编辑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={activeProductId === product.id}
                    onClick={() => void toggleProduct(product)}
                  >
                    {activeProductId === product.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Power />
                    )}
                    {product.isActive ? "停用" : "启用"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
