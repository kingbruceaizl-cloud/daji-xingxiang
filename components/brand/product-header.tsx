import { BrandMark } from "@/components/brand/brand-mark";
import Link from "next/link";

type ProductHeaderProps = {
  action?: React.ReactNode;
  section?: string;
};

export function ProductHeader({ action, section }: ProductHeaderProps) {
  return (
    <header className="border-b border-[#e6e2dd] bg-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark />
          {section ? (
            <>
              <span className="hidden h-6 w-px bg-[#e6e2dd] sm:block" />
              <span className="hidden truncate text-sm font-medium text-[#6f6a65] sm:block">
                {section}
              </span>
            </>
          ) : null}
        </div>

        <nav className="hidden items-center gap-5 text-sm font-medium text-[#6f6a65] lg:flex">
          <Link href="/protected" className="transition-colors hover:text-[#c91d16]">
            工作台
          </Link>
          <Link href="/projects/new" className="transition-colors hover:text-[#c91d16]">
            形象大师
          </Link>
          <Link href="/projects" className="transition-colors hover:text-[#c91d16]">
            项目
          </Link>
          <Link href="/admin" className="transition-colors hover:text-[#c91d16]">
            后台
          </Link>
        </nav>

        <div className="shrink-0">{action}</div>
      </div>
    </header>
  );
}
