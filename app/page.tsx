import { BrandMark } from "@/components/brand/brand-mark";
import { getCatalogData } from "@/lib/catalog";
import {
  adminModules,
  providerCards,
  workflowSteps,
} from "@/lib/demo-data";
import {
  ArrowRight,
  Check,
  ChevronRight,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

const serviceHighlights = [
  {
    title: "场合形象方案",
    description:
      "根据客户的工作、社交与生活场景，组合风格、妆发、服饰和配件。",
    image: "/brand/occasion-wear.jpg",
    alt: "大吉形象场合服饰参考",
  },
  {
    title: "顾问团队工作流",
    description:
      "把咨询判断沉淀为可复用步骤，让每次服务更稳定，也更方便继续优化。",
    image: "/brand/team-service.jpg",
    alt: "大吉形象顾问团队为客户进行造型设计",
  },
];

async function HomeContent() {
  await connection();

  const catalog = await getCatalogData();
  const featuredProducts = catalog.products.slice(0, 3);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f6f3] text-[#171513]">
      <section className="relative min-h-[clamp(620px,82dvh,820px)] overflow-hidden text-white">
        <Image
          src="/brand/store-baiyun.jpg"
          alt="大吉形象白云形象管理事务所门店"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/55" />

        <nav className="relative z-10 border-b border-white/15">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
            <BrandMark tone="light" priority />
            <div className="hidden items-center gap-7 text-sm font-medium text-white/85 lg:flex">
              <a href="#workflow" className="transition-colors hover:text-white">
                工作流程
              </a>
              <a href="#services" className="transition-colors hover:text-white">
                形象服务
              </a>
              <a href="#products" className="transition-colors hover:text-white">
                商品库
              </a>
              <Link href="/admin" className="transition-colors hover:text-white">
                后台管理
              </Link>
              <Link href="/auth/login" className="transition-colors hover:text-white">
                登录
              </Link>
            </div>
            <Link
              href="/projects/new"
              className="brand-focus inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#c91d16] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#a91410] sm:px-5"
            >
              开始设计
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[calc(clamp(620px,82dvh,820px)-72px)] max-w-7xl items-center justify-center px-5 pb-12 pt-8 text-center lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold text-white/85 sm:text-base">
              大吉个人形象管理事务所
            </p>
            <h1 className="font-display mt-5 text-4xl font-bold leading-[1.25] text-white sm:text-5xl lg:text-6xl">
              一站式 AI 形象设计工作台
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              上传客户素材，选择风格与商品，生成形象图片和变装短视频。
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/projects/new"
                className="brand-focus inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-[#c91d16] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#a91410]"
              >
                新建形象方案
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/studio/demo"
                className="brand-focus inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-white/45 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <PlayCircle className="h-4 w-4" />
                查看演示
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-5 py-12 text-center sm:py-16">
          <Image
            src="/brand/quote.png"
            alt=""
            width={80}
            height={62}
            className="mx-auto h-auto w-14 invert opacity-70"
          />
          <blockquote className="font-display mx-auto mt-5 max-w-3xl text-xl font-semibold leading-9 text-[#2b2825] sm:text-2xl sm:leading-10">
            专业判断来自顾问，重复工作交给系统，让每一份形象方案更完整、更稳定。
          </blockquote>
          <p className="mt-4 text-sm text-[#77716c]">大吉形象 AI 工作台</p>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-20 bg-[#f7f6f3]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-[#c91d16]">形象大师无画布版</p>
            <h2 className="font-display mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              六个步骤，完成一份客户形象交付
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#6f6a65]">
              操作按顾问真实服务顺序展开，无需学习复杂画布。
            </p>
          </div>

          <div className="mt-12 grid border-l border-t border-[#ddd8d2] sm:grid-cols-2 lg:grid-cols-3">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="min-h-56 border-b border-r border-[#ddd8d2] bg-white p-6 transition-colors duration-200 hover:bg-[#fcf7f6] lg:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-red-50 text-[#c91d16]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-sm font-semibold text-[#aaa39d]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="font-display mt-6 text-lg font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6f6a65]">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-[#c91d16]">场合服饰 + 形象管理</p>
            <h2 className="font-display mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              保留顾问服务的温度，提升方案制作效率
            </h2>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {serviceHighlights.map((service) => (
              <article key={service.title}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-[#eeeae5]">
                  <Image
                    src={service.image}
                    alt={service.alt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                  />
                </div>
                <div className="pt-6">
                  <h3 className="font-display text-2xl font-bold">{service.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#6f6a65]">
                    {service.description}
                  </p>
                  <Link
                    href="/projects/new"
                    className="brand-focus mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#c91d16] hover:text-[#a91410]"
                  >
                    进入设计流程
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="scroll-mt-20 bg-[#f7f6f3]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#e8e4df]">
            <Image
              src="/brand/image-consultation.jpg"
              alt="大吉形象顾问与客户进行形象咨询"
              fill
              sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#c91d16]">商品库与模型路由</p>
            <h2 className="font-display mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              风格、商品和模型，都由后台统一配置
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#6f6a65]">
              商品库同时支持真实可售 SKU 和搭配素材。系统根据当前任务选择图像、视频或文字模型，顾问只需要确认方案。
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {featuredProducts.map((product) => (
                <div key={product.name} className="min-w-0 border-l-2 border-[#c91d16] pl-4">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="mt-1 text-xs text-[#77716c]">
                    {product.category} · {product.type}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/projects/new"
                className="brand-focus inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-[#c91d16] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#a91410]"
              >
                开始客户方案
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/admin"
                className="brand-focus inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-[#d7d1ca] bg-white px-7 text-sm font-semibold text-[#2b2825] transition-colors hover:border-[#c91d16]/30 hover:bg-red-50"
              >
                查看后台
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-red-50 text-[#c91d16]">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="font-display mt-5 text-3xl font-bold leading-tight sm:text-4xl">
              多模型能力，按任务自动选择
            </h2>
            <p className="mt-4 text-base leading-7 text-[#6f6a65]">
              第一阶段直连火山方舟，同时预留 OpenAI、即梦、可灵与通义。
            </p>
          </div>

          <div className="mt-10 grid border-l border-t border-[#e6e2dd] sm:grid-cols-2 lg:grid-cols-5">
            {providerCards.map((provider) => (
              <div key={provider.name} className="border-b border-r border-[#e6e2dd] p-5">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#c91d16]" />
                  <h3 className="font-display text-sm font-bold">{provider.name}</h3>
                </div>
                <p className="mt-2 text-xs font-medium text-[#c91d16]">{provider.status}</p>
                <p className="mt-3 text-xs leading-5 text-[#6f6a65]">{provider.ability}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 border-t border-[#e6e2dd] pt-10 sm:grid-cols-2 lg:grid-cols-5">
            {adminModules.slice(0, 5).map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.name}>
                  <Icon className="h-5 w-5 text-[#c91d16]" />
                  <h3 className="font-display mt-4 text-sm font-bold">{module.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#77716c]">{module.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e6e2dd] bg-[#f7f6f3]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <BrandMark />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#6f6a65]">
            <Link href="/projects" className="hover:text-[#c91d16]">项目</Link>
            <Link href="/auth/login" className="hover:text-[#c91d16]">登录</Link>
            <Link href="/admin" className="hover:text-[#c91d16]">后台</Link>
          </div>
          <p className="text-xs text-[#8b847e]">© 2026 大吉形象</p>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-[100dvh] place-items-center bg-[#f7f6f3] text-sm text-[#6f6a65]">
          正在加载大吉形象...
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
