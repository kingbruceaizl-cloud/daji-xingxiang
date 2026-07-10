import { createAdminClient } from "@/lib/supabase/admin";
import { getDeploymentInfo, type DeploymentInfo } from "@/lib/deployment-info";
import {
  createSafeServerErrorMessage,
  createSafeStorageErrorMessage,
} from "@/lib/server-error";

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
  {
    key: "NEXT_PUBLIC_APP_ENV",
    label: "应用运行环境",
  },
];

const modelChannels = [
  { key: "KIE_API_KEY", label: "KIE 模型通道" },
  { key: "OPENAI_API_KEY", label: "OpenAI 模型通道" },
  { key: "JIMENG_API_KEY", label: "即梦模型通道" },
  { key: "KLING_API_KEY", label: "可灵模型通道" },
  { key: "TONGYI_API_KEY", label: "通义模型通道" },
];

const requiredBucketSettings = [
  {
    name: "customer-assets",
    label: "客户素材",
    public: false,
    fileSizeLimit: 104857600,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
  },
  {
    name: "generated-assets",
    label: "生成结果",
    public: false,
    fileSizeLimit: 524288000,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
  },
  {
    name: "product-assets",
    label: "商品素材",
    public: true,
    fileSizeLimit: 52428800,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: "music-assets",
    label: "音乐素材",
    public: false,
    fileSizeLimit: 52428800,
    mimeTypes: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"],
  },
];

function envConfigured(key: string) {
  return Boolean(process.env[key]?.trim());
}

const placeholderTokens = ["你的", "填写", "示例", "example", "<", ">", "placeholder", "todo"];

function envValue(key: string) {
  return process.env[key]?.trim() || "";
}

function isPlaceholderValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return !normalized || placeholderTokens.some((token) => normalized.includes(token));
}

function isLocalHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
}

function validateUrlValue(value: string) {
  if (!value) {
    return "未配置，正式上线前必填。";
  }

  if (isPlaceholderValue(value)) {
    return "仍是占位值，正式上线前需要替换为真实配置。";
  }

  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol !== "https:") {
      return "需要使用 https 地址。";
    }

    if (isLocalHostname(parsedUrl.hostname)) {
      return "已配置为本地地址，正式上线前需要替换为线上域名。";
    }

  } catch {
    return "格式无效，正式上线前需要修正。";
  }

  return "";
}

function validateSecretValue(value: string, minLength = 20) {
  if (!value) {
    return "未配置，正式上线前必填。";
  }

  if (isPlaceholderValue(value)) {
    return "仍是占位值，正式上线前需要替换为真实密钥。";
  }

  if (value.length < minLength) {
    return "长度过短，请确认已填写真实密钥。";
  }

  return "";
}

function validateProductionEnvValue(value: string) {
  if (!value) {
    return "未配置，正式上线前必填。";
  }

  if (isPlaceholderValue(value)) {
    return "仍是占位值，正式上线前需要替换为正式环境标识。";
  }

  if (value !== "production") {
    return "正式上线必须使用正式环境标识。";
  }

  return "";
}

function formatBucketPrivacy(isPublic: boolean) {
  return isPublic ? "公开" : "私有";
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  return `${bytes}B`;
}

function createEnvChecks(): LaunchCheckItem[] {
  return requiredEnv.map((item) => {
    const value = envValue(item.key);
    const issue =
      item.key === "NEXT_PUBLIC_SUPABASE_URL"
        ? validateUrlValue(value)
        : item.key === "NEXT_PUBLIC_APP_URL"
          ? validateUrlValue(value)
          : item.key === "NEXT_PUBLIC_APP_ENV"
            ? validateProductionEnvValue(value)
            : validateSecretValue(value);

    return {
      key: item.key,
      label: item.label,
      required: true,
      status: !value ? "missing" : issue ? "warning" : "ready",
      detail: issue || "已配置，未发现明显占位值。",
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
      ? createSafeServerErrorMessage("数据库连接检查")
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
      detail: createSafeStorageErrorMessage("存储桶检查"),
    };
  }

  const buckets = data || [];
  const bucketByName = new Map(buckets.map((bucket) => [bucket.name, bucket]));
  const missing = requiredBucketSettings
    .filter((bucket) => !bucketByName.has(bucket.name))
    .map((bucket) => `${bucket.label}(${bucket.name})`);
  const configIssues = requiredBucketSettings.flatMap((expected) => {
    const bucket = bucketByName.get(expected.name);

    if (!bucket) {
      return [];
    }

    const issues: string[] = [];
    const actualMimeTypes = bucket.allowed_mime_types || [];
    const missingMimeTypes = expected.mimeTypes.filter(
      (mimeType) => !actualMimeTypes.includes(mimeType),
    );

    if (bucket.public !== expected.public) {
      issues.push(
        `${expected.label}应为${formatBucketPrivacy(expected.public)}，当前为${formatBucketPrivacy(bucket.public)}`,
      );
    }

    if (bucket.file_size_limit !== expected.fileSizeLimit) {
      issues.push(
        `${expected.label}大小上限应为${formatFileSize(expected.fileSizeLimit)}，当前为${
          bucket.file_size_limit ? formatFileSize(bucket.file_size_limit) : "未设置"
        }`,
      );
    }

    if (missingMimeTypes.length) {
      issues.push(`${expected.label}缺少文件类型：${missingMimeTypes.join("、")}`);
    }

    return issues;
  });
  const visibleIssues = configIssues.slice(0, 4);
  const hiddenIssueCount = configIssues.length - visibleIssues.length;

  return {
    key: "STORAGE_BUCKETS",
    label: "素材存储桶",
    required: true,
    status: missing.length ? "missing" : configIssues.length ? "warning" : "ready",
    detail: missing.length
      ? `缺少：${missing.join("、")}。`
      : configIssues.length
        ? `发现配置需确认：${visibleIssues.join("；")}${
            hiddenIssueCount > 0 ? `；另有 ${hiddenIssueCount} 项` : ""
          }。请执行 Supabase 验收 SQL 复核。`
        : "客户素材、生成结果、商品素材和音乐存储桶均已创建，公开属性、大小限制和文件类型白名单符合上线要求。",
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
