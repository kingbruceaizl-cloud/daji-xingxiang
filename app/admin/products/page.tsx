import { JsonCreateForm } from "@/components/admin/json-create-form";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { publicImages } from "@/lib/demo-data";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

const sampleProduct = `{
  "name": "云纹缎面上衣",
  "type": "sku",
  "categoryName": "服装",
  "sku": "DJ-CL-001",
  "price": 399,
  "imageUrl": "${publicImages.rack}",
  "promptText": "新中式云纹缎面上衣，低饱和红金点缀，适合宴会形象",
  "tags": "新中式,宴会,真实商品"
}`;

const productFieldHints = [
  "商品名称：展示给形象顾问和客户看的商品或素材名称。",
  "商品类型：真实商品和搭配素材二选一，模板里已给出真实商品写法。",
  "分类名称：可填写发型、妆造、服装、裤子、鞋子、包袋、饰品或视频道具。",
  "价格：真实商品填写数字金额，搭配素材可以留空或填写 0。",
  "提示词描述：用于生成形象图时拼接商品材质、风格和搭配重点。",
  "标签：多个标签用中文逗号分隔，方便后续筛选。",
];

async function AdminProductsContent() {
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
          <p className="text-sm font-medium text-red-700">商品库管理</p>
          <h1 className="mt-2 text-3xl font-semibold">新增真实商品或搭配素材。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            当前数据源：{catalog.source === "supabase" ? "Supabase" : "演示数据"}。
            未配置 Supabase 时，提交会返回中文配置提示。
          </p>
          <div className="mt-6 space-y-3">
            {catalog.products.slice(0, 6).map((product) => (
              <div
                key={product.name}
                className="flex items-center gap-4 rounded-md border border-stone-200 bg-white p-3"
              >
                <Image
                  src={product.image || publicImages.flatlay}
                  alt={product.name}
                  width={96}
                  height={96}
                  className="h-14 w-14 rounded-md object-cover"
                />
                <div>
                  <h2 className="text-sm font-semibold">{product.name}</h2>
                  <p className="mt-1 text-xs text-stone-500">
                    {product.category}｜{product.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <JsonCreateForm
          endpoint="/api/admin/products"
          initialValue={sampleProduct}
          fieldHints={productFieldHints}
          submitText="保存商品"
        />
      </div>
    </main>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在加载商品库...
        </main>
      }
    >
      <AdminProductsContent />
    </Suspense>
  );
}
