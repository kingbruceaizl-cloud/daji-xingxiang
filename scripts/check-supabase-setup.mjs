import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_auth_storage_and_indexes.sql",
  "supabase/seed/0001_seed_demo_data.sql",
];

const requiredTables = [
  "profiles",
  "projects",
  "asset_files",
  "product_categories",
  "products",
  "style_presets",
  "video_templates",
  "script_templates",
  "music_tracks",
  "ai_providers",
  "ai_models",
  "ai_jobs",
  "job_events",
];

const requiredBuckets = [
  "customer-assets",
  "generated-assets",
  "product-assets",
  "music-assets",
];

const requiredProviders = ["kie", "openai", "jimeng", "kling", "tongyi"];

function readProjectFile(path) {
  const fullPath = resolve(process.cwd(), path);

  if (!existsSync(fullPath)) {
    return null;
  }

  return readFileSync(fullPath, "utf8");
}

const findings = [];

console.log("大吉形象 Supabase 初始化检查");
console.log("----------------------------");

for (const file of requiredFiles) {
  if (!existsSync(resolve(process.cwd(), file))) {
    findings.push(`缺少文件：${file}`);
  }
}

const initialSchema = readProjectFile(requiredFiles[0]) || "";
const storageSchema = readProjectFile(requiredFiles[1]) || "";
const seedData = readProjectFile(requiredFiles[2]) || "";

for (const table of requiredTables) {
  if (!initialSchema.includes(`create table public.${table}`)) {
    findings.push(`缺少数据表定义：${table}`);
  }
}

for (const bucket of requiredBuckets) {
  if (!storageSchema.includes(`'${bucket}'`)) {
    findings.push(`缺少存储桶定义：${bucket}`);
  }
}

if (!storageSchema.includes("public.handle_new_user")) {
  findings.push("缺少注册后自动创建用户资料的触发器函数。");
}

if (!storageSchema.includes("on_auth_user_created")) {
  findings.push("缺少注册后自动创建用户资料的触发器。");
}

if (!initialSchema.includes("usage_note text")) {
  findings.push("音乐库缺少使用场景字段：usage_note。");
}

for (const provider of requiredProviders) {
  if (!seedData.includes(`'${provider}'`)) {
    findings.push(`缺少模型通道种子数据：${provider}`);
  }
}

if (!seedData.includes("新中式轻礼服")) {
  findings.push("缺少默认风格模板种子数据。");
}

if (!seedData.includes("低能量穿搭变装")) {
  findings.push("缺少默认视频模板种子数据。");
}

if (!seedData.includes("通勤改造脚本")) {
  findings.push("缺少默认脚本文案种子数据。");
}

if (!seedData.includes("松弛低能量节拍")) {
  findings.push("缺少默认音乐库种子数据。");
}

if (!seedData.includes("柔雾底妆盘") || !seedData.includes("简约通勤手袋")) {
  findings.push("缺少扩展商品库种子数据。");
}

if (seedData.includes("真实SKU")) {
  findings.push("发现旧中文标签“真实SKU”，建议统一为“真实商品”。");
}

if (findings.length) {
  console.log("发现需要处理的问题：");
  for (const item of findings) {
    console.log(`- ${item}`);
  }
  process.exitCode = 1;
} else {
  console.log("检查通过：迁移文件、存储桶和演示数据齐全。");
}
