import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/login-form";
import { isPublicSignupEnabled } from "@/lib/signup-policy";

export default function Page() {
  return (
    <AuthShell>
      <LoginForm className="w-full" allowPublicSignup={isPublicSignupEnabled()} />
    </AuthShell>
  );
}
