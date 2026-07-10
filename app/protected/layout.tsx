import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ProductHeader } from "@/components/brand/product-header";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f6f3] text-[#171513]">
      <ProductHeader
        section="工作台"
        action={
          <div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        }
      />
      <div className="mx-auto min-h-[calc(100dvh-72px)] max-w-7xl px-5 py-8 lg:px-8">
        {children}
      </div>
    </main>
  );
}
