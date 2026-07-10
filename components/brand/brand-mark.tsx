import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  className?: string;
  href?: string;
  priority?: boolean;
  tone?: "dark" | "light";
};

export function BrandMark({
  className,
  href = "/",
  priority = false,
  tone = "dark",
}: BrandMarkProps) {
  const content =
    tone === "light" ? (
      <Image
        src="/brand/daji-white-logo.png"
        alt="大吉形象"
        width={195}
        height={36}
        priority={priority}
        className="h-8 w-auto object-contain"
      />
    ) : (
      <span className="flex items-center gap-2.5">
        <Image
          src="/brand/daji-favicon.png"
          alt=""
          width={36}
          height={36}
          priority={priority}
          className="h-9 w-9"
        />
        <span className="font-display text-lg font-bold text-[#171513]">
          大吉形象
        </span>
      </span>
    );

  return (
    <Link
      href={href}
      aria-label="返回大吉形象首页"
      className={cn(
        "inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c91d16] focus-visible:ring-offset-2",
        className,
      )}
    >
      {content}
    </Link>
  );
}
