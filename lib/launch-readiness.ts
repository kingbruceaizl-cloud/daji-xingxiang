import { createAdminClient } from "@/lib/supabase/admin";
import { getDeploymentInfo, type DeploymentInfo } from "@/lib/deployment-info";

type CheckStatus = "ready" | "warning" | "missing";

export type LaunchCheckItem = {
  key: string;
  label: string;
  status: CheckStatus;
  required: boolean;
  detail: string;
};

export type LaunchReadiness = {
  name: string;
  mode: "demo" | "production-ready" | "needs-config";
  summary: string;
  generatedAt: string;
  deployment: DeploymentInfo;
  checks: LaunchCheckItem[];
};

const requiredEnv = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase 项目地址",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    label: "Supabase 公开访问密钥",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase 服务端密钥",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    label: "应用公开访问地址",
  },
];

const modelChannels = [
  { key: "KIE_API_KEY", label: "KIE 模型通道" },
  { key: "OPENAI_API_KEY", label: "OpenAI 模型通道" },
  { key: "JIMENG_API_KEY", label: "即梦模型通道" },
  { key: "KLING_API_KEY", label: "可灵模型通道" },
  { key: "TONGYI_API_KEY", label: "通义模型通道" },
];

const requiredBuckets = [
  "customer-assets",
  "generated-assets",
  "product-assets",
  "music-assets",
];

function envConfigured(key: string) {
  return Boolean(process.env[key]?.trim());
}

function createEnvChecks(): LaunchCheckItem[] {
  return requiredEnv.map((item) => {
    const configured = envConfigured(item.key);
    const value = process.env[item.key]?.trim();
    const isLocalhostAppUrl =
      item.key === "NEXT_PUBLIC_APP_URL" && value?.includes("localhost");

    return {
      key: item.key,
      label: item.label,
      required: true,
      status: configured ? (isLocalhostAppUrl ? "warning" : "ready") : "missing",
      detail: configured
        ? isLocalhostAppUrl
          ? "已配置为本地地址，正式上线前需要替换为线上域名。"
          : "已配置。"
        : "未配置，正式上线前必填。",
    };
  });
}

function createModelCheck(): LaunchCheckItem {
  const configured = modelChannels.filter((item) => envConfigured(item.key));

  return {
    key: "AI_MODEL_CHANNELS",
    label: "AI 模型通道",
    required: true,
    status: configured.length ? "ready" : "missing",
    detail: configured.length
      ? `已配置：${configured.map((item) => item.label).join("、")}。`
      : "未配置真实模型通道，当前只能使用演示模型通道。",
  };
}

function createKieCallbackSecretCheck(): LaunchCheckItem {
  const kieEnabled = envConfigured("KIE_API_KEY");
  const callbackSecret = process.env.KIE_CALLBACK_SECRET?.trim();

  if (!kieEnabled) {
    return {
      key: "KIE_CALLBACK_SECRET",
      label: "KIE 回调密钥",
      required: false,
      status: "ready",
      detail: "未启用 KIE 模型通道，暂不需要校验 KIE 回调密钥。",
    };
  }

  if (!callbackSecret) {
    return {
      key: "KIE_CALLBACK_SECRET",
      label: "KIE 回调密钥",
      required: true,
      status: "missing",
      detail: "已配置 KIE 模型密钥，但缺少 KIE 回调密钥，正式上线前必须配置。",
    };
  }

  if (callbackSecret.length < 16) {
    return {
      key: "KIE_CALLBACK_SECRET",
      label: "KIE 回调密钥",
      required: true,
      status: "warning",
      detail: "KIE 回调密钥过短，建议使用 16 位以上随机强字符串。",
    };
  }

  return {
    key: "KIE_CALLBACK_SECRET",
    label: "KIE 回调密钥",
    required: true,
    status: "ready",
    detail: "已配置 KIE 回调密钥，回调入口具备基础可信校验。",
  };
}

async function createDatabaseCheck(): Promise<LaunchCheckItem> {
  const supabase = createAdminClient();

  if (!supabase) {
    return {
      key: "DATABASE",
      label: "数据库连接",
      required: true,
      status: "missing",
      detail: "未配置 Supabase 服务端密钥，无法检查数据库。",
    };
  }

  const { error } = await supabase
    .from("product_categories")
    .select("id", { count: "exact", head: true });

  return {
    key: "DATABASE",
    label: "数据库连接",
    required: true,
    status: error ? "warning" : "ready",
    detail: error
      ? `连接失败或表未迁移：${error.message}`
      : "连接正常，基础表可访问。",
  };
}

async function createStorageCheck(): Promise<LaunchCheckItem> {
  const supabase = createAdminClient();

  if (!supabase) {
    return {
      key: "STORAGE_BUCKETS",
      label: "素材存储桶",
      required: true,
      status: "missing",
      detail: "未配置 Supabase 服务端密钥，无法检查存储桶。",
    };
  }

  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    return {
      key: "STORAGE_BUCKETS",
      label: "素材存储桶",
      required: true,
      status: "warning",
      detail: `存储桶检查失败：${error.message}`,
    };
  }

  const existing = new Set(data.map((bucket) => bucket.name));
  const missing = requiredBuckets.filter((bucket) => !existing.has(bucket));

  return {
    key: "STORAGE_BUCKETS",
    label: "素材存储桶",
    required: true,
    status: missing.length ? "missing" : "ready",
    detail: missing.length
      ? `缺少：${missing.join("、")}。`
      : "客户素材、生成结果、商品素材和音乐存储桶均已创建。",
  };
}

function summarize(checks: LaunchCheckItem[]) {
  const requiredChecks = checks.filter((item) => item.required);
  const missing = requiredChecks.filter((item) => item.status === "missing");
  const warning = requiredChecks.filter((item) => item.status === "warning");

  if (!missing.length && !warning.length) {
    return {
      mode: "production-ready" as const,
      summary: "正式上线所需检查已通过，可以进入部署发布流程。",
    };
  }

  if (missing.length === requiredChecks.length) {
    return {
      mode: "demo" as const,
      summary: "当前处于本地演示模式，适合体验流程，但还不能正式上线。",
    };
  }

  return {
    mode: "needs-config" as const,
    summary: `还需处理 ${missing.length} 个缺失项和 ${warning.length} 个需确认项。`,
  };
}

export async function getLaunchReadiness(): Promise<LaunchReadiness> {
  const checks = [
    ...createEnvChecks(),
    createModelCheck(),
    createKieCallbackSecretCheck(),
    await createDatabaseCheck(),
    await createStorageCheck(),
  ];
  const result = summarize(checks);

  return {
    name: "大吉形象",
    mode: result.mode,
    summary: result.summary,
    generatedAt: new Date().toISOString(),
    deployment: getDeploymentInfo(),
    checks,
  };
}
