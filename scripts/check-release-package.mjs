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
  "check:materials:urls",
  "check:supabase",
  "check:release",
  "check:deploy",
  "release:check",
  "release:archive",
  "release:clean",
  "release:env-handoff",
  "release:github-handoff",
  "release:launch-runbook",
  "release:launch-summary",
  "release:model-handoff",
  "release:package",
  "release:supabase-sql",
  "release:supabase-verify-sql",
  "release:vercel-env-template",
  "release:vercel-handoff",
  "release:verify-archive",
  "release:verify-handoff",
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
  "AI_EXECUTION_MODE=mock",
  "ARK_API_KEY=",
  "ARK_IMAGE_MODEL_ID=doubao-seedream-5-0-260128",
]);

const envProductionExample = requireFile(".env.production.example");
requireIncludes(".env.production.example", envProductionExample, [
  "NEXT_PUBLIC_APP_URL=https://你的域名",
  "NEXT_PUBLIC_APP_ENV=production",
  "NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false",
  "SUPABASE_SERVICE_ROLE_KEY=",
  "AI_EXECUTION_MODE=real",
  "ARK_API_KEY=",
]);

const envTemplateCheck = requireFile("scripts/check-env-templates.mjs");
requireIncludes("scripts/check-env-templates.mjs", envTemplateCheck, [
  "大吉形象环境变量模板检查",
  ".env.production.example",
  "envContractFiles",
  "assertContentIncludesKeys",
  "scripts/create-vercel-env-template.mjs",
  "docs/env-vars.md",
  "ARK_BASE_URL",
  "AI_EXECUTION_MODE",
  "NEXT_PUBLIC_APP_ENV=production",
  "NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false",
]);

const secretSafetyCheck = requireFile("scripts/check-secret-safety.mjs");
requireIncludes("scripts/check-secret-safety.mjs", secretSafetyCheck, [
  "大吉形象密钥安全检查",
  "git",
  "check-ignore",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "ARK_API_KEY",
  "PRIVATE KEY",
]);

const chineseUiCheck = requireFile("scripts/check-chinese-ui.mjs");
requireIncludes("scripts/check-chinese-ui.mjs", chineseUiCheck, [
  "大吉形象中文界面检查",
  "allowedTechnicalTerms",
  "技术名词白名单",
  "纯英文界面词",
  "hasUnapprovedLatin",
  "isLikelyUserFacingString",
  "router\\.push",
]);

const releaseArchive = requireFile("scripts/create-release-archive.mjs");
requireIncludes("scripts/create-release-archive.mjs", releaseArchive, [
  "大吉形象源码交付包生成",
  "git",
  "archive",
  "daji-xingxiang-source-",
  "daji-xingxiang-release-",
  "sha256",
  ".sha256",
  "dist",
  "release:verify-archive",
  "check:materials:urls",
  "release:env-handoff",
  "release:github-handoff",
  "release:supabase-sql",
  "release:supabase-verify-sql",
  "release:vercel-env-template",
  "release:vercel-handoff",
  "release:model-handoff",
  "release:launch-runbook",
  "release:launch-summary",
  "release:verify-handoff",
  "只包含 Git 已提交文件",
]);

const cleanReleaseArtifacts = requireFile("scripts/clean-release-artifacts.mjs");
requireIncludes("scripts/clean-release-artifacts.mjs", cleanReleaseArtifacts, [
  "大吉形象交付目录清理",
  "daji-xingxiang-",
  "releaseArtifactPattern",
  "旧交付文件",
  "rmSync",
]);

const envHandoff = requireFile("scripts/create-env-handoff.mjs");
requireIncludes("scripts/create-env-handoff.mjs", envHandoff, [
  "大吉形象环境变量交接单生成",
  "daji-xingxiang-env-handoff.md",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP",
  "ARK_API_KEY",
  "ARK_IMAGE_MODEL_ID",
  "ARK_TEXT_MODEL_ID",
  "ARK_VIDEO_MODEL_ID",
  "Supabase Auth 回调地址",
  "不输出任何真实密钥值",
]);

const modelHandoff = requireFile("scripts/create-model-handoff.mjs");
requireIncludes("scripts/create-model-handoff.mjs", modelHandoff, [
  "大吉形象 AI 模型通道交接单生成",
  "daji-xingxiang-model-handoff.md",
  "ARK_API_KEY",
  "doubao-seedream-5-0-260128",
  "默认能力路由",
  "image_to_video",
  "OPENAI_API_KEY",
]);

const githubHandoff = requireFile("scripts/create-github-handoff.mjs");
requireIncludes("scripts/create-github-handoff.mjs", githubHandoff, [
  "大吉形象 GitHub 仓库交接单生成",
  "daji-xingxiang-github-handoff.md",
  "git remote add origin",
  "git push -u origin",
  "大吉形象发布验证",
  "大吉形象源码包交付",
  "daji-xingxiang-source-package",
]);

const launchRunbook = requireFile("scripts/create-launch-runbook.mjs");
requireIncludes("scripts/create-launch-runbook.mjs", launchRunbook, [
  "大吉形象上线执行核对单生成",
  "daji-xingxiang-launch-runbook.md",
  "GitHub 仓库",
  "Supabase 项目",
  "Vercel 部署",
  "ARK_API_KEY",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
]);

const verifyReleaseArchive = requireFile("scripts/verify-release-archive.mjs");
requireIncludes("scripts/verify-release-archive.mjs", verifyReleaseArchive, [
  "大吉形象源码交付包校验",
  "RELEASE_MANIFEST",
  "daji-xingxiang-release-",
  "daji-xingxiang-source-",
  "release:package",
  "assertManifestVerifyCommands",
  "pnpm run check:materials:urls",
  ".github/workflows/verify.yml",
  ".github/workflows/release-package.yml",
  ".github/workflows/online-smoke.yml",
  ".node-version",
  ".npmrc",
  "vercel.json",
  "SHA256",
  "node_modules",
  ".next",
  ".env.production",
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0003_model_task_routes.sql",
  "scripts/check-material-urls.mjs",
  "supabase/seed/0001_seed_demo_data.sql",
]);

const launchSummary = requireFile("scripts/create-launch-summary.mjs");
requireIncludes("scripts/create-launch-summary.mjs", launchSummary, [
  "大吉形象上线摘要生成",
  "daji-xingxiang-launch-summary.md",
  "daji-xingxiang-env-handoff.md",
  "daji-xingxiang-github-handoff.md",
  "daji-xingxiang-model-handoff.md",
  "daji-xingxiang-supabase-init.sql",
  "daji-xingxiang-supabase-verify.sql",
  "daji-xingxiang-vercel-handoff.md",
  "daji-xingxiang-release-",
  "GitHub 远程仓库",
  "火山方舟",
  "剩余上线动作",
  "不输出任何真实密钥值",
]);

const preflight = requireFile("scripts/preflight.mjs");
requireIncludes("scripts/preflight.mjs", preflight, [
  "大吉形象上线前检查",
  "placeholderTokens",
  "isPlaceholderValue",
  "正式环境变量存在问题",
  "仍是占位值",
  "长度过短",
  "validateExactEnv",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP",
  "应用运行环境",
  "production",
  "AI_EXECUTION_MODE",
  "ARK_API_KEY",
  "ARK_IMAGE_MODEL_ID",
]);

const supabaseSqlBundle = requireFile("scripts/create-supabase-sql-bundle.mjs");
requireIncludes("scripts/create-supabase-sql-bundle.mjs", supabaseSqlBundle, [
  "大吉形象 Supabase SQL 交付文件生成",
  "daji-xingxiang-supabase-init.sql",
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_auth_storage_and_indexes.sql",
  "supabase/migrations/0003_model_task_routes.sql",
  "supabase/migrations/0004_production_ai_jobs.sql",
  "supabase/migrations/0005_production_ai_job_fields.sql",
  "supabase/migrations/0006_durable_ai_worker.sql",
  "supabase/migrations/0007_volcengine_video.sql",
  "supabase/migrations/0008_team_roles_and_quotas.sql",
  "supabase/seed/0001_seed_demo_data.sql",
  "Supabase SQL Editor",
]);

const supabaseSqlPrint = requireFile("scripts/print-supabase-sql.mjs");
requireIncludes("scripts/print-supabase-sql.mjs", supabaseSqlPrint, [
  "大吉形象 Supabase 初始化 SQL",
  "supabase/migrations/0001_initial_schema.sql",
  "supabase/migrations/0002_auth_storage_and_indexes.sql",
  "supabase/migrations/0003_model_task_routes.sql",
  "supabase/migrations/0004_production_ai_jobs.sql",
  "supabase/migrations/0005_production_ai_job_fields.sql",
  "supabase/migrations/0006_durable_ai_worker.sql",
  "supabase/migrations/0007_volcengine_video.sql",
  "supabase/migrations/0008_team_roles_and_quotas.sql",
  "supabase/seed/0001_seed_demo_data.sql",
]);

const supabaseVerifySql = requireFile("scripts/create-supabase-verify-sql.mjs");
requireIncludes("scripts/create-supabase-verify-sql.mjs", supabaseVerifySql, [
  "大吉形象 Supabase 验收 SQL 生成",
  "daji-xingxiang-supabase-verify.sql",
  "数据表",
  "存储桶",
  "RLS 策略",
  "存储策略",
  "expected_file_size_limit",
  "expected_mime_types",
  "私有桶归属校验使用 owner_id 与用户路径",
  "Seedream 5.0 完整版",
  "doubao-seedream-5-0-260128",
  "模型能力路由",
  "image_to_video",
]);

const supabaseSetupCheck = requireFile("scripts/check-supabase-setup.mjs");
requireIncludes("scripts/check-supabase-setup.mjs", supabaseSetupCheck, [
  "大吉形象 Supabase 初始化检查",
  "0003_model_task_routes.sql",
  "ai_model_routes",
  "登录用户可读取模型路由",
  "requiredBucketSettings",
  "requiredTablePolicies",
  "requiredStoragePolicies",
  "owner_id = (select auth.uid()::text)",
  "(storage.foldername(name))[1] = (select auth.uid()::text)",
  "发现旧存储归属字段 owner",
]);

const vercelEnvTemplate = requireFile("scripts/create-vercel-env-template.mjs");
requireIncludes("scripts/create-vercel-env-template.mjs", vercelEnvTemplate, [
  "大吉形象 Vercel 环境变量模板生成",
  "daji-xingxiang-vercel-env-template.env",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_ENV=production",
  "NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false",
  "ARK_API_KEY",
  "ARK_IMAGE_MODEL_ID",
  "CRON_SECRET",
]);

const vercelHandoff = requireFile("scripts/create-vercel-handoff.mjs");
requireIncludes("scripts/create-vercel-handoff.mjs", vercelHandoff, [
  "大吉形象 Vercel 部署交接单生成",
  "daji-xingxiang-vercel-handoff.md",
  "Framework Preset",
  "Node.js Version",
  "pnpm install --frozen-lockfile",
  "pnpm run build",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
]);

const verifyHandoff = requireFile("scripts/verify-handoff-artifacts.mjs");
requireIncludes("scripts/verify-handoff-artifacts.mjs", verifyHandoff, [
  "大吉形象交付物完整性校验",
  "daji-xingxiang-github-handoff.md",
  "daji-xingxiang-launch-runbook.md",
  "daji-xingxiang-launch-summary.md",
  "daji-xingxiang-model-handoff.md",
  "daji-xingxiang-supabase-init.sql",
  "daji-xingxiang-supabase-verify.sql",
  "daji-xingxiang-vercel-env-template.env",
  "daji-xingxiang-vercel-handoff.md",
  "shortCommit",
  "未发现明显密钥风险",
]);

const vercelConfig = requireFile("vercel.json");
requireIncludes("vercel.json", vercelConfig, [
  '"framework": "nextjs"',
  '"installCommand": "pnpm install --frozen-lockfile"',
  '"buildCommand": "pnpm run build"',
]);

const nextPrivateIndexingConfig = requireFile("next.config.ts");
requireIncludes("next.config.ts", nextPrivateIndexingConfig, [
  "privateIndexingHeaders",
  "privateCacheHeaders",
  "privateResponseHeaders",
  "X-Robots-Tag",
  "Cache-Control",
  "noindex, nofollow, noarchive",
  "no-store, max-age=0",
  "/admin/:path*",
  "/protected/:path*",
  "/api/:path*",
]);

const githubWorkflow = requireFile(".github/workflows/verify.yml");
requireIncludes(".github/workflows/verify.yml", githubWorkflow, [
  "大吉形象发布验证",
  "pnpm run verify:ci",
  "pnpm run check:materials:urls",
  "node-version: 22",
  "pnpm install --frozen-lockfile",
]);

const onlineSmokeWorkflow = requireFile(".github/workflows/online-smoke.yml");
requireIncludes(".github/workflows/online-smoke.yml", onlineSmokeWorkflow, [
  "大吉形象线上冒烟验证",
  "workflow_dispatch",
  "base_url",
  "SMOKE_BASE_URL",
  "node-version: 22",
  "pnpm run smoke:url",
]);

const releasePackageWorkflow = requireFile(".github/workflows/release-package.yml");
requireIncludes(".github/workflows/release-package.yml", releasePackageWorkflow, [
  "大吉形象源码包交付",
  "workflow_dispatch",
  "pnpm run verify:ci",
  "pnpm run check:materials:urls",
  "node-version: 22",
  "pnpm run release:package",
  "actions/upload-artifact@v4",
  "dist/daji-xingxiang-source-*.zip",
  "dist/daji-xingxiang-source-*.zip.sha256",
  "dist/daji-xingxiang-release-*.json",
  "dist/daji-xingxiang-env-handoff.md",
  "dist/daji-xingxiang-github-handoff.md",
  "dist/daji-xingxiang-launch-runbook.md",
  "dist/daji-xingxiang-launch-summary.md",
  "dist/daji-xingxiang-model-handoff.md",
  "dist/daji-xingxiang-supabase-init.sql",
  "dist/daji-xingxiang-supabase-verify.sql",
  "dist/daji-xingxiang-vercel-env-template.env",
  "dist/daji-xingxiang-vercel-handoff.md",
]);

const materialCheck = requireFile("scripts/check-material-sources.mjs");
requireIncludes("scripts/check-material-sources.mjs", materialCheck, [
  "大吉形象素材来源检查",
  "docs/material-sources.md",
  "Pexels",
]);

const materialUrlCheck = requireFile("scripts/check-material-urls.mjs");
requireIncludes("scripts/check-material-urls.mjs", materialUrlCheck, [
  "大吉形象线上素材连通性检查",
  "lib/demo-data.ts",
  "supabase/seed/0001_seed_demo_data.sql",
  "docs/material-sources.md",
  "images\\.pexels\\.com",
  "AbortSignal.timeout",
  "Range",
  "content-type",
]);

const smokeProd = requireFile("scripts/smoke-prod.mjs");
requireIncludes("scripts/smoke-prod.mjs", smokeProd, [
  "大吉形象生产模式冒烟测试",
  "assertSecurityHeaders",
  "assertPrivateIndexingHeaders",
  "assertPrivateCacheHeaders",
  "assertHomeMetadata",
  "assertManifest",
  "首页缺少中文品牌元信息",
  "og:site_name",
  "twitter:title",
  "assertDemoJobLookup",
  "/protected",
  "assertProtectedRedirect",
  "未登录访问应跳转到登录页",
  "assertMockGenerationAllowed",
  "assertRealProviderGenerationGuard",
  "/api/generate/image 匿名真实模型请求应被拒绝。",
  "真实模型通道 volcengine 需要先登录后再生成",
  "assertAdminWriteGuard",
  "assertAdminAssetUploadGuard",
  "assertInvalidUploadTypeGuard",
  "/api/upload 匿名上传后台素材不应成功。",
  "/api/upload 错误文件类型不应成功。",
  "当前账号没有后台素材上传权限",
  "不支持该文件类型",
  "/api/admin/products 匿名写入不应成功。",
  "请先登录后再操作后台",
  "data.deployment.platform",
  "data.deployment?.appEnv",
  "/admin/launch",
  "/api/catalog",
  "assertProjectDetail",
  "/projects/demo-xinzhongshi",
  "/api/projects/demo-xinzhongshi",
  "演示生图模型",
  "演示视频模型",
  "全部商品",
  "已选商品",
  "清空选择",
  "手动补充提示词",
  "短视频配置",
  "视频模板",
  "脚本文案",
  "音乐选择",
  "移除素材",
  "下载结果",
  "x-robots-tag",
  "cache-control",
]);

const smokeAdminDemo = requireFile("scripts/smoke-admin-demo.mjs");
requireIncludes("scripts/smoke-admin-demo.mjs", smokeAdminDemo, [
  "大吉形象后台演示模式冒烟测试",
  "/admin/video-templates",
  "/admin/music",
  "/admin/jobs",
  "字段说明",
  "配置模板",
  "演示生图模型",
  "演示视频模型",
  "NEXT_PUBLIC_SUPABASE_URL",
]);

const smokeUrl = requireFile("scripts/smoke-url.mjs");
requireIncludes("scripts/smoke-url.mjs", smokeUrl, [
  "大吉形象线上地址冒烟测试",
  "assertSecurityHeaders",
  "assertPrivateIndexingHeaders",
  "assertPrivateCacheHeaders",
  "assertHomeMetadata",
  "assertManifest",
  "首页缺少中文品牌元信息",
  "og:site_name",
  "twitter:title",
  "assertAdminWriteGuard",
  "assertAdminAssetUploadGuard",
  "assertInvalidUploadTypeGuard",
  "/api/upload 匿名上传后台素材不应成功。",
  "/api/upload 错误文件类型不应成功。",
  "当前账号没有后台素材上传权限",
  "不支持该文件类型",
  "assertMockGenerationBlocked",
  "assertRealProviderGenerationGuard",
  "SMOKE_BASE_URL",
  "assertOnlineBaseUrl",
  "线上冒烟测试必须使用 https 域名",
  "线上冒烟测试不能使用本地地址",
  "/api/health",
  "/admin/launch",
  "assertProjectDetail",
  "/projects/demo-xinzhongshi",
  "/api/projects/demo-xinzhongshi",
  "上线体检",
  "演示生图模型",
  "演示视频模型",
  "全部商品",
  "已选商品",
  "清空选择",
  "手动补充提示词",
  "短视频配置",
  "视频模板",
  "脚本文案",
  "音乐选择",
  "移除素材",
  "下载结果",
  "data.deployment?.platform",
  "data.deployment?.appEnv",
  "data.deployment?.publicUrl",
  "应用公开访问地址与当前线上测试域名不一致",
  "/api/generate/image 匿名真实模型请求应被拒绝。",
  "真实模型通道 volcengine 需要先登录后再生成",
  "/api/admin/products 匿名写入不应成功。",
  "请先登录后再操作后台",
  "x-robots-tag",
  "cache-control",
]);

const launchReadiness = requireFile("lib/launch-readiness.ts");
requireIncludes("lib/launch-readiness.ts", launchReadiness, [
  "getDeploymentInfo",
  "deployment: DeploymentInfo",
  "deployment: getDeploymentInfo()",
  "createSafeServerErrorMessage",
  "createSafeStorageErrorMessage",
  "requiredBucketSettings",
  "file_size_limit",
  "allowed_mime_types",
  "公开属性、大小限制和文件类型白名单符合上线要求",
  "发现配置需确认",
  "validateProductionEnvValue",
  "NEXT_PUBLIC_APP_ENV",
  "正式上线必须使用正式环境标识",
  "isPlaceholderValue",
  "仍是占位值，正式上线前需要替换为真实配置。",
  "长度过短，请确认已填写真实密钥。",
  "AI_EXECUTION_MODE",
  "ARK_API_KEY",
  "ARK_IMAGE_MODEL_ID",
  "CRON_SECRET",
]);

const aiAccess = requireFile("lib/ai/access.ts");
requireIncludes("lib/ai/access.ts", aiAccess, [
  "normalizeAiProvider",
  "realAiProviderRequiresLogin",
  "createRealAiProviderLoginMessage",
  "真实模型通道",
  "需要先登录后再生成",
]);

const aiDisplay = requireFile("lib/ai/display.ts");
requireIncludes("lib/ai/display.ts", aiDisplay, [
  "formatProviderLabel",
  "formatModelLabel",
  "formatJobTypeLabel",
  "formatJobStatusLabel",
  "演示通道",
  "演示生图模型",
  "演示视频模型",
]);

const authError = requireFile("lib/auth-error.ts");
requireIncludes("lib/auth-error.ts", authError, [
  "formatAuthErrorMessage",
  "邮箱或密码不正确，请重新输入。",
  "请先完成邮箱验证，再登录大吉形象。",
  "操作过于频繁，请稍后再试。",
]);

const serverError = requireFile("lib/server-error.ts");
requireIncludes("lib/server-error.ts", serverError, [
  "createSafeServerErrorMessage",
  "createSafeStorageErrorMessage",
  "失败，请稍后重试。",
  "失败，请检查存储配置后重试。",
]);

const deploymentInfo = requireFile("lib/deployment-info.ts");
requireIncludes("lib/deployment-info.ts", deploymentInfo, [
  "getDeploymentInfo",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_URL",
  "gitCommitShort",
]);

const projectsLib = requireFile("lib/projects.ts");
requireIncludes("lib/projects.ts", projectsLib, [
  "getProjectDetailById",
  "ProjectDetail",
  "formatJobTypeLabel",
  "formatJobStatusLabel",
  "demoAssets",
  "assets",
  "jobs",
]);

const catalogLib = requireFile("lib/catalog.ts");
requireIncludes("lib/catalog.ts", catalogLib, [
  "getCatalogData",
  "formatJobTypeLabel",
  "formatJobStatusLabel",
  "ai_model_routes",
  "modelRoutes",
  "jobsResult",
]);

const modelRoutesLib = requireFile("lib/ai/model-routes.ts");
requireIncludes("lib/ai/model-routes.ts", modelRoutesLib, [
  "text_generation",
  "image_understanding",
  "text_to_image",
  "image_to_image",
  "image_to_video",
  "long_video_generation",
]);

const modelRoutingLib = requireFile("lib/ai/model-routing.ts");
requireIncludes("lib/ai/model-routing.ts", modelRoutingLib, [
  "resolveAiModelRoute",
  "ai_model_routes",
  "source: \"admin\"",
  "source: \"demo\"",
]);

const launchPage = requireFile("app/admin/launch/page.tsx");
requireIncludes("app/admin/launch/page.tsx", launchPage, [
  "部署版本",
  "提交号",
  "readiness.deployment",
]);

const volcengineProvider = requireFile("lib/ai/volcengine-provider.ts");
requireIncludes("lib/ai/volcengine-provider.ts", volcengineProvider, [
  "volcengine",
  "/images/generations",
  "/contents/generations/tasks",
  "ARK_API_KEY",
  "ARK_IMAGE_MODEL_ID",
  "ARK_TEXT_MODEL_ID",
  "ARK_VIDEO_MODEL_ID",
  "doubao-seedream-5-0-260128",
  "response_format",
  "createVideoJob",
  "getVideoJobStatus",
  "video_url",
  "last_frame_url",
  "resultUrls",
]);

const volcengineVideoMigration = requireFile(
  "supabase/migrations/0007_volcengine_video.sql",
);
requireIncludes(
  "supabase/migrations/0007_volcengine_video.sql",
  volcengineVideoMigration,
  [
    "doubao-seedance-2-0-260128",
    "image_to_video",
    "video_generation",
    "generateAudio",
    "returnLastFrame",
  ],
);

const teamQuotaMigration = requireFile(
  "supabase/migrations/0008_team_roles_and_quotas.sql",
);
requireIncludes(
  "supabase/migrations/0008_team_roles_and_quotas.sql",
  teamQuotaMigration,
  [
    "public.usage_limits",
    "assigned_role := 'staff'",
    "public.enqueue_ai_job",
    "GENERATION_DISABLED",
    "CONCURRENT_LIMIT_REACHED",
    "MONTHLY_IMAGE_LIMIT_REACHED",
    "service_role",
  ],
);

const jobOrchestrator = requireFile("lib/ai/job-orchestrator.ts");
requireIncludes("lib/ai/job-orchestrator.ts", jobOrchestrator, [
  "createAndDispatchAiJob",
  "createLocalJob",
  "enqueue_ai_job",
  "AI_QUOTA_EXCEEDED",
  "idempotency_key",
  "submitting",
  "persisting",
  "saveGeneratedResultAssets",
  "job_events",
]);

const teamManager = requireFile("components/admin/team-manager.tsx");
requireIncludes("components/admin/team-manager.tsx", teamManager, [
  "邀请员工",
  "每月图片",
  "每月视频",
  "允许使用真实模型",
  "/api/admin/team/invite",
]);

const teamAdminApi = requireFile("app/api/admin/team/[id]/route.ts");
requireIncludes("app/api/admin/team/[id]/route.ts", teamAdminApi, [
  "只有负责人可以修改员工角色",
  "系统必须保留至少一位负责人",
  "usage_limits",
]);

const teamInviteApi = requireFile("app/api/admin/team/invite/route.ts");
requireIncludes("app/api/admin/team/invite/route.ts", teamInviteApi, [
  "inviteUserByEmail",
  "/auth/confirm?next=/auth/update-password",
  "员工邀请已发送",
]);

const resultAssets = requireFile("lib/ai/result-assets.ts");
requireIncludes("lib/ai/result-assets.ts", resultAssets, [
  "generated-assets",
  "asset_files",
  "output_asset_ids",
  "createSignedUrl",
  "createSafeServerErrorMessage",
  "createSafeStorageErrorMessage",
  "source_key",
  "assertSafeResultUrl",
  "MAX_IMAGE_BYTES",
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

const projectDetailApi = requireFile("app/api/projects/[id]/route.ts");
requireIncludes("app/api/projects/[id]/route.ts", projectDetailApi, [
  "getProjectDetailById",
  "NextResponse.json",
]);

const projectDetailPage = requireFile("app/projects/[id]/page.tsx");
requireIncludes("app/projects/[id]/page.tsx", projectDetailPage, [
  "项目详情",
  "项目素材",
  "生成任务",
  "进入形象大师",
  "formatProviderLabel",
  "formatModelLabel",
  "formatJobTypeLabel",
  "formatJobStatusLabel",
]);

const adminJobsPage = requireFile("app/admin/jobs/page.tsx");
requireIncludes("app/admin/jobs/page.tsx", adminJobsPage, [
  "生成任务",
  "JobsManager",
]);

const jobsManager = requireFile("components/admin/jobs-manager.tsx");
requireIncludes("components/admin/jobs-manager.tsx", jobsManager, [
  "formatProviderLabel",
  "formatModelLabel",
  "formatJobTypeLabel",
  "formatJobStatusLabel",
  "重新执行",
  "取消任务",
  "搜索任务、模型或提示词",
]);

const adminJobActionApi = requireFile("app/api/admin/jobs/[id]/route.ts");
requireIncludes("app/api/admin/jobs/[id]/route.ts", adminJobActionApi, [
  "requireAdminAccess",
  "ai_job_runtime",
  "manual_retry",
  "manual_cancel",
  "runAiWorkerBatch",
]);

const productManager = requireFile("components/admin/product-manager.tsx");
requireIncludes("components/admin/product-manager.tsx", productManager, [
  "新增商品",
  "编辑商品",
  "停用",
  "UploadButton",
]);

const adminProductUpdateApi = requireFile("app/api/admin/products/[id]/route.ts");
requireIncludes("app/api/admin/products/[id]/route.ts", adminProductUpdateApi, [
  "requireAdminAccess",
  "商品已更新。",
  "is_active",
]);

const adminModelsPage = requireFile("app/admin/models/page.tsx");
requireIncludes("app/admin/models/page.tsx", adminModelsPage, [
  "任务能力路由",
  "taskRoutes",
  "image_to_image",
  "formatProviderLabel",
  "formatModelLabel",
]);

const protectedPage = requireFile("app/protected/page.tsx");
requireIncludes("app/protected/page.tsx", protectedPage, [
  "登录摘要",
  "当前为本地演示模式",
  "账号邮箱",
  "账号编号",
  "当前权限",
]);
requireExcludes("app/protected/page.tsx", protectedPage, [
  "JSON.stringify(data.claims",
]);

const uploadApi = requireFile("app/api/upload/route.ts");
requireIncludes("app/api/upload/route.ts", uploadApi, [
  "createSafeServerErrorMessage",
  "createSafeStorageErrorMessage",
  "isUploadBucket",
  "validateUploadFile",
  "validateUploadFileInput",
  "adminOnlyBuckets",
  "validateBucketAccess",
  "请先登录后再上传后台素材",
  "当前账号没有后台素材上传权限",
  "generated-assets",
  "product-assets",
  "music-assets",
]);

const uploadRules = requireFile("lib/upload-rules.ts");
requireIncludes("lib/upload-rules.ts", uploadRules, [
  "uploadBucketRules",
  "isUploadBucket",
  "getUploadAccept",
  "validateUploadFileInput",
  "104857600",
  "524288000",
  "文件过大",
  "不支持该文件类型",
]);

const adminModelsApi = requireFile("app/api/admin/models/route.ts");
requireIncludes("app/api/admin/models/route.ts", adminModelsApi, [
  "parseTaskRoutes",
  "ai_model_routes",
  "模型能力路由保存",
  "模型配置和能力路由已保存。",
]);

const uploadButton = requireFile("components/upload/upload-button.tsx");
requireIncludes("components/upload/upload-button.tsx", uploadButton, [
  "getUploadAccept",
  "validateUploadFileInput",
  "setMessage(validation.message)",
  "accept={accept}",
  "aria-live=\"polite\"",
]);

const jsonCreateForm = requireFile("components/admin/json-create-form.tsx");
requireIncludes("components/admin/json-create-form.tsx", jsonCreateForm, [
  "fieldHints",
  "字段说明",
  "配置模板",
  "结构化配置模板",
  "配置格式不正确，请检查引号、逗号和括号。",
]);

for (const formFile of [
  "components/login-form.tsx",
  "components/sign-up-form.tsx",
  "components/forgot-password-form.tsx",
  "components/update-password-form.tsx",
]) {
  const formContent = requireFile(formFile);
  requireIncludes(formFile, formContent, ["formatAuthErrorMessage"]);
}

const generatePanel = requireFile("components/studio/generate-panel.tsx");
requireIncludes("components/studio/generate-panel.tsx", generatePanel, [
  "后台自动",
  "按能力路由",
  "火山方舟",
  "inputAssetIds",
  "daji:asset-removed",
  "已移除上传素材，当前恢复为演示客户素材。",
  "isVideoResult",
  "resultDownloadName",
  "extraPrompt",
  "finalPrompt",
  "formatProviderLabel",
  "formatModelLabel",
  "selectedVideoTemplateName",
  "selectedScriptName",
  "selectedMusicName",
  "videoPrompt",
  "videoTemplateName",
  "scriptTemplateName",
  "musicTrackName",
  "短视频配置",
  "手动补充提示词",
  "补充要求",
  "下载结果",
  "download={resultDownloadName(job)}",
  "您的浏览器暂不支持视频预览。",
  "lookupJob",
  "latestJobRef",
  "pollingJobKey",
  "正在自动查询",
  "outputAssets",
]);

const studioCreationFlow = requireFile("components/studio/studio-creation-flow.tsx");
requireIncludes("components/studio/studio-creation-flow.tsx", studioCreationFlow, [
  "StudioCreationFlow",
  "toggleProduct",
  "全部商品",
  "已选商品",
  "清空选择",
  "setSelectedStyleName",
  "selectedProductNames",
  "StudioGeneratePanel",
  "videoTemplates={catalog.videoTemplates}",
  "scriptTemplates={catalog.scriptTemplates}",
  "musicTracks={catalog.musicTracks}",
]);

const customerAssetsPanel = requireFile("components/studio/customer-assets-panel.tsx");
requireIncludes("components/studio/customer-assets-panel.tsx", customerAssetsPanel, [
  "移除素材",
  "Trash2",
  "handleRemoveAsset",
  "daji:asset-removed",
  "disabled={!asset}",
]);

const imageGenerateRoute = requireFile("app/api/generate/image/route.ts");
requireIncludes("app/api/generate/image/route.ts", imageGenerateRoute, [
  "normalizeAiProvider",
  "resolveAiModelRoute",
  "text_to_image",
  "image_to_image",
  "realAiProviderRequiresLogin",
  "createRealAiProviderLoginMessage",
  "createAndDispatchAiJob",
  "createAiErrorResponse",
  "{ status: 401 }",
]);

const videoGenerateRoute = requireFile("app/api/generate/video/route.ts");
requireIncludes("app/api/generate/video/route.ts", videoGenerateRoute, [
  "normalizeAiProvider",
  "resolveAiModelRoute",
  "image_to_video",
  "realAiProviderRequiresLogin",
  "createRealAiProviderLoginMessage",
  "createAndDispatchAiJob",
  "createAiErrorResponse",
  "videoConfigText",
  "videoTemplateName",
  "scriptTemplateName",
  "musicTrackName",
  "{ status: 401 }",
]);

const releaseCheck = requireFile("scripts/release-check.mjs");
requireIncludes("scripts/release-check.mjs", releaseCheck, [
  "大吉形象正式发布总检查",
  "smoke:admin-demo",
  "verify:local",
  "check:materials:urls",
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
  "当前存在未提交修改",
  "避免线上部署遗漏本地修改",
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
  "源码交付包",
  "checkReleasePackage",
  "daji-xingxiang-release-",
  "发布清单提交号与当前提交不一致",
  "确保交付包匹配当前提交",
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
  "/projects/demo-xinzhongshi",
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

const internalApiDocs = requireFile("docs/api/internal.md");
requireIncludes("docs/api/internal.md", internalApiDocs, [
  "GET /api/projects/:id",
  "`assets`: 项目素材摘要",
  "`jobs`: 生成任务摘要",
  "普通登录用户只能上传 `customer-assets` 客户素材",
  "`product-assets`、`music-assets` 和 `generated-assets` 属于后台素材目录",
  "AI 回调产生的结果通常由服务端直接转存到 `generated-assets`",
  "服务端会先校验文件类型和大小，再读取文件内容或写入存储",
  "`taskRoutes` 用于配置任务能力路由",
]);

const backendRequirements = requireFile("docs/backend-requirements.md");
requireIncludes("docs/backend-requirements.md", backendRequirements, [
  "商品、音乐和生成结果素材桶仅允许 `owner` 或 `admin` 写入",
  "不能写入商品、音乐或生成结果等后台素材桶",
  "上传接口必须先校验文件类型和大小，再读取文件内容或写入存储",
  "不直接暴露数据库、存储或第三方原始错误",
  "`ai_model_routes`",
  "生产环境缺少路由、模型 ID 或密钥时必须明确失败",
]);

const frontendRequirements = requireFile("docs/frontend-requirements.md");
requireIncludes("docs/frontend-requirements.md", frontendRequirements, [
  "上传控件需要在选择文件后先校验文件类型和大小",
  "登录后工作台只展示中文账号摘要",
  "已选商品固定展示在底部确认栏",
  "同步更新生成提示词和生成任务参数",
  "支持手动补充提示词",
  "不直接暴露内部英文标识",
  "后台自动路由",
  "任务能力路由",
  "在工作台中选择视频模板、脚本文案和音乐",
  "同步到视频生成任务参数",
  "需要先展示中文字段说明",
  "支持保存到项目和下载结果",
]);

for (const routeFile of [
  "app/page.tsx",
  "app/protected/page.tsx",
  "app/projects/[id]/page.tsx",
  "app/projects/new/page.tsx",
  "app/studio/[projectId]/page.tsx",
  "app/admin/launch/page.tsx",
  "app/admin/models/page.tsx",
  "app/admin/video-templates/page.tsx",
  "app/admin/music/page.tsx",
  "app/admin/jobs/page.tsx",
  "app/admin/team/page.tsx",
  "app/api/health/route.ts",
  "app/api/jobs/[id]/route.ts",
  "app/api/projects/[id]/route.ts",
  "app/api/upload/route.ts",
  "app/api/generate/image/route.ts",
  "app/api/generate/video/route.ts",
  "lib/ai/volcengine-provider.ts",
  "lib/ai/job-orchestrator.ts",
  "lib/ai/execution-mode.ts",
  "lib/assets/resolve-ai-input.ts",
  "lib/auth-error.ts",
  "lib/server-error.ts",
  "lib/ai/access.ts",
  "lib/ai/display.ts",
  "lib/ai/model-routes.ts",
  "lib/ai/model-routing.ts",
  "lib/ai/result-assets.ts",
  "lib/deployment-info.ts",
  "lib/upload-rules.ts",
  "components/studio/studio-creation-flow.tsx",
  "components/login-form.tsx",
  "components/sign-up-form.tsx",
  "components/forgot-password-form.tsx",
  "components/update-password-form.tsx",
  "app/api/admin/video-templates/route.ts",
  "app/api/admin/music/route.ts",
  "app/api/admin/models/route.ts",
  "app/api/admin/team/[id]/route.ts",
  "app/api/admin/team/invite/route.ts",
  "lib/admin-team.ts",
  "lib/signup-policy.ts",
  "supabase/migrations/0003_model_task_routes.sql",
  "supabase/migrations/0008_team_roles_and_quotas.sql",
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
