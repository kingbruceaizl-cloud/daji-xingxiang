import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-vercel-handoff.md");

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_ENV",
];
const aiEnvKeys = [
  "KIE_BASE_URL",
  "KIE_API_KEY",
  "KIE_CALLBACK_SECRET",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
];

function readText(path, fallback = "") {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) {
    return fallback;
  }

  return readFileSync(fullPath, "utf8").trim();
}

function readJson(path) {
  try {
    return JSON.parse(readText(path, "{}"));
  } catch {
    return {};
  }
}

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

console.log("大吉形象 Vercel 部署交接单生成");
console.log("--------------------------------");

const vercelConfig = readJson("vercel.json");
const packageJson = readJson("package.json");
const nodeVersion = readText(".node-version", "20.18.0");
const latestCommit = run("git", ["log", "--oneline", "--decorate", "-1"]);
const branch = run("git", ["branch", "--show-current"]);

const lines = [
  "# 大吉形象 Vercel 部署交接单",
  "",
  `生成时间：${new Date().toISOString()}`,
  "",
  "该文件用于 Vercel 导入和部署交接，不包含任何真实密钥值。",
  "",
  "## 项目信息",
  "",
  `- 项目名称：${packageJson.name || "daji-xingxiang"}`,
  `- 当前分支：${branch.stdout || "main"}`,
  `- 当前提交：${latestCommit.stdout || "未知"}`,
  "- 推荐部署平台：Vercel",
  "- 推荐导入方式：从 GitHub 仓库导入",
  "",
  "## Vercel 项目设置",
  "",
  "| 配置项 | 建议值 |",
  "| --- | --- |",
  `| Framework Preset | ${vercelConfig.framework || "nextjs"} |`,
  "| Root Directory | `.` |",
  `| Node.js Version | ${nodeVersion} 或更高的 Node.js 20 版本 |`,
  `| Install Command | \`${vercelConfig.installCommand || "pnpm install --frozen-lockfile"}\` |`,
  `| Build Command | \`${vercelConfig.buildCommand || "pnpm run build"}\` |`,
  "| Output Directory | 使用 Next.js 默认值，不需要手动填写 |",
  "",
  "## 环境变量",
  "",
  "在 Vercel 的 Production、Preview、Development 环境中分别填写以下变量。真实密钥只填到 Vercel，不提交到 Git。",
  "",
  "### 必填变量",
  "",
];

for (const key of requiredEnvKeys) {
  lines.push(`- \`${key}\``);
}

lines.push("", "### AI 模型通道变量", "", "至少先配置一个真实模型密钥，第一阶段建议优先配置 `KIE_API_KEY`。", "");

for (const key of aiEnvKeys) {
  lines.push(`- \`${key}\``);
}

lines.push(
  "",
  "## 部署前检查",
  "",
  "```bash",
  "pnpm run verify:ci",
  "pnpm run release:package",
  "pnpm run publish:status",
  "```",
  "",
  "## 部署后处理",
  "",
  "1. 将 Vercel 正式域名写入 `NEXT_PUBLIC_APP_URL`。",
  "2. 在 Supabase Auth URL Configuration 中加入：",
  "",
  "```text",
  "https://你的域名/auth/confirm",
  "https://你的域名/protected",
  "https://你的域名/auth/update-password",
  "```",
  "",
  "3. 运行线上冒烟测试：",
  "",
  "```bash",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
  "```",
  "",
  "4. 打开 `/admin/launch` 查看 Supabase、数据库、存储桶和模型通道状态。",
  "",
  "## GitHub Actions",
  "",
  "- 推送到 `main` 后，`大吉形象发布验证` 会自动运行。",
  "- 需要交付源码包时，手动运行 `大吉形象源码包交付`。",
  "- 部署完成后，手动运行 `大吉形象线上冒烟验证` 并输入线上域名。",
  "",
);

mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log("检查通过：已生成 Vercel 部署交接单。");
console.log("路径：dist/daji-xingxiang-vercel-handoff.md");
