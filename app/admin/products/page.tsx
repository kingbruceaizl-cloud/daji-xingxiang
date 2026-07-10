import { ProductManager } from "@/components/admin/product-manager";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { getCatalogData } from "@/lib/catalog";
import { getAdminPageState } from "@/lib/admin-page";
import { getAdminProductsData } from "@/lib/admin-products";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

async function AdminProductsContent() {
  await connection();

  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const [catalog, adminProducts] = await Promise.all([
    getCatalogData(),
    getAdminProductsData(),
  ]);

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

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-6">
          <p className="text-sm font-medium text-red-700">商品库管理</p>
          <h1 className="mt-2 text-3xl font-semibold">新增真实商品或搭配素材。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            当前数据源：{catalog.source === "supabase" ? "Supabase" : "演示数据"}。
            未配置 Supabase 时，提交会返回中文配置提示。
          </p>
        </section>
        <ProductManager
          products={adminProducts.products}
          categories={catalog.productCategories.map((category) => category.name)}
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
