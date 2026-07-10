import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/sign-up-form";
import { isPublicSignupEnabled } from "@/lib/signup-policy";
import Link from "next/link";

export default function Page() {
  if (!isPublicSignupEnabled()) {
    return (
      <AuthShell>
        <div className="w-full rounded-md border border-stone-200 bg-white p-7">
          <p className="text-sm font-semibold text-red-700">团队账号</p>
          <h1 className="mt-3 text-3xl font-semibold">当前仅限邀请注册。</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            请联系大吉形象项目负责人发送员工邀请，收到邮件后即可设置账号密码。
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800"
          >
            返回登录
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <SignUpForm className="w-full" />
    </AuthShell>
  );
}
