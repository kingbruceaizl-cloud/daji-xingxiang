import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function fail(message) {
  console.log(message);
  process.exit(1);
}

console.log("大吉形象源码交付包生成");
console.log("----------------------");

const status = run("git", ["status", "--short"]);
if (!status.ok) {
  fail("无法读取 Git 状态，请确认当前目录是 Git 仓库。");
}

if (status.stdout) {
  fail("当前存在未提交修改。请先提交或暂存处理后再生成源码交付包。");
}

const commit = run("git", ["rev-parse", "--short", "HEAD"]);
if (!commit.ok || !commit.stdout) {
  fail("无法读取当前提交号。");
}

const fullCommit = run("git", ["rev-parse", "HEAD"]);
if (!fullCommit.ok || !fullCommit.stdout) {
  fail("无法读取当前完整提交号。");
}

const branch = run("git", ["branch", "--show-current"]);
const committedAt = run("git", ["show", "-s", "--format=%cI", "HEAD"]);
const distDir = resolve(process.cwd(), "dist");
mkdirSync(distDir, { recursive: true });

const archiveName = `daji-xingxiang-source-${commit.stdout}.zip`;
const archivePath = resolve(distDir, archiveName);
const archive = run("git", [
  "archive",
  "--format=zip",
  `--output=${archivePath}`,
  "HEAD",
]);

if (!archive.ok) {
  fail(archive.stderr || "源码交付包生成失败。");
}

const archiveBytes = readFileSync(archivePath);
const sha256 = createHash("sha256").update(archiveBytes).digest("hex");
const sizeBytes = statSync(archivePath).size;
const sizeKb = Math.ceil(sizeBytes / 1024);
const checksumName = `${archiveName}.sha256`;
const checksumPath = resolve(distDir, checksumName);
const manifestName = `daji-xingxiang-release-${commit.stdout}.json`;
const manifestPath = resolve(distDir, manifestName);
const manifest = {
  app: "大吉形象",
  packageType: "source",
  branch: branch.stdout || null,
  commit: fullCommit.stdout,
  shortCommit: commit.stdout,
  committedAt: committedAt.stdout || null,
  generatedAt: new Date().toISOString(),
  archive: {
    file: archiveName,
    sizeBytes,
    sha256,
  },
  excludes: ["node_modules", ".next", ".env", ".env.local", ".env.production", ".vercel"],
  verifyCommands: [
    "pnpm install --frozen-lockfile",
    "pnpm run verify:ci",
    "pnpm run release:verify-archive",
    "pnpm run release:env-handoff",
    "pnpm run release:github-handoff",
    "pnpm run release:supabase-sql",
    "pnpm run release:vercel-handoff",
    "pnpm run release:model-handoff",
    "pnpm run release:launch-summary",
    "pnpm run release:verify-handoff",
    "pnpm run release:check",
  ],
};

writeFileSync(checksumPath, `${sha256}  ${archiveName}\n`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`检查通过：已生成源码交付包。`);
console.log(`路径：dist/${archiveName}`);
console.log(`校验：dist/${checksumName}`);
console.log(`清单：dist/${manifestName}`);
console.log(`提交：${commit.stdout}`);
console.log(`大小：${sizeKb} KB`);
console.log(`SHA256：${sha256}`);
console.log("说明：该压缩包只包含 Git 已提交文件，不包含 node_modules、.next、.env 或 .vercel。");
