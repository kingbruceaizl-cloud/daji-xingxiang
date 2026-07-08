import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <nav className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 text-sm">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-red-700 text-white">
                吉
              </span>
              <span>大吉形象</span>
            </Link>
            <div className="hidden items-center gap-5 text-stone-600 md:flex">
              <Link href="/protected" className="hover:text-stone-950">
                工作台
              </Link>
              <Link href="/projects/new" className="hover:text-stone-950">
                形象大师
              </Link>
              <Link href="/projects" className="hover:text-stone-950">
                项目
              </Link>
              <Link href="/admin" className="hover:text-stone-950">
                后台
              </Link>
            </div>
          </div>
          <div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </div>
      </nav>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-5 py-8">
        {children}
      </div>
    </main>
  );
}
