import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-model-handoff.md");
const modelEnvKeys = [
  "AI_EXECUTION_MODE",
  "ARK_BASE_URL",
  "ARK_API_KEY",
  "ARK_TEXT_MODEL_ID",
  "ARK_IMAGE_MODEL_ID",
  "ARK_VIDEO_MODEL_ID",
  "CRON_SECRET",
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

  return result.status === 0 ? result.stdout.trim() : "";
}

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return {};
  }

  const env = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
  const normalized = String(value || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("你的") ||
    normalized.includes("填写") ||
    normalized.includes("localhost") ||
    normalized.includes("<") ||
    normalized.includes(">")
  );
}

function mergedEnv() {
  const env = {
    ...loadEnvFile(".env.production"),
    ...loadEnvFile(".env.local"),
  };

  for (const key of modelEnvKeys) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }

  return env;
}

function statusFor(key, env) {
  if (key === "AI_EXECUTION_MODE") {
    return env[key] === "real" ? "已配置" : "待配置";
  }
  return isPlaceholder(env[key]) ? "待配置" : "已配置";
}

console.log("大吉形象 AI 模型通道交接单生成");
console.log("--------------------------------");

const env = mergedEnv();
const lines = [
  "# 大吉形象 AI 模型通道交接单",
  "",
  `生成时间：${new Date().toISOString()}`,
  "",
  `- 当前分支：${run("git", ["branch", "--show-current"]) || "main"}`,
  `- 当前提交：${run("git", ["log", "--oneline", "-1"]) || "未知"}`,
  "- 正式 Provider：火山方舟（volcengine）",
  "- 生图主模型：Seedream 5.0 完整版",
  "- 当前生图模型 ID：`doubao-seedream-5-0-260128`",
  "- KIE：不进入正式调用链路",
  "",
  "## 火山方舟环境变量",
  "",
  "| 变量 | 当前状态 | 用途 |",
  "| --- | --- | --- |",
  `| \`AI_EXECUTION_MODE\` | ${statusFor("AI_EXECUTION_MODE", env)} | 生产环境固定为 \`real\` |`,
  `| \`ARK_BASE_URL\` | ${statusFor("ARK_BASE_URL", env)} | 火山方舟 API 基础地址 |`,
  `| \`ARK_API_KEY\` | ${statusFor("ARK_API_KEY", env)} | 服务端鉴权 |`,
  `| \`ARK_TEXT_MODEL_ID\` | ${statusFor("ARK_TEXT_MODEL_ID", env)} | 文字与图片理解 |`,
  `| \`ARK_IMAGE_MODEL_ID\` | ${statusFor("ARK_IMAGE_MODEL_ID", env)} | Seedream 生图 |`,
  `| \`ARK_VIDEO_MODEL_ID\` | ${statusFor("ARK_VIDEO_MODEL_ID", env)} | Seedance 视频 |`,
  `| \`CRON_SECRET\` | ${statusFor("CRON_SECRET", env)} | 后台任务 Worker 鉴权 |`,
  "",
  "## 默认任务能力路由",
  "",
  "| 行动内容 | 路由键 | 正式模型 |",
  "| --- | --- | --- |",
  "| 形象方案、提示词和脚本 | `text_generation` | `ARK_TEXT_MODEL_ID` |",
  "| 客户图片理解 | `image_understanding` | `ARK_TEXT_MODEL_ID` |",
  "| 文生图 | `text_to_image` | `ARK_IMAGE_MODEL_ID` |",
  "| 图生图 | `image_to_image` | `ARK_IMAGE_MODEL_ID` |",
  "| 图生视频 | `image_to_video` | `ARK_VIDEO_MODEL_ID` |",
  "| 视频生成 | `video_generation` | `ARK_VIDEO_MODEL_ID` |",
  "| 长视频 | `long_video_generation` | 暂不启用 |",
  "",
  "## 预留模型通道",
  "",
  "| 变量 | 当前状态 | 预留能力 |",
  "| --- | --- | --- |",
  `| \`OPENAI_API_KEY\` | ${statusFor("OPENAI_API_KEY", env)} | 文字、多模态与图像能力 |`,
  `| \`JIMENG_API_KEY\` | ${statusFor("JIMENG_API_KEY", env)} | 即梦图片与视频能力 |`,
  `| \`KLING_API_KEY\` | ${statusFor("KLING_API_KEY", env)} | 可灵视频能力 |`,
  `| \`TONGYI_API_KEY\` | ${statusFor("TONGYI_API_KEY", env)} | 通义文字、图片与视频能力 |`,
  "",
  "这些预留密钥当前不进入正式调用链路；后续实现对应 Provider 后，再在后台任务能力路由中启用。",
  "",
  "## 部署后验证",
  "",
  "```bash",
  "pnpm run preflight",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
  "```",
  "",
  "确认 `/admin/launch` 和 `/admin/models` 显示火山方舟配置，Vercel Cron 可以调用 `/api/internal/ai-worker`，并分别完成一次文生图与图生图真实测试。",
  "",
  "## 安全要求",
  "",
  "- `ARK_API_KEY` 只能配置在服务端环境变量。",
  "- 生产环境缺少密钥或模型 ID 时必须失败，不能返回 Mock。",
  "- 不在交接文档、日志、任务快照或浏览器请求中输出密钥。",
  "",
];

mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log("检查通过：已生成 AI 模型通道交接单。");
console.log("路径：dist/daji-xingxiang-model-handoff.md");
