import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-model-handoff.md");
const modelEnvKeys = [
  "KIE_BASE_URL",
  "KIE_API_KEY",
  "KIE_CALLBACK_SECRET",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
  };
}

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

function getMergedEnv() {
  const env = {
    ...loadEnvFile(".env.production"),
    ...loadEnvFile(".env.local"),
  };

  for (const key of ["NEXT_PUBLIC_APP_URL", ...modelEnvKeys]) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }

  return env;
}

function statusFor(key, env) {
  return isPlaceholder(env[key]) ? "待配置" : "已配置";
}

console.log("大吉形象 AI 模型通道交接单生成");
console.log("--------------------------------");

const branch = run("git", ["branch", "--show-current"]);
const latestCommit = run("git", ["log", "--oneline", "--decorate", "-1"]);
const env = getMergedEnv();
const publicAppUrl = isPlaceholder(env.NEXT_PUBLIC_APP_URL)
  ? "https://你的域名"
  : String(env.NEXT_PUBLIC_APP_URL).replace(/\/+$/, "");
const callbackUrl = `${publicAppUrl}/api/provider-callback/kie`;
const configuredModelKeys = [
  "KIE_API_KEY",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
].filter((key) => statusFor(key, env) === "已配置");

const lines = [
  "# 大吉形象 AI 模型通道交接单",
  "",
  `生成时间：${new Date().toISOString()}`,
  "",
  "该文件用于 AI 模型账号、密钥和回调配置交接，不输出任何真实密钥值。",
  "",
  "## 当前代码状态",
  "",
  `- 当前分支：${branch.stdout || "main"}`,
  `- 当前提交：${latestCommit.stdout || "未知"}`,
  `- 已配置模型密钥状态：${
    configuredModelKeys.length ? configuredModelKeys.join("、") : "待配置至少一个"
  }`,
  "",
  "## 第一阶段推荐接入",
  "",
  "- 推荐优先接入：KIE",
  "- 已实现能力：文生图、图生图、任务查询、KIE 回调处理、生成结果转存到 Supabase。",
  "- 已接入模型：`gpt-image-2-text-to-image`、`gpt-image-2-image-to-image`。",
  "- 视频模型：当前保留配置位，等确认具体 KIE 视频模型文档后接入。",
  "",
  "## KIE 环境变量",
  "",
  "| 变量 | 当前状态 | 用途 |",
  "| --- | --- | --- |",
  `| \`KIE_BASE_URL\` | ${statusFor("KIE_BASE_URL", env)} | KIE API 基础地址，默认可使用 \`https://api.kie.ai\` |`,
  `| \`KIE_API_KEY\` | ${statusFor("KIE_API_KEY", env)} | 服务端调用 KIE 创建任务和查询任务 |`,
  `| \`KIE_CALLBACK_SECRET\` | ${statusFor("KIE_CALLBACK_SECRET", env)} | 校验 KIE 回调请求，建议正式上线必须配置 |`,
  `| \`NEXT_PUBLIC_APP_URL\` | ${statusFor("NEXT_PUBLIC_APP_URL", env)} | 生成公网回调地址，正式上线必须是 https 域名 |`,
  "",
  "## KIE 回调配置",
  "",
  "在 KIE 控制台或创建任务参数中使用以下回调地址：",
  "",
  "```text",
  callbackUrl,
  "```",
  "",
  "项目回调入口：",
  "",
  "```http",
  "POST /api/provider-callback/kie",
  "```",
  "",
  "如果配置了 `KIE_CALLBACK_SECRET`，回调请求需要携带以下 Header，或使用任务创建时自动拼接的 `secret` 查询参数：",
  "",
  "```http",
  "x-daji-callback-secret: <KIE_CALLBACK_SECRET>",
  "```",
  "",
  "## 预留模型通道",
  "",
  "| 通道 | 环境变量 | 当前状态 | 说明 |",
  "| --- | --- | --- | --- |",
  `| OpenAI | \`OPENAI_API_KEY\` | ${statusFor("OPENAI_API_KEY", env)} | 预留文案、生图、多模态能力 |`,
  `| 即梦 | \`JIMENG_API_KEY\` | ${statusFor("JIMENG_API_KEY", env)} | 预留图像和视频生成能力 |`,
  `| 可灵 | \`KLING_API_KEY\` | ${statusFor("KLING_API_KEY", env)} | 预留视频生成能力 |`,
  `| 通义 | \`TONGYI_API_KEY\` | ${statusFor("TONGYI_API_KEY", env)} | 预留图像、视频和文案能力 |`,
  "",
  "## 部署后验证",
  "",
  "```bash",
  "pnpm run preflight",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
  "```",
  "",
  "然后打开：",
  "",
  "```text",
  "/admin/launch",
  "/admin/models",
  "/studio/demo",
  "```",
  "",
  "确认模型通道显示已配置，并用 KIE 图像模型创建一次真实生成任务。",
  "",
  "## 安全要求",
  "",
  "- 所有模型密钥只能填写在 Vercel 服务端环境变量中。",
  "- 不要将模型密钥写入代码仓库、交付 Markdown 或浏览器可见变量。",
  "- `KIE_CALLBACK_SECRET` 应使用随机强字符串，并和 KIE 回调配置保持一致。",
  "",
];

mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log("检查通过：已生成 AI 模型通道交接单。");
console.log("路径：dist/daji-xingxiang-model-handoff.md");
