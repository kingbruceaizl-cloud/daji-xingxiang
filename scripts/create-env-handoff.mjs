import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envFiles = [".env.production", ".env.local"];
const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-env-handoff.md");

const variables = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    browser: true,
    source: "Supabase 项目设置 > API > Project URL",
    target: "Vercel Production / Preview / Development",
    note: "必须是正式 Supabase 项目地址。",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    required: true,
    browser: true,
    source: "Supabase 项目设置 > API > Publishable key",
    target: "Vercel Production / Preview / Development",
    note: "浏览器可用的公开访问密钥。",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    browser: false,
    source: "Supabase 项目设置 > API > Service role key",
    target: "Vercel Production / Preview / Development",
    note: "仅服务端使用，绝不能加 NEXT_PUBLIC_ 前缀。",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: true,
    browser: true,
    source: "Vercel 部署后的正式 https 域名",
    target: "Vercel Production / Preview / Development",
    note: "正式上线必须是 https 地址，不能是 localhost。",
  },
  {
    key: "NEXT_PUBLIC_APP_ENV",
    required: true,
    browser: true,
    source: "固定填写 production",
    target: "Vercel Production",
    note: "正式环境填写 production。",
  },
  {
    key: "KIE_BASE_URL",
    required: false,
    browser: false,
    source: "KIE 接口文档或供应商控制台",
    target: "Vercel Production / Preview / Development",
    note: "默认可使用 https://api.kie.ai。",
  },
  {
    key: "KIE_API_KEY",
    required: false,
    browser: false,
    source: "KIE 控制台",
    target: "Vercel Production / Preview / Development",
    note: "至少配置一个 AI 模型密钥；第一阶段建议优先配置 KIE。",
  },
  {
    key: "KIE_CALLBACK_SECRET",
    required: false,
    browser: false,
    source: "自行生成并同步给 KIE 回调配置",
    target: "Vercel Production / Preview / Development",
    note: "用于校验模型回调请求。",
  },
  {
    key: "OPENAI_API_KEY",
    required: false,
    browser: false,
    source: "OpenAI 控制台",
    target: "Vercel Production / Preview / Development",
    note: "预留模型通道。",
  },
  {
    key: "JIMENG_API_KEY",
    required: false,
    browser: false,
    source: "即梦控制台",
    target: "Vercel Production / Preview / Development",
    note: "预留模型通道。",
  },
  {
    key: "KLING_API_KEY",
    required: false,
    browser: false,
    source: "可灵控制台",
    target: "Vercel Production / Preview / Development",
    note: "预留模型通道。",
  },
  {
    key: "TONGYI_API_KEY",
    required: false,
    browser: false,
    source: "通义控制台",
    target: "Vercel Production / Preview / Development",
    note: "预留模型通道。",
  },
];

const aiKeys = [
  "KIE_API_KEY",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
];

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return {};
  }

  const env = {};
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function isPlaceholder(value) {
  const normalized = String(value || "").trim();

  return (
    !normalized ||
    normalized.includes("你的") ||
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1")
  );
}

function mergeEnv() {
  const merged = {};
  for (const fileName of envFiles) {
    Object.assign(merged, loadEnvFile(fileName));
  }

  for (const key of Object.keys(process.env)) {
    if (variables.some((item) => item.key === key)) {
      merged[key] = process.env[key];
    }
  }

  return merged;
}

function statusFor(key, env) {
  if (key === "NEXT_PUBLIC_APP_ENV") {
    return String(env[key] || "").trim() === "production" ? "已配置" : "待配置";
  }

  return isPlaceholder(env[key]) ? "待配置" : "已配置";
}

function checkbox(checked) {
  return checked ? "[x]" : "[ ]";
}

console.log("大吉形象环境变量交接单生成");
console.log("--------------------------");

const env = mergeEnv();
const requiredMissing = variables
  .filter((item) => item.required)
  .filter((item) => statusFor(item.key, env) === "待配置")
  .map((item) => item.key);
const configuredAiKeys = aiKeys.filter((key) => statusFor(key, env) === "已配置");
const generatedAt = new Date().toISOString();

const lines = [
  "# 大吉形象环境变量交接单",
  "",
  `生成时间：${generatedAt}`,
  "",
  "该文件用于上线交接，只展示变量配置状态，不输出任何真实密钥值。",
  "",
  "## 当前状态",
  "",
  `- 必填变量：${requiredMissing.length ? `待配置 ${requiredMissing.join("、")}` : "已配置"}`,
  `- AI 模型密钥：${configuredAiKeys.length ? `已配置 ${configuredAiKeys.join("、")}` : "待配置至少一个"}`,
  "",
  "## Vercel 环境变量清单",
  "",
  "| 完成 | 变量 | 必填 | 浏览器可见 | 当前状态 | 获取位置 | 填写位置 | 备注 |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
];

for (const item of variables) {
  const status = statusFor(item.key, env);
  const checked = item.required ? status === "已配置" : false;
  lines.push(
    `| ${checkbox(checked)} | \`${item.key}\` | ${item.required ? "是" : "否"} | ${
      item.browser ? "是" : "否"
    } | ${status} | ${item.source} | ${item.target} | ${item.note} |`,
  );
}

lines.push(
  "",
  "## Supabase Auth 回调地址",
  "",
  "上线后在 Supabase Auth URL Configuration 中加入：",
  "",
  "```text",
  "https://你的域名/auth/confirm",
  "https://你的域名/protected",
  "https://你的域名/auth/update-password",
  "```",
  "",
  "本地开发建议加入：",
  "",
  "```text",
  "http://localhost:3000/auth/confirm",
  "http://localhost:3000/protected",
  "http://localhost:3000/auth/update-password",
  "```",
  "",
  "## 填写后验证",
  "",
  "```bash",
  "pnpm run preflight",
  "pnpm run release:check",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
  "```",
  "",
  "## 安全要求",
  "",
  "- 不要把 `.env.local`、`.env.production` 或任何真实密钥提交到 Git。",
  "- `SUPABASE_SERVICE_ROLE_KEY`、模型密钥和回调密钥只能放在服务端环境变量中。",
  "- 只有 `NEXT_PUBLIC_` 开头的变量可以被浏览器读取。",
  "",
);

mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log("检查通过：已生成环境变量交接单。");
console.log("路径：dist/daji-xingxiang-env-handoff.md");
if (requiredMissing.length) {
  console.log(`提示：仍有必填变量待配置：${requiredMissing.join("、")}`);
}
if (!configuredAiKeys.length) {
  console.log("提示：仍需至少配置一个 AI 模型密钥。");
}
