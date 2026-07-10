import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { isPublicSignupEnabled } from "@/lib/signup-policy";

export async function AuthButton() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-sm text-[#6f6a65] sm:block">{user.email}</span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">登录</Link>
      </Button>
      {isPublicSignupEnabled() ? (
        <Button asChild size="sm" variant={"default"} className="rounded-full px-4">
          <Link href="/auth/sign-up">注册</Link>
        </Button>
      ) : null}
    </div>
  );
}
