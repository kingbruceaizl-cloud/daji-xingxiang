import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_EXECUTION_MODE",
  "CRON_SECRET",
  "AI_WORKER_SECRET",
  "AI_WORKER_BATCH_SIZE",
  "ARK_BASE_URL",
  "ARK_API_KEY",
  "ARK_TEXT_MODEL_ID",
  "ARK_IMAGE_MODEL_ID",
  "ARK_VIDEO_MODEL_ID",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP",
];

const templateFiles = [".env.example", ".env.production.example"];
const envContractFiles = [
  {
    path: "scripts/create-env-handoff.mjs",
    keys: requiredKeys,
  },
  {
    path: "scripts/create-vercel-env-template.mjs",
    keys: requiredKeys,
  },
  {
    path: "scripts/create-vercel-handoff.mjs",
    keys: requiredKeys,
  },
  {
    path: "docs/env-vars.md",
    keys: requiredKeys,
  },
];
const preflightKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP",
  "AI_EXECUTION_MODE",
  "CRON_SECRET",
  "ARK_BASE_URL",
  "ARK_API_KEY",
  "ARK_TEXT_MODEL_ID",
  "ARK_IMAGE_MODEL_ID",
  "ARK_VIDEO_MODEL_ID",
];
const findings = [];

function read(path) {
  const fullPath = resolve(process.cwd(), path);

  if (!existsSync(fullPath)) {
    findings.push(`缺少环境变量模板：${path}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function parseKeys(content) {
  return new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=")[0]),
  );
}

function assertContentIncludesKeys(path, content, keys) {
  for (const key of keys) {
    if (!content.includes(key)) {
      findings.push(`${path} 缺少环境变量约定：${key}`);
    }
  }
}

console.log("大吉形象环境变量模板检查");
console.log("------------------------");

const templates = new Map();
for (const file of templateFiles) {
  const content = read(file);
  templates.set(file, {
    content,
    keys: parseKeys(content),
  });
}

for (const [file, template] of templates) {
  for (const key of requiredKeys) {
    if (!template.keys.has(key)) {
      findings.push(`${file} 缺少环境变量：${key}`);
    }
  }
}

const localTemplate = templates.get(".env.example")?.keys || new Set();
const productionTemplate = templates.get(".env.production.example")?.keys || new Set();

for (const key of localTemplate) {
  if (!productionTemplate.has(key)) {
    findings.push(`.env.production.example 缺少 .env.example 中的变量：${key}`);
  }
}

for (const key of productionTemplate) {
  if (!localTemplate.has(key)) {
    findings.push(`.env.example 缺少 .env.production.example 中的变量：${key}`);
  }
}

const productionContent = templates.get(".env.production.example")?.content || "";
if (productionContent.includes("localhost")) {
  findings.push(".env.production.example 不能包含 localhost。");
}

if (!productionContent.includes("NEXT_PUBLIC_APP_ENV=production")) {
  findings.push(".env.production.example 需要设置 NEXT_PUBLIC_APP_ENV=production。");
}

if (!productionContent.includes("NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false")) {
  findings.push(
    ".env.production.example 需要设置 NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false。",
  );
}

for (const item of envContractFiles) {
  assertContentIncludesKeys(item.path, read(item.path), item.keys);
}

assertContentIncludesKeys("scripts/preflight.mjs", read("scripts/preflight.mjs"), preflightKeys);

const gitignore = read(".gitignore");
if (!gitignore.includes(".env.production")) {
  findings.push(".gitignore 需要忽略 .env.production，避免正式密钥误提交。");
}

if (findings.length) {
  console.log("发现需要处理的问题：");
  for (const item of findings) {
    console.log(`- ${item}`);
  }
  process.exitCode = 1;
} else {
  console.log("检查通过：环境变量模板齐全且正式模板未使用本地地址。");
}
