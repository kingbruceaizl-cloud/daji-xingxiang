import { BrandMark } from "@/components/brand/brand-mark";
import Image from "next/image";
import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="grid min-h-[100dvh] bg-white lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden lg:block">
        <Image
          src="/brand/team-service.jpg"
          alt="大吉形象顾问团队为客户提供形象设计服务"
          fill
          priority
          sizes="55vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14">
          <BrandMark tone="light" priority />
          <div className="max-w-xl text-white">
            <p className="text-sm font-medium">专业形象管理，正在进入 AI 工作流</p>
            <h1 className="font-display mt-4 text-4xl font-bold leading-[1.35] xl:text-5xl">
              从客户素材到完整形象方案，都在一个工作台完成。
            </h1>
          </div>
        </div>
      </section>

      <section className="flex min-h-[100dvh] flex-col bg-[#f7f6f3] px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between lg:justify-end">
          <BrandMark className="lg:hidden" priority />
          <Link
            href="/"
            className="text-sm font-medium text-[#6f6a65] transition-colors hover:text-[#c91d16]"
          >
            返回首页
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10">
          {children}
        </div>
      </section>
    </main>
  );
}
