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

const aiProviders = [
  "KIE_API_KEY",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
];

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const kieCallbackSecret = process.env.KIE_CALLBACK_SECRET?.trim();
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
];
const configuredProviders = aiProviders.filter(
  (key) => validateSecretEnv(key, key, 8).length === 0,
);
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

if (configuredProviders.length) {
  console.log(`AI 模型通道：已配置 ${configuredProviders.join("、")}`);
} else {
  console.log("AI 模型通道：未配置，将只能使用演示模型通道");
  failures.push("至少一个 AI 模型通道密钥");
}

if (envValue("KIE_API_KEY")) {
  if (!kieCallbackSecret) {
    console.log("KIE 回调密钥：未配置");
    failures.push("启用 KIE 时必须配置 KIE_CALLBACK_SECRET");
  } else if (kieCallbackSecret.length < 16) {
    console.log("KIE 回调密钥：长度过短");
    failures.push("KIE_CALLBACK_SECRET 建议使用 16 位以上随机强字符串");
  } else {
    console.log("KIE 回调密钥：已配置");
  }
}

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
