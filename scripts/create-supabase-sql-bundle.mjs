import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const orderedFiles = [
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_auth_storage_and_indexes.sql",
  "supabase/migrations/0003_model_task_routes.sql",
  "supabase/migrations/0004_production_ai_jobs.sql",
  "supabase/migrations/0005_production_ai_job_fields.sql",
  "supabase/migrations/0006_durable_ai_worker.sql",
  "supabase/migrations/0007_volcengine_video.sql",
  "supabase/migrations/0008_team_roles_and_quotas.sql",
  "supabase/seed/0001_seed_demo_data.sql",
];

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-supabase-init.sql");
const findings = [];

console.log("大吉形象 Supabase SQL 交付文件生成");
console.log("----------------------------------");

for (const file of orderedFiles) {
  if (!existsSync(resolve(process.cwd(), file))) {
    findings.push(`缺少 Supabase 初始化文件：${file}`);
  }
}

if (findings.length) {
  console.log("未通过，先处理以下问题：");
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  const lines = [
    "-- 大吉形象 Supabase 初始化 SQL",
    `-- 生成时间：${new Date().toISOString()}`,
    "-- 使用方式：创建 Supabase 项目后，复制本文件全部内容到 Supabase SQL Editor 执行。",
    "-- 注意：执行前请确认当前连接的是正式要使用的 Supabase 项目。",
  ];

  for (const file of orderedFiles) {
    lines.push("", `-- ===== ${file} =====`, readFileSync(resolve(process.cwd(), file), "utf8"));
  }

  mkdirSync(distDir, { recursive: true });
  writeFileSync(outputPath, `${lines.join("\n")}\n`);

  console.log("检查通过：已生成 Supabase SQL 交付文件。");
  console.log("路径：dist/daji-xingxiang-supabase-init.sql");
}
