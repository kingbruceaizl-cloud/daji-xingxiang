"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamMember } from "@/lib/admin-team";
import { Loader2, MailPlus, Save, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const roleLabels = {
  owner: "负责人",
  admin: "管理员",
  staff: "员工",
};

function TeamMemberEditor({
  member,
  currentUserId,
  currentRole,
}: {
  member: TeamMember;
  currentUserId: string | null;
  currentRole: string | null;
}) {
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [monthlyTextLimit, setMonthlyTextLimit] = useState(
    String(member.limits.monthlyTextLimit),
  );
  const [monthlyImageLimit, setMonthlyImageLimit] = useState(
    String(member.limits.monthlyImageLimit),
  );
  const [monthlyVideoLimit, setMonthlyVideoLimit] = useState(
    String(member.limits.monthlyVideoLimit),
  );
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState(
    String(member.limits.maxConcurrentJobs),
  );
  const [isGenerationEnabled, setIsGenerationEnabled] = useState(
    member.limits.isGenerationEnabled,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canEditRole = currentRole === "owner" && member.id !== currentUserId;

  async function saveMember() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/team/${encodeURIComponent(member.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(canEditRole ? { role } : {}),
            limits: {
              monthlyTextLimit: Number(monthlyTextLimit),
              monthlyImageLimit: Number(monthlyImageLimit),
              monthlyVideoLimit: Number(monthlyVideoLimit),
              maxConcurrentJobs: Number(maxConcurrentJobs),
              isGenerationEnabled,
            },
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.message || (response.ok ? "员工设置已保存。" : "员工设置保存失败。"));
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setMessage("员工设置保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="border-b border-stone-100 px-5 py-5 last:border-b-0">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-100">
            <UserRound className="h-5 w-5 text-stone-500" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-semibold">{member.displayName}</h2>
              <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">
                {roleLabels[member.role]}
              </span>
              {member.id === currentUserId ? (
                <span className="text-xs text-stone-400">当前账号</span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-stone-500">{member.email}</p>
            <p className="mt-1 text-xs text-stone-400">加入时间：{member.joinedAt}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            ["文字", member.usage.text],
            ["图片", member.usage.image],
            ["视频", member.usage.video],
            ["进行中", member.usage.active],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-stone-50 px-3 py-2">
              <p className="font-semibold text-stone-800">{value}</p>
              <p className="mt-1 text-stone-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <Label htmlFor={`role-${member.id}`}>员工角色</Label>
          <select
            id={`role-${member.id}`}
            value={role}
            disabled={!canEditRole}
            onChange={(event) => setRole(event.target.value as TeamMember["role"])}
            className="mt-2 h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm disabled:bg-stone-50 disabled:text-stone-400"
          >
            <option value="owner">负责人</option>
            <option value="admin">管理员</option>
            <option value="staff">员工</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`text-${member.id}`}>每月文字</Label>
          <Input id={`text-${member.id}`} className="mt-2 h-10" type="number" min="-1" value={monthlyTextLimit} onChange={(event) => setMonthlyTextLimit(event.target.value)} />
        </div>
        <div>
          <Label htmlFor={`image-${member.id}`}>每月图片</Label>
          <Input id={`image-${member.id}`} className="mt-2 h-10" type="number" min="-1" value={monthlyImageLimit} onChange={(event) => setMonthlyImageLimit(event.target.value)} />
        </div>
        <div>
          <Label htmlFor={`video-${member.id}`}>每月视频</Label>
          <Input id={`video-${member.id}`} className="mt-2 h-10" type="number" min="-1" value={monthlyVideoLimit} onChange={(event) => setMonthlyVideoLimit(event.target.value)} />
        </div>
        <div>
          <Label htmlFor={`concurrent-${member.id}`}>同时任务</Label>
          <Input id={`concurrent-${member.id}`} className="mt-2 h-10" type="number" min="1" value={maxConcurrentJobs} onChange={(event) => setMaxConcurrentJobs(event.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={isGenerationEnabled}
            onChange={(event) => setIsGenerationEnabled(event.target.checked)}
            className="h-4 w-4 accent-red-700"
          />
          允许使用真实模型
        </label>
        <div className="flex items-center justify-end gap-3">
          {message ? <p className="text-xs text-stone-500">{message}</p> : null}
          <Button type="button" size="sm" onClick={() => void saveMember()} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            保存设置
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-400">额度填写 -1 表示不限制；Mock 演示不计入用量。</p>
    </article>
  );
}

export function TeamManager({
  members,
  currentUserId,
  currentRole,
}: {
  members: TeamMember[];
  currentUserId: string | null;
  currentRole: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsInviting(true);
    setInviteMessage(null);
    try {
      const response = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      });
      const payload = await response.json().catch(() => ({}));
      setInviteMessage(payload.message || (response.ok ? "员工邀请已发送。" : "员工邀请发送失败。"));
      if (response.ok) {
        setEmail("");
        setDisplayName("");
        router.refresh();
      }
    } catch {
      setInviteMessage("员工邀请发送失败，请稍后重试。");
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={inviteMember} className="rounded-md border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MailPlus className="h-4 w-4 text-red-700" />
          邀请员工
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="员工姓名" />
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="员工邮箱" required />
          <Button type="submit" disabled={isInviting}>
            {isInviting ? <Loader2 className="animate-spin" /> : <MailPlus />}
            发送邀请
          </Button>
        </div>
        {inviteMessage ? <p className="mt-3 text-sm text-stone-500">{inviteMessage}</p> : null}
      </form>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-red-700" />
            团队成员
          </div>
          <span className="text-xs text-stone-400">{members.length} 人</span>
        </div>
        {members.map((member) => (
          <TeamMemberEditor
            key={`${member.id}-${member.role}-${JSON.stringify(member.limits)}`}
            member={member}
            currentUserId={currentUserId}
            currentRole={currentRole}
          />
        ))}
      </section>
    </div>
  );
}
