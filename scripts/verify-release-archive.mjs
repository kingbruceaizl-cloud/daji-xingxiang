import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const findings = [];

function fail(message) {
  findings.push(message);
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
    stderr: result.stderr.trim(),
  };
}

function resolveDistPath(fileName) {
  return resolve(process.cwd(), "dist", fileName);
}

function findLatestManifest() {
  const distDir = resolve(process.cwd(), "dist");
  if (!existsSync(distDir)) {
    fail("缺少 dist 目录，请先运行 pnpm run release:package。");
    return "";
  }

  const candidates = readdirSync(distDir)
    .filter((fileName) => /^daji-xingxiang-release-[a-f0-9]+\.json$/.test(fileName))
    .map((fileName) => ({
      fileName,
      mtimeMs: statSync(resolve(distDir, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (!candidates.length) {
    fail("缺少发布清单，请先运行 pnpm run release:package。");
    return "";
  }

  return candidates[0].fileName;
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail(`无法读取发布清单：${filePath}`);
    return null;
  }
}

function readChecksum(filePath) {
  if (!existsSync(filePath)) {
    fail(`缺少校验文件：${basename(filePath)}`);
    return "";
  }

  return readFileSync(filePath, "utf8").trim();
}

function listArchiveEntries(archivePath) {
  const result = run("unzip", ["-Z1", archivePath]);
  if (!result.ok) {
    fail("无法读取压缩包目录，请确认系统可使用 unzip。");
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function assertRequiredEntries(entries, requiredEntries) {
  const entrySet = new Set(entries);
  for (const entry of requiredEntries) {
    if (!entrySet.has(entry)) {
      fail(`源码包缺少必需文件：${entry}`);
    }
  }
}

function assertForbiddenEntries(entries) {
  const forbiddenPatterns = [
    /^node_modules\//,
    /^\.next\//,
    /^\.vercel\//,
    /^dist\//,
    /^\.env$/,
    /^\.env\.local$/,
    /^\.env\.production$/,
    /^\.env\..*\.local$/,
    /(^|\/)\.DS_Store$/,
  ];

  for (const entry of entries) {
    if (forbiddenPatterns.some((pattern) => pattern.test(entry))) {
      fail(`源码包不应包含：${entry}`);
    }
  }
}

console.log("大吉形象源码交付包校验");
console.log("----------------------");

const manifestName = process.env.RELEASE_MANIFEST || findLatestManifest();
if (!manifestName) {
  process.exitCode = 1;
} else {
  const manifestPath = resolveDistPath(manifestName);
  const manifest = readJson(manifestPath);

  if (manifest) {
    const archiveName = manifest.archive?.file;
    const expectedSha256 = manifest.archive?.sha256;
    const expectedSizeBytes = manifest.archive?.sizeBytes;

    if (!archiveName || !expectedSha256 || !expectedSizeBytes) {
      fail("发布清单缺少 archive.file、archive.sha256 或 archive.sizeBytes。");
    } else {
      if (!/^daji-xingxiang-source-[a-f0-9]+\.zip$/.test(archiveName)) {
        fail("发布清单中的源码包文件名不符合 daji-xingxiang-source-<提交号>.zip 规范。");
      }

      const archivePath = resolveDistPath(archiveName);
      const checksumPath = resolveDistPath(`${archiveName}.sha256`);

      if (!existsSync(archivePath)) {
        fail(`缺少源码包：${archiveName}`);
      } else {
        const archiveBytes = readFileSync(archivePath);
        const actualSha256 = createHash("sha256").update(archiveBytes).digest("hex");
        const actualSizeBytes = archiveBytes.byteLength;
        const checksum = readChecksum(checksumPath);

        if (actualSha256 !== expectedSha256) {
          fail("源码包 SHA256 与发布清单不一致。");
        }

        if (actualSizeBytes !== expectedSizeBytes) {
          fail("源码包大小与发布清单不一致。");
        }

        if (checksum && checksum !== `${expectedSha256}  ${archiveName}`) {
          fail("校验文件内容与发布清单不一致。");
        }

        const entries = listArchiveEntries(archivePath);
        assertRequiredEntries(entries, [
          "package.json",
          "pnpm-lock.yaml",
          "README.md",
          ".env.example",
          ".env.production.example",
          "app/page.tsx",
          "app/api/health/route.ts",
          "app/api/generate/image/route.ts",
          "app/api/generate/video/route.ts",
          "docs/prd.md",
          "docs/deployment.md",
          "docs/launch-handoff.md",
          "docs/material-sources.md",
          "supabase/migrations/0001_initial_schema.sql",
          "supabase/migrations/0002_auth_storage_and_indexes.sql",
          "supabase/seed/0001_seed_demo_data.sql",
        ]);
        assertForbiddenEntries(entries);

        console.log(`清单：dist/${manifestName}`);
        console.log(`源码包：dist/${archiveName}`);
        console.log(`文件数：${entries.length}`);
        console.log(`SHA256：${actualSha256}`);
      }
    }
  }
}

if (findings.length) {
  console.log("未通过，先处理以下源码包问题：");
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log("检查通过：源码交付包、校验文件和发布清单一致。");
}
