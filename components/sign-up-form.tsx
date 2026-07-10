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

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("两次输入的密码不一致");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(formatAuthErrorMessage(error, "注册失败，请稍后重试。"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div>
        <p className="text-sm font-semibold text-[#c91d16]">创建工作账号</p>
        <h1 className="font-display mt-3 text-3xl font-bold text-[#171513] sm:text-4xl">
          注册大吉形象
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6f6a65]">
          创建账号后即可进入形象设计工作台。
        </p>
      </div>

      <form onSubmit={handleSignUp} className="rounded-md border border-[#e6e2dd] bg-white p-6 sm:p-8">
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
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="repeat-password">再次输入密码</Label>
            <Input
              id="repeat-password"
              type="password"
              autoComplete="new-password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full rounded-full" disabled={isLoading}>
            {isLoading ? "正在创建账号..." : "注册"}
          </Button>
        </div>
        <div className="mt-5 text-center text-sm text-[#6f6a65]">
          已有账号？{" "}
          <Link href="/auth/login" className="font-semibold text-[#c91d16] hover:underline">
            登录
          </Link>
        </div>
      </form>
    </div>
  );
}
