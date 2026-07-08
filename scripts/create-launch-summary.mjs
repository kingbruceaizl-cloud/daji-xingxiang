import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-launch-summary.md");

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_ENV",
];
const aiEnvKeys = [
  "KIE_API_KEY",
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

  for (const key of [...requiredEnvKeys, ...aiEnvKeys]) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }

  return env;
}

function findLatestManifestName() {
  if (!existsSync(distDir)) {
    return "";
  }

  const candidates = readdirSync(distDir)
    .filter((fileName) => /^daji-xingxiang-release-[a-f0-9]+\.json$/.test(fileName))
    .map((fileName) => ({
      fileName,
      mtimeMs: statSync(resolve(distDir, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.fileName || "";
}

function readLatestManifest() {
  const manifestName = findLatestManifestName();
  if (!manifestName) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(resolve(distDir, manifestName), "utf8"));
  } catch {
    return null;
  }
}

function mark(done) {
  return done ? "已就绪" : "待处理";
}

function fileStatus(fileName) {
  return existsSync(resolve(distDir, fileName)) ? "已生成" : "待生成";
}

console.log("大吉形象上线摘要生成");
console.log("--------------------");

mkdirSync(distDir, { recursive: true });

const branch = run("git", ["branch", "--show-current"]);
const latestCommit = run("git", ["log", "--oneline", "--decorate", "-1"]);
const origin = run("git", ["remote", "get-url", "origin"]);
const workingTree = run("git", ["status", "--short"]);
const manifest = readLatestManifest();
const env = getMergedEnv();
const missingRequiredEnv = requiredEnvKeys.filter((key) => isPlaceholder(env[key]));
const configuredAiKeys = aiEnvKeys.filter((key) => !isPlaceholder(env[key]));

const archiveFile = manifest?.archive?.file || "待生成";
const checksumFile = manifest?.archive?.file
  ? `${manifest.archive.file}.sha256`
  : "待生成";
const manifestFile = manifest?.shortCommit
  ? `daji-xingxiang-release-${manifest.shortCommit}.json`
  : "待生成";
const envHandoffFile = "daji-xingxiang-env-handoff.md";
const launchSummaryFile = "daji-xingxiang-launch-summary.md";
const supabaseSqlFile = "daji-xingxiang-supabase-init.sql";
const appIsExternallyReady =
  origin.ok &&
  Boolean(origin.stdout) &&
  !missingRequiredEnv.length &&
  Boolean(configuredAiKeys.length);

const lines = [
  "# 大吉形象上线摘要",
  "",
  `生成时间：${new Date().toISOString()}`,
  "",
  "该文件用于上线交接，只展示状态、文件名和下一步动作，不输出任何真实密钥值。",
  "",
  "## 当前结论",
  "",
  `- 本地代码与交付包：${manifest ? "已生成" : "待生成"}`,
  `- GitHub 远程仓库：${mark(origin.ok && Boolean(origin.stdout))}`,
  `- 正式环境变量：${missingRequiredEnv.length ? "待配置" : "已配置"}`,
  `- AI 模型通道：${configuredAiKeys.length ? "已配置" : "待配置至少一个"}`,
  `- 公网上线状态：${appIsExternallyReady ? "可进入部署验证" : "仍需外部配置"}`,
  "",
  "## 代码状态",
  "",
  `- 分支：${branch.stdout || "未知"}`,
  `- 最新提交：${latestCommit.stdout || "未知"}`,
  `- 工作区：${workingTree.stdout ? "存在未提交修改" : "干净"}`,
  `- 远程仓库：${origin.ok && origin.stdout ? origin.stdout : "尚未配置"}`,
  "",
  "## 本次交付物",
  "",
  `- 源码包：${archiveFile}（${fileStatus(archiveFile)}）`,
  `- SHA256 校验文件：${checksumFile}（${fileStatus(checksumFile)}）`,
  `- 发布清单：${manifestFile}（${fileStatus(manifestFile)}）`,
  `- 环境变量交接单：${envHandoffFile}（${fileStatus(envHandoffFile)}）`,
  `- Supabase 初始化 SQL：${supabaseSqlFile}（${fileStatus(supabaseSqlFile)}）`,
  `- 上线摘要：${launchSummaryFile}（已生成）`,
  "",
  "## 自动化能力",
  "",
  "- `.github/workflows/verify.yml`：推送或拉取请求时运行本地发布验证和生产冒烟。",
  "- `.github/workflows/release-package.yml`：手动生成源码交付包、校验文件、发布清单、环境变量交接单、Supabase 初始化 SQL 和上线摘要。",
  "- `.github/workflows/online-smoke.yml`：部署后手动检查线上域名关键页面和接口。",
  "",
  "## 剩余上线动作",
  "",
];

if (!origin.ok || !origin.stdout) {
  lines.push(
    "1. 创建 GitHub 空仓库并推送当前 `main` 分支：",
    "",
    "```bash",
    "git remote add origin https://github.com/你的账号/你的仓库.git",
    "git push -u origin main",
    "```",
    "",
  );
} else {
  lines.push("1. GitHub 远程仓库已配置，确认 Actions 验证通过。", "");
}

lines.push(
  "2. 创建 Supabase 项目，执行交付 SQL 文件或输出初始化 SQL：",
  "",
  "```text",
  "dist/daji-xingxiang-supabase-init.sql",
  "```",
  "",
  "```bash",
  "pnpm run supabase:sql",
  "```",
  "",
  "3. 在 Vercel 导入 GitHub 仓库，按环境变量交接单填写生产环境变量。",
  "",
  "4. 至少配置一个真实 AI 模型密钥，第一阶段建议优先配置 `KIE_API_KEY`。",
  "",
  "5. 部署完成后执行线上检查：",
  "",
  "```bash",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
  "```",
  "",
  "6. 打开 `/admin/launch` 查看上线体检页面。",
  "",
  "## 当前待配置环境变量",
  "",
);

if (missingRequiredEnv.length) {
  for (const key of missingRequiredEnv) {
    lines.push(`- ${key}`);
  }
} else {
  lines.push("- 必填环境变量已配置。");
}

lines.push(
  "",
  "## 当前 AI 模型密钥状态",
  "",
  configuredAiKeys.length
    ? `- 已配置：${configuredAiKeys.join("、")}`
    : "- 待配置至少一个：KIE_API_KEY、OPENAI_API_KEY、JIMENG_API_KEY、KLING_API_KEY、TONGYI_API_KEY",
  "",
);

writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log("检查通过：已生成上线摘要。");
console.log("路径：dist/daji-xingxiang-launch-summary.md");
