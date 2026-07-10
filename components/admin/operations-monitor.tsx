"use client";

import { Button } from "@/components/ui/button";
import { formatProviderLabel } from "@/lib/ai/display";
import type {
  AdminOperationsData,
  OperationsAlert,
} from "@/lib/admin-operations";
import {
  Activity,
  BadgeCheck,
  BellRing,
  CheckCheck,
  CircleAlert,
  Clock3,
  Loader2,
  RefreshCcw,
  TimerReset,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const statusLabels = {
  open: "待处理",
  acknowledged: "已确认",
  resolved: "已关闭",
};

const severityLabels = {
  info: "提示",
  warning: "警告",
  critical: "严重",
};

const severityClassNames = {
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-700",
};

const failureCodeLabels: Record<string, string> = {
  AI_PROVIDER_REQUEST_FAILED: "模型请求失败",
  AI_PROVIDER_RESPONSE_INVALID: "模型返回异常",
  AI_RESULT_PERSISTENCE_FAILED: "结果转存失败",
  AI_PERSISTENCE_REQUIRED: "任务持久化失败",
  AI_ACCESS_DENIED: "任务权限校验失败",
  UNCLASSIFIED: "未分类错误",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function metadataValue(alert: OperationsAlert, key: string) {
  const value = alert.metadata[key];
  return typeof value === "string" ? value : "";
}

export function OperationsMonitor({
  data,
}: {
  data: AdminOperationsData;
}) {
  const router = useRouter();
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const overview = data.overview;

  async function updateAlert(
    alertId: string,
    action: "acknowledge" | "resolve" | "reopen",
  ) {
    setActiveAlertId(alertId);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/alerts/${encodeURIComponent(alertId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      setMessage(
        payload.message || (response.ok ? "告警状态已更新。" : "告警操作失败。"),
      );
      if (response.ok) {
        router.refresh();
      }
    } catch {
      setMessage("告警操作失败，请稍后重试。");
    } finally {
      setActiveAlertId(null);
    }
  }

  const stats = [
    { label: "近 30 天任务", value: overview.total, icon: Activity },
    { label: "今日任务", value: overview.todayTotal, icon: Clock3 },
    { label: "成功率", value: `${overview.successRate}%`, icon: BadgeCheck },
    {
      label: "平均完成时间",
      value: `${overview.avgDurationSeconds} 秒`,
      icon: TimerReset,
    },
    { label: "进行中", value: overview.active, icon: RefreshCcw },
    { label: "待处理告警", value: overview.openAlerts, icon: BellRing },
  ];

  return (
    <div className="space-y-6">
      {data.source === "migration-required" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          运行监控数据库尚未升级，请执行 Supabase 迁移 0009 后刷新。
        </div>
      ) : null}
      {data.source === "demo" ? (
        <div className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
          当前显示演示指标；连接 Supabase 后会自动切换为真实任务与告警。
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="min-w-0 rounded-md border border-stone-200 bg-white p-4"
            >
              <Icon className="h-4 w-4 text-red-700" />
              <p className="mt-4 text-xs text-stone-500">{stat.label}</p>
              <p className="mt-2 break-words text-xl font-semibold">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">模型通道表现</h2>
              <p className="mt-1 text-xs text-stone-500">
                统计真实任务，不包含 Mock 演示。
              </p>
            </div>
            <span className="text-xs text-stone-400">近 {overview.periodDays} 天</span>
          </div>
          <div className="mt-4 divide-y divide-stone-100">
            {overview.providers.map((provider) => (
              <div
                key={provider.provider}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {formatProviderLabel(provider.provider)}
                </span>
                <span className="text-stone-500">共 {provider.total}</span>
                <span className="text-green-700">成功 {provider.succeeded}</span>
                <span className="text-red-700">失败 {provider.failed}</span>
              </div>
            ))}
            {!overview.providers.length ? (
              <p className="py-6 text-center text-sm text-stone-500">
                暂无真实模型任务。
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold">主要失败原因</h2>
          <p className="mt-1 text-xs text-stone-500">
            用于判断模型、存储或后台任务哪一段需要处理。
          </p>
          <div className="mt-4 space-y-3">
            {overview.failureCodes.map((failure) => (
              <div
                key={failure.code}
                className="flex items-center justify-between gap-4 border-b border-stone-100 pb-3 text-sm last:border-b-0"
              >
                <span>{failureCodeLabels[failure.code] || "其他系统错误"}</span>
                <span className="font-semibold text-red-700">{failure.total} 次</span>
              </div>
            ))}
            {!overview.failureCodes.length ? (
              <p className="py-6 text-center text-sm text-stone-500">
                当前周期没有失败记录。
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {message ? (
        <p
          className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-600"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">系统告警</h2>
            <p className="mt-1 text-xs text-stone-500">
              失败与卡住任务会自动进入这里，恢复后自动关闭。
            </p>
          </div>
          <span className="text-xs text-stone-400">最近 {data.alerts.length} 条</span>
        </div>
        <div className="divide-y divide-stone-100">
          {data.alerts.map((alert) => {
            const provider = metadataValue(alert, "provider");
            const isBusy = activeAlertId === alert.id;
            return (
              <article
                key={alert.id}
                className="flex flex-col justify-between gap-4 px-5 py-4 lg:flex-row lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CircleAlert className="h-4 w-4 text-red-700" />
                    <h3 className="text-sm font-semibold">{alert.title}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${severityClassNames[alert.severity]}`}
                    >
                      {severityLabels[alert.severity]}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                      {statusLabels[alert.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {alert.message}
                  </p>
                  <p className="mt-2 text-xs text-stone-400">
                    {provider ? `${formatProviderLabel(provider)} · ` : ""}
                    最近出现：{formatDateTime(alert.lastSeenAt)}
                    {alert.sourceId ? ` · 任务 ${alert.sourceId.slice(0, 8)}` : ""}
                  </p>
                </div>
                {data.source === "supabase" ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {alert.status === "open" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => void updateAlert(alert.id, "acknowledge")}
                      >
                        {isBusy ? <Loader2 className="animate-spin" /> : <CheckCheck />}
                        确认
                      </Button>
                    ) : null}
                    {alert.status !== "resolved" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void updateAlert(alert.id, "resolve")}
                      >
                        <BadgeCheck />
                        关闭
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBusy}
                        onClick={() => void updateAlert(alert.id, "reopen")}
                      >
                        <RefreshCcw />
                        重新打开
                      </Button>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
          {!data.alerts.length ? (
            <p className="px-5 py-10 text-center text-sm text-stone-500">
              当前没有系统告警。
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
