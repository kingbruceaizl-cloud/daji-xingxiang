import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.production");

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const placeholderTokens = [
  "你的",
  "填写",
  "示例",
  "example",
  "<",
  ">",
  "placeholder",
  "todo",
];

function envValue(key) {
  return process.env[key]?.trim() || "";
}

function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return !normalized || placeholderTokens.some((token) => normalized.includes(token));
}

function isLocalHostname(hostname) {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
}

function validateUrlEnv(key, label) {
  const value = envValue(key);
  const issues = [];

  if (!value) {
    issues.push(`${key} 未配置`);
    return issues;
  }

  if (isPlaceholderValue(value)) {
    issues.push(`${key} 仍是占位值`);
    return issues;
  }

  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol !== "https:") {
      issues.push(`${label}需要使用 https 地址`);
    }

    if (isLocalHostname(parsedUrl.hostname)) {
      issues.push(`${label}不能是本地地址`);
    }

  } catch {
    issues.push(`${key} 格式无效`);
  }

  return issues;
}

function validateSecretEnv(key, label, minLength = 20) {
  const value = envValue(key);

  if (!value) {
    return [`${key} 未配置`];
  }

  if (isPlaceholderValue(value)) {
    return [`${key} 仍是占位值`];
  }

  if (value.length < minLength) {
    return [`${label}长度过短`];
  }

  return [];
}

function validateExactEnv(key, expectedValue, label) {
  const value = envValue(key);

  if (!value) {
    return [`${key} 未配置`];
  }

  if (isPlaceholderValue(value)) {
    return [`${key} 仍是占位值`];
  }

  if (value !== expectedValue) {
    return [`${label}必须设置为 ${expectedValue}`];
  }

  return [];
}

const envIssues = [
  ...validateUrlEnv("NEXT_PUBLIC_SUPABASE_URL", "Supabase 项目地址"),
  ...validateSecretEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase 公开访问密钥"),
  ...validateSecretEnv("SUPABASE_SERVICE_ROLE_KEY", "Supabase 服务端密钥"),
  ...validateUrlEnv("NEXT_PUBLIC_APP_URL", "应用公开访问地址"),
  ...validateExactEnv("NEXT_PUBLIC_APP_ENV", "production", "应用运行环境"),
  ...validateExactEnv("NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP", "false", "公开注册开关"),
  ...validateExactEnv("AI_EXECUTION_MODE", "real", "AI 执行模式"),
  ...validateSecretEnv("CRON_SECRET", "后台任务密钥", 24),
  ...validateUrlEnv("ARK_BASE_URL", "火山方舟 API 地址"),
  ...validateSecretEnv("ARK_API_KEY", "火山方舟 API Key", 8),
  ...validateSecretEnv("ARK_TEXT_MODEL_ID", "文字模型 ID", 8),
  ...validateSecretEnv("ARK_IMAGE_MODEL_ID", "生图模型 ID", 8),
  ...validateSecretEnv("ARK_VIDEO_MODEL_ID", "视频模型 ID", 8),
];
const failures = [...envIssues];

console.log("大吉形象上线前检查");
console.log("------------------");

if (envIssues.length) {
  console.log("正式环境变量存在问题：");
  for (const issue of envIssues) {
    console.log(`- ${issue}`);
  }
} else {
  console.log("正式环境变量：已配置且未发现明显占位值");
}

console.log(
  envIssues.some((item) => item.includes("ARK_"))
    ? "火山方舟模型通道：配置不完整"
    : "火山方舟模型通道：API Key 与模型 ID 已配置",
);

if (appUrl) {
  try {
    const parsedUrl = new URL(appUrl);
    const isLocalAddress = isLocalHostname(parsedUrl.hostname);

    if (isPlaceholderValue(appUrl)) {
      console.log("应用公开访问地址：仍是占位值");
    } else if (parsedUrl.protocol !== "https:") {
      console.log("应用公开访问地址：正式上线建议使用 https 地址");
    } else if (isLocalAddress) {
      console.log("应用公开访问地址：当前仍是本地地址");
    } else {
      console.log("应用公开访问地址：已配置为线上 https 地址");
    }
  } catch {
    console.log("应用公开访问地址：格式无效");
    failures.push("NEXT_PUBLIC_APP_URL 格式无效");
  }
}

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log("检查通过，可以进入部署流程。");
}
