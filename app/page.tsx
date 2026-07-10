import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import {
  adminModules,
  providerCards,
  publicImages,
  stats,
  workflowSteps,
} from "@/lib/demo-data";
import { getCatalogData } from "@/lib/catalog";
import { ArrowRight, Check, Sparkles, Upload, WandSparkles } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

async function HomeContent() {
  await connection();

  const catalog = await getCatalogData();
  const featuredProducts = catalog.products.slice(0, 3);
  const featuredStyles = catalog.styles.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <nav className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#fbfaf7]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 text-sm">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-red-700 text-white">
              吉
            </span>
            <span>大吉形象</span>
          </Link>
          <div className="hidden items-center gap-6 text-stone-600 md:flex">
            <a href="#workflow" className="hover:text-stone-950">
              工作流
            </a>
            <a href="#products" className="hover:text-stone-950">
              商品库
            </a>
            <a href="#admin" className="hover:text-stone-950">
              后台
            </a>
          </div>
          <div className="flex items-center gap-2">
            {!hasEnvVars ? (
            <Link
                href="/projects/new"
                className="rounded-md border border-stone-300 px-3 py-2 text-stone-700 hover:bg-white"
              >
                体验演示
              </Link>
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-800">
            <Sparkles className="h-4 w-4" />
            形象大师无画布版 MVP
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-stone-950 md:text-5xl">
            商品库 + AI，快速完成
            <br />
            客户变妆设计。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            大吉形象把客户素材、发型妆造、服装商品、饰品素材和视频脚本放进同一条工作流。
            第一阶段先做步骤式形象大师，后续再扩展画布和多员工权限。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-5 py-3 text-sm font-medium text-white hover:bg-stone-800"
            >
              开始形象设计
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-900 hover:bg-stone-50"
            >
              查看后台
            </Link>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-stone-200 bg-white p-4"
              >
                <div className="text-2xl font-semibold">{item.value}</div>
                <div className="mt-1 text-sm text-stone-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Image
              src={publicImages.portrait}
              alt="客户形象参考"
              width={900}
              height={1125}
              className="aspect-[4/5] w-full rounded-md object-cover"
            />
            <div className="rounded-md border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Upload className="h-4 w-4 text-red-700" />
                客户素材已就绪
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                支持图片和视频上传，后续统一保存到 Supabase 存储。
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">推荐搭配</span>
                <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">
                  新中式轻礼服
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {featuredProducts.map((product) => (
                  <div key={product.name} className="min-w-0">
                    <Image
                      src={product.image || publicImages.flatlay}
                      alt={product.name}
                      width={360}
                      height={360}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                    <p className="mt-2 truncate text-xs font-medium">
                      {product.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-stone-950 p-5 text-white">
              <div className="flex items-center gap-2 text-sm text-red-100">
                <WandSparkles className="h-4 w-4" />
                自动提示词
              </div>
              <p className="mt-4 text-lg leading-8">
                生成一张东方高级感棚拍形象图，保留客户五官特征，使用新中式缎面上衣、珍珠耳饰和柔和红棕妆面。
              </p>
            </div>
            <Image
              src={publicImages.flatlay}
              alt="商品平铺参考"
              width={900}
              height={560}
              className="aspect-[16/10] w-full rounded-md object-cover"
            />
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-red-700">核心流程</p>
              <h2 className="mt-2 text-3xl font-semibold">不用画布，也能完成完整交付。</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-stone-500">
              MVP 先把复杂创作拆成清晰步骤，适合形象顾问逐项确认。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-md border border-stone-200 bg-[#fbfaf7] p-5"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-red-700" />
                    <span className="text-sm text-stone-400">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-sm font-medium text-red-700">商品库</p>
            <h2 className="mt-2 text-3xl font-semibold">真实商品和搭配素材都能管理。</h2>
            <p className="mt-4 text-sm leading-6 text-stone-500">
              商品既可以用于实际成交，也可以只作为 AI 生成的形象素材。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {featuredStyles.map((style) => (
              <div
                key={style.name}
                className="rounded-md border border-stone-200 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{style.name}</h3>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                    {style.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-500">
                  {style.prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="admin" className="bg-stone-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-red-200">后台控制台</p>
              <h2 className="mt-2 text-3xl font-semibold">
                模型、商品、视频脚本、音乐都从后台配置。
              </h2>
            </div>
            <Link
              href="/admin"
              className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-950"
            >
              进入后台预览
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {adminModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.name}
                  className="rounded-md border border-white/10 bg-white/5 p-5"
                >
                  <Icon className="h-5 w-5 text-red-200" />
                  <h3 className="mt-4 font-semibold">{module.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-300">
                    {module.detail}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-5">
            {providerCards.map((provider) => (
              <div
                key={provider.name}
                className="rounded-md border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-red-200" />
                  <span className="font-medium">{provider.name}</span>
                </div>
                <p className="mt-2 text-xs text-red-100">{provider.status}</p>
                <p className="mt-2 text-sm leading-6 text-stone-300">
                  {provider.ability}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在加载大吉形象...
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
