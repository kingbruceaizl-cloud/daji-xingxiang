import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function exists(path) {
  return existsSync(resolve(process.cwd(), path));
}

const findings = [];

function requireFile(path) {
  if (!exists(path)) {
    findings.push(`缺少发布文件：${path}`);
    return "";
  }

  return read(path);
}

function requireIncludes(path, content, values) {
  for (const value of values) {
    if (!content.includes(value)) {
      findings.push(`${path} 缺少内容：${value}`);
    }
  }
}

function requireExcludes(path, content, values) {
  for (const value of values) {
    if (content.includes(value)) {
      findings.push(`${path} 不应包含：${value}`);
    }
  }
}

console.log("大吉形象发布包检查");
console.log("------------------");

const packageJson = JSON.parse(requireFile("package.json") || "{}");
const scripts = packageJson.scripts || {};
if (packageJson.packageManager !== "pnpm@11.7.0") {
  findings.push("package.json 需要固定 packageManager 为 pnpm@11.7.0。");
}
if (packageJson.engines?.node !== ">=20.18.0") {
  findings.push("package.json 需要声明 Node.js 运行版本：engines.node >=20.18.0。");
}
const dependencyGroups = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
};
const latestDependencies = Object.entries(dependencyGroups)
  .filter(([, version]) => version === "latest")
  .map(([name]) => name);
if (latestDependencies.length) {
  findings.push(`package.json 不应使用 latest 依赖：${latestDependencies.join("、")}。`);
}

for (const script of [
  "build",
  "lint",
  "check:env",
  "check:secrets",
  "check:zh",
  "check:materials",
  "check:supabase",
  "check:release",
  "check:deploy",
  "release:check",
  "release:archive",
  "publish:status",
  "smoke:admin-demo",
  "smoke:prod",
  "smoke:url",
  "verify:ci",
  "verify:commit",
  "verify:local",
  "preflight",
]) {
  if (!scripts[script]) {
    findings.push(`package.json 缺少脚本：${script}`);
  }
}

const envExample = requireFile(".env.example");
requireIncludes(".env.example", envExample, [
  "NEXT_PUBLIC_SUPABASE_URL=",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
  "SUPABASE_SERVICE_ROLE_KEY=",
  "NEXT_PUBLIC_APP_URL=",
  "KIE_API_KEY=",
]);

const envProductionExample = requireFile(".env.production.example");
requireIncludes(".env.production.example", envProductionExample, [
  "NEXT_PUBLIC_APP_URL=https://你的域名",
  "NEXT_PUBLIC_APP_ENV=production",
  "SUPABASE_SERVICE_ROLE_KEY=",
]);

const envTemplateCheck = requireFile("scripts/check-env-templates.mjs");
requireIncludes("scripts/check-env-templates.mjs", envTemplateCheck, [
  "大吉形象环境变量模板检查",
  ".env.production.example",
  "NEXT_PUBLIC_APP_ENV=production",
]);

const secretSafetyCheck = requireFile("scripts/check-secret-safety.mjs");
requireIncludes("scripts/check-secret-safety.mjs", secretSafetyCheck, [
  "大吉形象密钥安全检查",
  "git",
  "check-ignore",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "KIE_API_KEY",
  "PRIVATE KEY",
]);

const releaseArchive = requireFile("scripts/create-release-archive.mjs");
requireIncludes("scripts/create-release-archive.mjs", releaseArchive, [
  "大吉形象源码交付包生成",
  "git",
  "archive",
  "daji-xingxiang-source-",
  "dist",
  "只包含 Git 已提交文件",
]);

const vercelConfig = requireFile("vercel.json");
requireIncludes("vercel.json", vercelConfig, [
  '"framework": "nextjs"',
  '"installCommand": "pnpm install --frozen-lockfile"',
  '"buildCommand": "pnpm run build"',
]);

const githubWorkflow = requireFile(".github/workflows/verify.yml");
requireIncludes(".github/workflows/verify.yml", githubWorkflow, [
  "大吉形象发布验证",
  "pnpm run verify:ci",
  "node-version-file: .node-version",
  "pnpm install --frozen-lockfile",
]);

const onlineSmokeWorkflow = requireFile(".github/workflows/online-smoke.yml");
requireIncludes(".github/workflows/online-smoke.yml", onlineSmokeWorkflow, [
  "大吉形象线上冒烟验证",
  "workflow_dispatch",
  "base_url",
  "SMOKE_BASE_URL",
  "pnpm run smoke:url",
]);

const materialCheck = requireFile("scripts/check-material-sources.mjs");
requireIncludes("scripts/check-material-sources.mjs", materialCheck, [
  "大吉形象素材来源检查",
  "docs/material-sources.md",
  "Pexels",
]);

const smokeProd = requireFile("scripts/smoke-prod.mjs");
requireIncludes("scripts/smoke-prod.mjs", smokeProd, [
  "大吉形象生产模式冒烟测试",
  "assertSecurityHeaders",
  "assertKieCallback",
  "assertDemoJobLookup",
  "/admin/launch",
  "/api/catalog",
]);

const smokeAdminDemo = requireFile("scripts/smoke-admin-demo.mjs");
requireIncludes("scripts/smoke-admin-demo.mjs", smokeAdminDemo, [
  "大吉形象后台演示模式冒烟测试",
  "/admin/video-templates",
  "/admin/music",
  "/admin/jobs",
  "NEXT_PUBLIC_SUPABASE_URL",
]);

const smokeUrl = requireFile("scripts/smoke-url.mjs");
requireIncludes("scripts/smoke-url.mjs", smokeUrl, [
  "大吉形象线上地址冒烟测试",
  "assertSecurityHeaders",
  "SMOKE_BASE_URL",
  "/api/health",
]);

const kieCallback = requireFile("app/api/provider-callback/kie/route.ts");
requireIncludes("app/api/provider-callback/kie/route.ts", kieCallback, [
  "KIE 回调已处理，生成任务状态已更新。",
  "provider_job_id",
  "job_events",
  "normalizedStatus",
  "saveGeneratedResultAssets",
]);

const resultAssets = requireFile("lib/ai/result-assets.ts");
requireIncludes("lib/ai/result-assets.ts", resultAssets, [
  "generated-assets",
  "asset_files",
  "output_asset_ids",
  "createSignedUrl",
  "sourceUrl",
]);

const jobApi = requireFile("app/api/jobs/[id]/route.ts");
requireIncludes("app/api/jobs/[id]/route.ts", jobApi, [
  "getGeneratedResultAssets",
  "getCurrentUserId",
  "当前账号没有权限查看这个生成任务。",
  "output_asset_ids",
  "outputAssets",
  "previewUrl",
]);

const generatePanel = requireFile("components/studio/generate-panel.tsx");
requireIncludes("components/studio/generate-panel.tsx", generatePanel, [
  "KIE 图像",
  "lookupJob",
  "latestJobRef",
  "pollingJobKey",
  "正在自动查询",
  "outputAssets",
]);

const releaseCheck = requireFile("scripts/release-check.mjs");
requireIncludes("scripts/release-check.mjs", releaseCheck, [
  "大吉形象正式发布总检查",
  "smoke:admin-demo",
  "verify:local",
  "smoke:prod",
  "check:deploy",
  "preflight",
  "smoke:url",
]);

const deployTargetCheck = requireFile("scripts/check-deploy-target.mjs");
requireIncludes("scripts/check-deploy-target.mjs", deployTargetCheck, [
  "大吉形象部署目标审计",
  "git",
  "origin",
  "初始提交",
  "user.name",
  "user.email",
  "vercel.json",
  "engines.node",
  "latestDependencies",
  "ALLOW_MANUAL_VERCEL_DEPLOY",
  "NEXT_PUBLIC_APP_URL",
]);

const publishStatus = requireFile("scripts/publish-status.mjs");
requireIncludes("scripts/publish-status.mjs", publishStatus, [
  "大吉形象发布通道状态",
  "GitHub 远程 origin",
  "Vercel Token",
  "Supabase Access Token",
  "AI 模型密钥",
  "NEXT_PUBLIC_APP_URL",
]);

const gitignore = requireFile(".gitignore");
requireIncludes(".gitignore", gitignore, [
  ".env*.local",
  ".env",
  ".env.production",
  ".vercel",
  "/dist",
]);
requireExcludes(".gitignore", gitignore, ["next-env.d.ts"]);

requireFile("next-env.d.ts");
const nodeVersion = requireFile(".node-version");
requireIncludes(".node-version", nodeVersion, ["20.18.0"]);
const npmrc = requireFile(".npmrc");
requireIncludes(".npmrc", npmrc, [
  "engine-strict=true",
  "package-manager-strict=true",
  "save-exact=true",
]);

const layout = requireFile("app/layout.tsx");
requireIncludes("app/layout.tsx", layout, [
  'lang="zh-CN"',
  "NEXT_PUBLIC_APP_URL",
  "/manifest.webmanifest",
  "大吉形象",
]);

const sitemap = requireFile("app/sitemap.ts");
requireIncludes("app/sitemap.ts", sitemap, [
  "NEXT_PUBLIC_APP_URL",
  "/projects/new",
  "/studio/demo",
]);

const robots = requireFile("app/robots.ts");
requireIncludes("app/robots.ts", robots, [
  "/sitemap.xml",
  "/admin",
  "/api",
]);

const manifest = requireFile("app/manifest.ts");
requireIncludes("app/manifest.ts", manifest, [
  "大吉形象",
  "zh-CN",
  "/projects/new",
]);

const nextConfig = requireFile("next.config.ts");
requireIncludes("next.config.ts", nextConfig, [
  "images.pexels.com",
  "cacheComponents",
  "poweredByHeader: false",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  "Permissions-Policy",
]);

for (const routeFile of [
  "app/page.tsx",
  "app/projects/new/page.tsx",
  "app/studio/[projectId]/page.tsx",
  "app/admin/launch/page.tsx",
  "app/admin/video-templates/page.tsx",
  "app/admin/music/page.tsx",
  "app/admin/jobs/page.tsx",
  "app/api/health/route.ts",
  "app/api/jobs/[id]/route.ts",
  "app/api/upload/route.ts",
  "app/api/generate/image/route.ts",
  "app/api/provider-callback/kie/route.ts",
  "lib/ai/result-assets.ts",
  "app/api/admin/video-templates/route.ts",
  "app/api/admin/music/route.ts",
]) {
  requireFile(routeFile);
}

for (const doc of [
  "README.md",
  "docs/prd.md",
  "docs/frontend-requirements.md",
  "docs/backend-requirements.md",
  "docs/deployment.md",
  "docs/launch-handoff.md",
  "docs/supabase-setup.md",
  "docs/ci-release.md",
  "docs/env-vars.md",
  "docs/release-checklist.md",
  "docs/material-sources.md",
]) {
  requireFile(doc);
}

if (findings.length) {
  console.log("发现需要处理的问题：");
  for (const item of findings) {
    console.log(`- ${item}`);
  }
  process.exitCode = 1;
} else {
  console.log("检查通过：发布包基础文件齐全。");
}
