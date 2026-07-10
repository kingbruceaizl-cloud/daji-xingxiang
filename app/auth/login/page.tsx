import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <AuthShell>
      <LoginForm className="w-full" />
    </AuthShell>
  );
}
