import {
  adminModules,
  providerCards,
  publicImages,
} from "@/lib/demo-data";
import { getCatalogData } from "@/lib/catalog";
import { getCategoryIcon } from "@/lib/category-icons";
import { getAdminPageState } from "@/lib/admin-page";
import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { ArrowLeft, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function AdminPage() {
  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const catalog = await getCatalogData();
  const moduleLinks: Record<string, string> = {
    商品库: "/admin/products",
    风格模板: "/admin/styles",
    视频脚本: "/admin/video-templates",
    音乐库: "/admin/music",
    模型配置: "/admin/models",
    生成任务: "/admin/jobs",
    上线体检: "/admin/launch",
  };

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回大吉形象
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            新增配置
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-8 rounded-md border border-stone-200 bg-white p-6">
          <p className="text-sm font-medium text-red-700">后台控制台</p>
          <h1 className="mt-2 text-3xl font-semibold">
            管理商品库、风格模板、视频脚本、音乐和模型。
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            第一阶段后台只给项目负责人使用。后续接入多员工、多角色权限。
          </p>
          <p className="mt-3 text-xs text-stone-400">
            当前数据源：{catalog.source === "supabase" ? "Supabase" : "演示数据"}
          </p>
        </section>

        <section className="mb-8 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          {adminModules.map((module) => {
            const Icon = module.icon;
            const href = moduleLinks[module.name] || "/admin";
            return (
              <Link
                key={module.name}
                href={href}
                className="rounded-md border border-stone-200 bg-white p-5"
              >
                <Icon className="h-5 w-5 text-red-700" />
                <h2 className="mt-4 font-semibold">{module.name}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  {module.detail}
                </p>
              </Link>
            );
          })}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-md border border-stone-200 bg-white p-6">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-semibold">商品库</h2>
                <p className="mt-1 text-sm text-stone-500">
                  同时管理真实可售商品和搭配素材。
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-500">
                <Search className="h-4 w-4" />
                搜索商品
              </div>
            </div>
            <div className="space-y-3">
              {catalog.products.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center gap-4 rounded-md border border-stone-200 p-3"
                >
                  <Image
                    src={product.image || publicImages.flatlay}
                    alt={product.name}
                    width={128}
                    height={128}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs text-stone-500">
                      {product.category}｜{product.type}
                    </p>
                  </div>
                  <span className="text-sm text-red-700">{product.price}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold">分类结构</h2>
            <div className="mt-5 space-y-3">
              {catalog.productCategories.map((category) => {
                const Icon = getCategoryIcon(category.name);
                return (
                  <div
                    key={category.name}
                    className="rounded-md border border-stone-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon className="h-4 w-4 text-red-700" />
                        {category.name}
                      </span>
                      <span className="text-xs text-stone-400">
                        {category.count ? `${category.count} 项` : "已启用"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-stone-500">
                      {category.items?.join("、") || "来自 Supabase 商品分类"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-md border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold">风格模板</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {catalog.styles.map((style) => (
                <div
                  key={style.name}
                  className="rounded-md border border-stone-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{style.name}</h3>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">
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

          <div className="rounded-md border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-semibold">模型配置</h2>
            <div className="mt-5 space-y-3">
              {catalog.providers.map((provider) => {
                const Icon =
                  providerCards.find((item) => item.name === provider.name)
                    ?.icon || providerCards[0].icon;
                return (
                  <div
                    key={provider.name}
                    className="flex items-center gap-4 rounded-md border border-stone-200 p-4"
                  >
                    <Icon className="h-5 w-5 text-red-700" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{provider.name}</h3>
                      <p className="mt-1 text-xs text-stone-500">
                        {provider.ability}
                      </p>
                    </div>
                    <span className="text-xs text-red-700">
                      {provider.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
