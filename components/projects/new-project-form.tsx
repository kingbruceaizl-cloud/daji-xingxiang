"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("张女士｜新中式宴会形象");
  const [customerName, setCustomerName] = useState("张女士");
  const [notes, setNotes] = useState("用于宴会形象设计，优先生成形象图，再生成变装短视频。");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, customerName, notes }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "项目创建失败。");
        return;
      }

      const searchParams = new URLSearchParams();

      if (data.source === "local" && data.project?.name) {
        searchParams.set("name", data.project.name);
      }

      const query = searchParams.toString();
      router.push(`/studio/${data.project.id}${query ? `?${query}` : ""}`);
    } catch {
      setMessage("创建项目请求失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-stone-200 bg-white p-6">
      <div className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="name">项目名称</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customerName">客户称呼</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="notes">设计备注</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {message && (
        <div className="mt-5 rounded-md bg-red-50 p-3 text-sm leading-6 text-red-700">
          {message}
          <Link href="/studio/demo" className="ml-2 underline underline-offset-4">
            先进入演示工作台
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "创建中..." : "创建并进入工作台"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/studio/demo">查看演示工作台</Link>
        </Button>
      </div>
    </form>
  );
}
