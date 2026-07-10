import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_auth_storage_and_indexes.sql",
  "supabase/migrations/0003_model_task_routes.sql",
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
  "ai_model_routes",
  "ai_jobs",
  "job_events",
];

const requiredBucketSettings = [
  {
    name: "customer-assets",
    public: false,
    fileSizeLimit: 104857600,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
  },
  {
    name: "generated-assets",
    public: false,
    fileSizeLimit: 524288000,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
  },
  {
    name: "product-assets",
    public: true,
    fileSizeLimit: 52428800,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: "music-assets",
    public: false,
    fileSizeLimit: 52428800,
    mimeTypes: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"],
  },
];

const requiredProviders = ["kie", "openai", "jimeng", "kling", "tongyi"];

const requiredTablePolicies = [
  "用户可读取自己的资料",
  "用户可更新自己的资料",
  "用户可管理自己的项目",
  "用户可管理自己的素材",
  "登录用户可读取商品分类",
  "登录用户可读取商品",
  "登录用户可读取风格模板",
  "登录用户可读取视频模板",
  "登录用户可读取脚本模板",
  "登录用户可读取音乐库",
  "登录用户可读取模型配置",
  "登录用户可读取模型",
  "登录用户可读取模型路由",
  "用户可管理自己的生成任务",
  "用户可读取自己任务事件",
];

const requiredStoragePolicies = [
  "用户可读取自己的客户素材",
  "用户可上传自己的客户素材",
  "用户可更新自己的客户素材",
  "用户可删除自己的客户素材",
  "公开读取商品素材",
];

function readProjectFile(path) {
  const fullPath = resolve(process.cwd(), path);

  if (!existsSync(fullPath)) {
    return null;
  }

  return readFileSync(fullPath, "utf8");
}

function bucketDefinitionBlock(schema, bucketName) {
  const start = schema.indexOf(`'${bucketName}'`);

  if (start === -1) {
    return "";
  }

  return schema.slice(start, start + 700);
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
const modelRouteSchema = readProjectFile(requiredFiles[2]) || "";
const seedData = readProjectFile(requiredFiles[3]) || "";
const tableSchema = `${initialSchema}\n${modelRouteSchema}`;

for (const table of requiredTables) {
  if (!tableSchema.includes(`create table if not exists public.${table}`) && !tableSchema.includes(`create table public.${table}`)) {
    findings.push(`缺少数据表定义：${table}`);
  }

  if (!tableSchema.includes(`alter table public.${table} enable row level security`)) {
    findings.push(`缺少 RLS 开启语句：${table}`);
  }
}

for (const bucket of requiredBucketSettings) {
  const bucketBlock = bucketDefinitionBlock(storageSchema, bucket.name);

  if (!storageSchema.includes(`'${bucket.name}'`)) {
    findings.push(`缺少存储桶定义：${bucket.name}`);
  }

  if (!bucketBlock.includes(`\n    ${bucket.public},`)) {
    findings.push(`存储桶 ${bucket.name} 的公开属性应为：${bucket.public}`);
  }

  if (!storageSchema.includes(`${bucket.fileSizeLimit}`)) {
    findings.push(`存储桶 ${bucket.name} 缺少文件大小限制：${bucket.fileSizeLimit}`);
  }

  for (const mimeType of bucket.mimeTypes) {
    if (!storageSchema.includes(`'${mimeType}'`)) {
      findings.push(`存储桶 ${bucket.name} 缺少 MIME 类型：${mimeType}`);
    }
  }
}

if (!storageSchema.includes("public.handle_new_user")) {
  findings.push("缺少注册后自动创建用户资料的触发器函数。");
}

if (!storageSchema.includes("on_auth_user_created")) {
  findings.push("缺少注册后自动创建用户资料的触发器。");
}

for (const policy of requiredTablePolicies) {
  if (!tableSchema.includes(`create policy "${policy}"`)) {
    findings.push(`缺少数据表 RLS 策略：${policy}`);
  }
}

for (const policy of requiredStoragePolicies) {
  if (!storageSchema.includes(`create policy "${policy}"`)) {
    findings.push(`缺少存储对象策略：${policy}`);
  }
}

if (!storageSchema.includes("owner_id = (select auth.uid()::text)")) {
  findings.push("私有存储对象策略需要使用 owner_id 校验归属。");
}

if (!storageSchema.includes("(storage.foldername(name))[1] = (select auth.uid()::text)")) {
  findings.push("私有存储对象策略需要校验路径第一段为当前用户 ID。");
}

if (storageSchema.includes("owner = auth.uid()")) {
  findings.push("发现旧存储归属字段 owner，请改用 owner_id 与用户路径前缀。");
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

if (!seedData.includes("gpt-image-2-text-to-image")) {
  findings.push("缺少 KIE 文生图模型种子数据。");
}

if (!seedData.includes("gpt-image-2-image-to-image")) {
  findings.push("缺少 KIE 图生图模型种子数据。");
}

for (const routeKey of [
  "text_generation",
  "image_understanding",
  "text_to_image",
  "image_to_image",
  "image_to_video",
  "video_generation",
  "long_video_generation",
]) {
  if (!seedData.includes(`'${routeKey}'`)) {
    findings.push(`缺少模型能力路由种子数据：${routeKey}`);
  }
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
