import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const distDir = resolve(process.cwd(), "dist");
const findings = [];
const secretPatterns = [
  {
    name: "OpenAI 风格密钥",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "JWT 或 Supabase 密钥",
    pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    name: "私钥内容",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
  {
    name: "Vercel Token",
    pattern: /\bvercel_[A-Za-z0-9]{20,}\b/i,
  },
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

function fail(message) {
  findings.push(message);
}

function distPath(fileName) {
  return resolve(distDir, fileName);
}

function readDistFile(fileName) {
  const filePath = distPath(fileName);
  if (!existsSync(filePath)) {
    fail(`缺少交付文件：${fileName}`);
    return "";
  }

  return readFileSync(filePath, "utf8");
}

function requireIncludes(fileName, content, values) {
  for (const value of values) {
    if (!content.includes(value)) {
      fail(`${fileName} 缺少内容：${value}`);
    }
  }
}

function checkNoSecrets(fileName, content) {
  for (const item of secretPatterns) {
    if (item.pattern.test(content)) {
      fail(`${fileName} 疑似包含${item.name}。`);
    }
  }
}

console.log("大吉形象交付物完整性校验");
console.log("------------------------");

const commit = run("git", ["rev-parse", "--short", "HEAD"]);
if (!commit.ok || !commit.stdout) {
  fail("无法读取当前提交号。");
}

if (!existsSync(distDir)) {
  fail("缺少 dist 目录，请先运行 pnpm run release:package。");
}

if (!findings.length) {
  const shortCommit = commit.stdout;
  const archiveFile = `daji-xingxiang-source-${shortCommit}.zip`;
  const checksumFile = `${archiveFile}.sha256`;
  const manifestFile = `daji-xingxiang-release-${shortCommit}.json`;
  const handoffFiles = [
    "daji-xingxiang-env-handoff.md",
    "daji-xingxiang-github-handoff.md",
    "daji-xingxiang-launch-summary.md",
    "daji-xingxiang-model-handoff.md",
    "daji-xingxiang-supabase-init.sql",
    "daji-xingxiang-vercel-handoff.md",
  ];

  for (const fileName of [archiveFile, checksumFile, manifestFile, ...handoffFiles]) {
    const filePath = distPath(fileName);
    if (!existsSync(filePath)) {
      fail(`缺少交付文件：${fileName}`);
      continue;
    }

    if (statSync(filePath).size === 0) {
      fail(`交付文件为空：${fileName}`);
    }
  }

  const checksum = readDistFile(checksumFile);
  requireIncludes(checksumFile, checksum, [archiveFile]);

  const manifestContent = readDistFile(manifestFile);
  requireIncludes(manifestFile, manifestContent, [
    `"shortCommit": "${shortCommit}"`,
    archiveFile,
    "release:verify-archive",
    "release:env-handoff",
    "release:github-handoff",
    "release:supabase-sql",
    "release:vercel-handoff",
    "release:model-handoff",
    "release:launch-summary",
  ]);

  const envHandoff = readDistFile("daji-xingxiang-env-handoff.md");
  requireIncludes("daji-xingxiang-env-handoff.md", envHandoff, [
    "大吉形象环境变量交接单",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "KIE_API_KEY",
    "不输出任何真实密钥值",
  ]);

  const githubHandoff = readDistFile("daji-xingxiang-github-handoff.md");
  requireIncludes("daji-xingxiang-github-handoff.md", githubHandoff, [
    "大吉形象 GitHub 仓库交接单",
    "git remote add origin",
    "git push -u origin",
    "大吉形象源码包交付",
  ]);

  const launchSummary = readDistFile("daji-xingxiang-launch-summary.md");
  requireIncludes("daji-xingxiang-launch-summary.md", launchSummary, [
    "大吉形象上线摘要",
    shortCommit,
    archiveFile,
    "GitHub 仓库交接单",
    "Vercel 部署交接单",
    "AI 模型通道交接单",
    "Supabase 初始化 SQL",
  ]);

  const modelHandoff = readDistFile("daji-xingxiang-model-handoff.md");
  requireIncludes("daji-xingxiang-model-handoff.md", modelHandoff, [
    "大吉形象 AI 模型通道交接单",
    "KIE_API_KEY",
    "/api/provider-callback/kie",
    "gpt-image-2-text-to-image",
    "OPENAI_API_KEY",
  ]);

  const supabaseSql = readDistFile("daji-xingxiang-supabase-init.sql");
  requireIncludes("daji-xingxiang-supabase-init.sql", supabaseSql, [
    "大吉形象 Supabase 初始化 SQL",
    "create table public.profiles",
    "create table public.ai_jobs",
    "customer-assets",
    "低能量穿搭变装",
  ]);

  const vercelHandoff = readDistFile("daji-xingxiang-vercel-handoff.md");
  requireIncludes("daji-xingxiang-vercel-handoff.md", vercelHandoff, [
    "大吉形象 Vercel 部署交接单",
    "Framework Preset",
    "pnpm install --frozen-lockfile",
    "pnpm run build",
    "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
  ]);

  for (const fileName of [manifestFile, ...handoffFiles]) {
    checkNoSecrets(fileName, readDistFile(fileName));
  }

  console.log(`当前提交：${shortCommit}`);
  console.log(`源码包：dist/${archiveFile}`);
  console.log(`交付文件数：${3 + handoffFiles.length}`);
}

if (findings.length) {
  console.log("未通过，先处理以下交付物问题：");
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log("检查通过：当前提交的交付物完整且未发现明显密钥风险。");
}
