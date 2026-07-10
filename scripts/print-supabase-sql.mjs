import { readFileSync } from "node:fs";
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
  "supabase/migrations/0009_operations_monitoring.sql",
  "supabase/seed/0001_seed_demo_data.sql",
];

console.log("-- 大吉形象 Supabase 初始化 SQL");
console.log("-- 使用方式：复制本输出，到 Supabase SQL Editor 中执行。");
console.log("-- 执行前请确认已经创建 Supabase 项目。");

for (const file of orderedFiles) {
  console.log("");
  console.log(`-- ===== ${file} =====`);
  console.log(readFileSync(resolve(process.cwd(), file), "utf8"));
}
