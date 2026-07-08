import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");
const releaseArtifactPattern =
  /^daji-xingxiang-(?:source-[a-f0-9]+\.zip(?:\.sha256)?|release-[a-f0-9]+\.json|env-handoff\.md|github-handoff\.md|launch-summary\.md|model-handoff\.md|supabase-init\.sql|vercel-handoff\.md)$/;

console.log("大吉形象交付目录清理");
console.log("--------------------");

if (!existsSync(distDir)) {
  console.log("检查通过：dist 目录不存在，无需清理。");
} else {
  const removedFiles = [];
  for (const fileName of readdirSync(distDir)) {
    if (!releaseArtifactPattern.test(fileName)) {
      continue;
    }

    rmSync(resolve(distDir, fileName), { force: true });
    removedFiles.push(fileName);
  }

  if (removedFiles.length) {
    console.log(`已清理旧交付文件：${removedFiles.length} 个`);
  } else {
    console.log("检查通过：没有需要清理的旧交付文件。");
  }
}
