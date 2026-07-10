import { createAdminClient } from "@/lib/supabase/admin";

export type OperationsOverview = {
  periodDays: number;
  total: number;
  todayTotal: number;
  succeeded: number;
  failed: number;
  active: number;
  stalled: number;
  successRate: number;
  avgDurationSeconds: number;
  openAlerts: number;
  providers: Array<{
    provider: string;
    total: number;
    succeeded: number;
    failed: number;
  }>;
  failureCodes: Array<{
    code: string;
    total: number;
  }>;
};

export type OperationsAlert = {
  id: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  sourceId: string | null;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export type AdminOperationsData = {
  source: "supabase" | "demo" | "migration-required";
  overview: OperationsOverview;
  alerts: OperationsAlert[];
};

const emptyOverview: OperationsOverview = {
  periodDays: 30,
  total: 0,
  todayTotal: 0,
  succeeded: 0,
  failed: 0,
  active: 0,
  stalled: 0,
  successRate: 0,
  avgDurationSeconds: 0,
  openAlerts: 0,
  providers: [],
  failureCodes: [],
};

const demoOverview: OperationsOverview = {
  periodDays: 30,
  total: 42,
  todayTotal: 6,
  succeeded: 37,
  failed: 3,
  active: 2,
  stalled: 0,
  successRate: 92.5,
  avgDurationSeconds: 68.4,
  openAlerts: 1,
  providers: [
    { provider: "volcengine", total: 42, succeeded: 37, failed: 3 },
  ],
  failureCodes: [{ code: "AI_PROVIDER_REQUEST_FAILED", total: 3 }],
};

const demoAlerts: OperationsAlert[] = [
  {
    id: "demo-alert",
    alertType: "ai_job_failed",
    severity: "warning",
    status: "open",
    sourceId: null,
    title: "演示：生成任务失败",
    message: "接入 Supabase 后，这里会显示真实失败原因和处理状态。",
    metadata: { provider: "volcengine", jobType: "text_to_image" },
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    acknowledgedAt: null,
    resolvedAt: null,
  },
];

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeOverview(value: unknown): OperationsOverview {
  const data = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const providers = Array.isArray(data.providers) ? data.providers : [];
  const failureCodes = Array.isArray(data.failureCodes) ? data.failureCodes : [];

  return {
    periodDays: numberValue(data.periodDays) || 30,
    total: numberValue(data.total),
    todayTotal: numberValue(data.todayTotal),
    succeeded: numberValue(data.succeeded),
    failed: numberValue(data.failed),
    active: numberValue(data.active),
    stalled: numberValue(data.stalled),
    successRate: numberValue(data.successRate),
    avgDurationSeconds: numberValue(data.avgDurationSeconds),
    openAlerts: numberValue(data.openAlerts),
    providers: providers.map((item) => {
      const row = item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
      return {
        provider: String(row.provider || "unknown"),
        total: numberValue(row.total),
        succeeded: numberValue(row.succeeded),
        failed: numberValue(row.failed),
      };
    }),
    failureCodes: failureCodes.map((item) => {
      const row = item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};
      return {
        code: String(row.code || "UNCLASSIFIED"),
        total: numberValue(row.total),
      };
    }),
  };
}

export async function getAdminOperationsData(): Promise<AdminOperationsData> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      source: "demo",
      overview: demoOverview,
      alerts: demoAlerts,
    };
  }

  const refreshResult = await supabase.rpc("refresh_ai_job_system_alerts", {
    p_stale_minutes: 15,
  });
  const [overviewResult, alertsResult] = await Promise.all([
    supabase.rpc("get_operations_overview", { p_days: 30 }),
    supabase
      .from("system_alerts")
      .select(
        "id,alert_type,severity,status,source_id,title,message,metadata,first_seen_at,last_seen_at,acknowledged_at,resolved_at",
      )
      .order("status", { ascending: true })
      .order("last_seen_at", { ascending: false })
      .limit(50),
  ]);

  if (refreshResult.error || overviewResult.error || alertsResult.error) {
    return {
      source: "migration-required",
      overview: emptyOverview,
      alerts: [],
    };
  }

  return {
    source: "supabase",
    overview: normalizeOverview(overviewResult.data),
    alerts: (alertsResult.data || []).map((alert) => ({
      id: alert.id,
      alertType: alert.alert_type,
      severity: alert.severity as OperationsAlert["severity"],
      status: alert.status as OperationsAlert["status"],
      sourceId: alert.source_id,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata || {},
      firstSeenAt: alert.first_seen_at,
      lastSeenAt: alert.last_seen_at,
      acknowledgedAt: alert.acknowledged_at,
      resolvedAt: alert.resolved_at,
    })),
  };
}
