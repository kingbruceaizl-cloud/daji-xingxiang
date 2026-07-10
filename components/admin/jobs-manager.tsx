"use client";

import { Button } from "@/components/ui/button";
import {
  formatJobStatusLabel,
  formatJobTypeLabel,
  formatModelLabel,
  formatProviderLabel,
} from "@/lib/ai/display";
import type { CatalogData } from "@/lib/catalog";
import { Ban, ListVideo, Loader2, RefreshCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const statusClassName: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  succeeded: "bg-green-50 text-green-700",
  submitting: "bg-blue-50 text-blue-700",
  running: "bg-blue-50 text-blue-700",
  persisting: "bg-violet-50 text-violet-700",
  retrying: "bg-orange-50 text-orange-700",
  queued: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  canceled: "bg-stone-100 text-stone-500",
};

type AdminJob = CatalogData["jobs"][number];

function normalizedStatus(job: AdminJob) {
  return job.rawStatus || job.status;
}

function isActiveJob(job: AdminJob) {
  return !["succeeded", "failed", "canceled", "已完成", "失败", "已取消"].includes(
    normalizedStatus(job),
  );
}

export function JobsManager({ jobs }: { jobs: AdminJob[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const status = normalizedStatus(job);
      const matchesStatus =
        statusFilter === "全部" ||
        (statusFilter === "进行中" && isActiveJob(job)) ||
        (statusFilter === "已完成" && ["succeeded", "已完成"].includes(status)) ||
        (statusFilter === "失败" && ["failed", "失败"].includes(status)) ||
        (statusFilter === "已取消" && ["canceled", "已取消"].includes(status));
      const haystack = [job.id, job.prompt, job.provider, job.model, job.type]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [jobs, query, statusFilter]);

  const counts = {
    total: jobs.length,
    active: jobs.filter(isActiveJob).length,
    failed: jobs.filter((job) => ["failed", "失败"].includes(normalizedStatus(job))).length,
    succeeded: jobs.filter((job) => ["succeeded", "已完成"].includes(normalizedStatus(job))).length,
  };

  async function updateJob(job: AdminJob, action: "retry" | "cancel") {
    setActiveJobId(job.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/jobs/${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.message || (response.ok ? "任务状态已更新。" : "任务操作失败。"));
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setMessage("任务操作失败，请稍后重试。");
    } finally {
      setActiveJobId(null);
    }
  }

  return (
    <>
      <section className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          ["全部任务", counts.total],
          ["进行中", counts.active],
          ["已完成", counts.succeeded],
          ["失败", counts.failed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {["全部", "进行中", "已完成", "失败", "已取消"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md border px-3 py-2 text-sm ${
                statusFilter === status
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-stone-200 bg-white text-stone-600"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3">
          <Search className="h-4 w-4 text-stone-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-64 bg-transparent text-sm outline-none"
            placeholder="搜索任务、模型或提示词"
          />
        </label>
      </div>

      {message ? (
        <p className="mb-4 rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-600" aria-live="polite">
          {message}
        </p>
      ) : null}

      <section className="overflow-x-auto rounded-md border border-stone-200 bg-white">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.65fr_0.55fr_0.55fr] gap-4 border-b border-stone-200 px-5 py-3 text-xs font-medium text-stone-400">
            <span>任务</span>
            <span>模型通道</span>
            <span>类型</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          <div className="divide-y divide-stone-200">
            {filteredJobs.map((job) => {
              const status = normalizedStatus(job);
              const canRetry = ["failed", "canceled", "失败", "已取消"].includes(status);
              return (
                <article key={job.id} className="grid grid-cols-[1.2fr_0.8fr_0.65fr_0.55fr_0.55fr] gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ListVideo className="h-4 w-4 shrink-0 text-red-700" />
                      <h2 className="truncate text-sm font-semibold">{job.id}</h2>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">
                      {job.prompt || "暂无提示词。"}
                    </p>
                    {job.errorMessage ? (
                      <p className="mt-2 text-xs text-red-700">失败原因：{job.errorMessage}</p>
                    ) : null}
                  </div>
                  <div className="text-sm text-stone-600">
                    <p>{formatProviderLabel(job.provider)}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {formatModelLabel(job.model, job.provider)}
                    </p>
                  </div>
                  <p className="text-sm text-stone-600">
                    {formatJobTypeLabel(job.rawType || job.type)}
                  </p>
                  <div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${statusClassName[status] || "bg-stone-100 text-stone-500"}`}>
                      {formatJobStatusLabel(status)}
                    </span>
                    <p className="mt-2 text-xs text-stone-400">{job.updatedAt}</p>
                  </div>
                  <div className="flex items-start gap-1">
                    {canRetry ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="重新执行"
                        disabled={activeJobId === job.id}
                        onClick={() => void updateJob(job, "retry")}
                      >
                        {activeJobId === job.id ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
                      </Button>
                    ) : null}
                    {isActiveJob(job) ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="取消任务"
                        disabled={activeJobId === job.id}
                        onClick={() => void updateJob(job, "cancel")}
                      >
                        <Ban />
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!filteredJobs.length ? (
              <p className="px-5 py-8 text-center text-sm text-stone-500">
                没有符合当前条件的任务。
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
