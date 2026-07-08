import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const filesToScan = [
  "lib/demo-data.ts",
  "supabase/seed/0001_seed_demo_data.sql",
];

const sourceDocPath = "docs/material-sources.md";
const photoIdPattern = /images\.pexels\.com\/photos\/(\d+)\//g;
const findings = [];
const photoIds = new Set();

function read(path) {
  const fullPath = resolve(process.cwd(), path);

  if (!existsSync(fullPath)) {
    findings.push(`缺少文件：${path}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

console.log("大吉形象素材来源检查");
console.log("--------------------");

for (const file of filesToScan) {
  const content = read(file);
  for (const match of content.matchAll(photoIdPattern)) {
    photoIds.add(match[1]);
  }
}

const sourceDoc = read(sourceDocPath);

for (const photoId of photoIds) {
  if (!sourceDoc.includes(photoId)) {
    findings.push(`素材来源文档缺少 Pexels 图片编号：${photoId}`);
  }
}

if (!sourceDoc.includes("Pexels License")) {
  findings.push("素材来源文档缺少 Pexels 授权说明。");
}

if (photoIds.size < 8) {
  findings.push("示例素材数量偏少，建议至少覆盖 8 个图片来源。");
}

if (findings.length) {
  console.log("发现需要处理的问题：");
  for (const item of findings) {
    console.log(`- ${item}`);
  }
  process.exitCode = 1;
} else {
  console.log(`检查通过：${photoIds.size} 个线上素材均已记录来源。`);
}
