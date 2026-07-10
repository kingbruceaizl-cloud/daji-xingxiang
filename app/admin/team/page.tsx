import { AdminGuardMessage } from "@/components/admin/admin-guard-message";
import { TeamManager } from "@/components/admin/team-manager";
import { getAdminPageState } from "@/lib/admin-page";
import { getAdminTeamData } from "@/lib/admin-team";
import { ArrowLeft } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";

async function AdminTeamContent() {
  await connection();
  const adminState = await getAdminPageState();
  if (!adminState.allowed) {
    return <AdminGuardMessage message={adminState.message} />;
  }

  const team = await getAdminTeamData();
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/admin" className="flex items-center gap-3 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" />
            返回后台
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-6">
          <p className="text-sm font-medium text-red-700">团队权限</p>
          <h1 className="mt-2 text-3xl font-semibold">管理员工角色与真实模型用量。</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            第一位账号为负责人，后续新账号默认为员工。负责人管理角色，负责人和管理员都可以调整模型额度。
          </p>
          <p className="mt-2 text-xs text-stone-400">
            当前数据源：{team.source === "supabase" ? "Supabase" : "演示数据"}
          </p>
        </section>

        <TeamManager
          members={team.members}
          currentUserId={adminState.userId}
          currentRole={adminState.role}
        />
      </div>
    </main>
  );
}

export default function AdminTeamPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#fbfaf7] p-8 text-stone-950">
          正在加载团队权限...
        </main>
      }
    >
      <AdminTeamContent />
    </Suspense>
  );
}
