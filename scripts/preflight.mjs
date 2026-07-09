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

const requiredForProduction = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const aiProviders = [
  "KIE_API_KEY",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
];

const missing = requiredForProduction.filter((key) => !process.env[key]);
const configuredProviders = aiProviders.filter((key) => Boolean(process.env[key]));
const failures = [...missing];
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const kieCallbackSecret = process.env.KIE_CALLBACK_SECRET?.trim();

console.log("大吉形象上线前检查");
console.log("------------------");

if (missing.length) {
  console.log("缺少必填环境变量：");
  for (const key of missing) {
    console.log(`- ${key}`);
  }
} else {
  console.log("必填环境变量：已配置");
}

if (configuredProviders.length) {
  console.log(`AI 模型通道：已配置 ${configuredProviders.join("、")}`);
} else {
  console.log("AI 模型通道：未配置，将只能使用演示模型通道");
  failures.push("至少一个 AI 模型通道密钥");
}

if (process.env.KIE_API_KEY) {
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
    const isLocalAddress = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
      parsedUrl.hostname,
    );

    if (parsedUrl.protocol !== "https:") {
      console.log("应用公开访问地址：正式上线建议使用 https 地址");
      failures.push("NEXT_PUBLIC_APP_URL 需要使用 https 地址");
    } else if (isLocalAddress) {
      console.log("应用公开访问地址：当前仍是本地地址");
      failures.push("NEXT_PUBLIC_APP_URL 不能是本地地址");
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
