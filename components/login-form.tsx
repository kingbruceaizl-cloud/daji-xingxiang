"use client";

import { cn } from "@/lib/utils";
import { formatAuthErrorMessage } from "@/lib/auth-error";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/protected");
    } catch (error: unknown) {
      setError(formatAuthErrorMessage(error, "登录失败，请检查邮箱和密码。"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div>
        <p className="text-sm font-semibold text-[#c91d16]">欢迎回来</p>
        <h1 className="font-display mt-3 text-3xl font-bold text-[#171513] sm:text-4xl">
          登录大吉形象
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6f6a65]">
          输入邮箱和密码，继续客户形象设计。
        </p>
      </div>

      <form onSubmit={handleLogin} className="rounded-md border border-[#e6e2dd] bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">密码</Label>
              <Link
                href="/auth/forgot-password"
                className="ml-auto inline-block text-sm font-medium text-[#c91d16] underline-offset-4 hover:underline"
              >
                忘记密码？
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full rounded-full" disabled={isLoading}>
            {isLoading ? "正在登录..." : "登录"}
          </Button>
        </div>
        <div className="mt-5 text-center text-sm text-[#6f6a65]">
          还没有账号？{" "}
          <Link href="/auth/sign-up" className="font-semibold text-[#c91d16] hover:underline">
            注册
          </Link>
        </div>
      </form>
    </div>
  );
}
