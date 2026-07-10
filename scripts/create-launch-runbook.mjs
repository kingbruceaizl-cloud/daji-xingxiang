import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-launch-runbook.md");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
  };
}

function findLatestManifest() {
  if (!existsSync(distDir)) {
    return null;
  }

  const candidates = readdirSync(distDir)
    .filter((fileName) => /^daji-xingxiang-release-[a-f0-9]+\.json$/.test(fileName))
    .map((fileName) => ({
      fileName,
      path: resolve(distDir, fileName),
      mtimeMs: statSync(resolve(distDir, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const latest = candidates[0];
  if (!latest) {
    return null;
  }

  try {
    return {
      fileName: latest.fileName,
      manifest: JSON.parse(readFileSync(latest.path, "utf8")),
    };
  } catch {
    return null;
  }
}

console.log("大吉形象上线执行核对单生成");
console.log("--------------------------");

mkdirSync(distDir, { recursive: true });

const branch = run("git", ["branch", "--show-current"]);
const latestCommit = run("git", ["log", "--oneline", "--decorate", "-1"]);
const origin = run("git", ["remote", "get-url", "origin"]);
const latestManifest = findLatestManifest();
const archiveFile = latestManifest?.manifest?.archive?.file || "daji-xingxiang-source-<提交号>.zip";
const checksumFile = latestManifest?.manifest?.archive?.file
  ? `${latestManifest.manifest.archive.file}.sha256`
  : "daji-xingxiang-source-<提交号>.zip.sha256";
const manifestFile = latestManifest?.fileName || "daji-xingxiang-release-<提交号>.json";

const lines = [
  "# 大吉形象上线执行核对单",
  "",
  `生成时间：${new Date().toISOString()}`,
  "",
  "这份文件用于正式发布当天逐项执行和验收，只记录状态和占位信息，不填写任何真实密钥。",
  "",
  "## 0. 当前交付信息",
  "",
  `- 当前分支：${branch.stdout || "main"}`,
  `- 当前提交：${latestCommit.stdout || "未知"}`,
  `- GitHub 远程仓库：${origin.ok && origin.stdout ? origin.stdout : "待配置"}`,
  `- 源码包：${archiveFile}`,
  `- SHA256 校验文件：${checksumFile}`,
  `- 发布清单：${manifestFile}`,
  "",
  "## 1. 发布前本地确认",
  "",
  "- [ ] 运行 `pnpm run verify:ci`，确认本地验证通过。",
  "- [ ] 运行 `pnpm run check:materials:urls`，确认线上示例素材可访问。",
  "- [ ] 运行 `pnpm run release:package`，确认交付目录重新生成。",
  "- [ ] 运行 `pnpm run publish:status`，确认只剩外部账号、域名和密钥待处理。",
  "- [ ] 打开 `dist/daji-xingxiang-launch-summary.md`，确认当前提交号和源码包一致。",
  "",
  "## 2. GitHub 仓库",
  "",
  "- [ ] 创建 GitHub 空仓库，不初始化 README、License 或模板文件。",
  "- [ ] 在本地关联远程仓库：",
  "",
  "```bash",
  "git remote add origin https://github.com/你的账号/你的仓库.git",
  "git push -u origin main",
  "```",
  "",
  "- [ ] 打开 GitHub Actions，确认 `大吉形象发布验证` 通过，且素材连通性检查通过。",
  "- [ ] 手动运行 `大吉形象源码包交付`，确认素材连通性检查通过且附件 `daji-xingxiang-source-package` 可下载。",
  "",
  "记录：",
  "",
  "- GitHub 仓库地址：`待填写`",
  "- Actions 验证结果：`待填写`",
  "",
  "## 3. Supabase 项目",
  "",
  "- [ ] 创建 Supabase 项目。",
  "- [ ] 在 SQL Editor 中执行 `dist/daji-xingxiang-supabase-init.sql` 的完整内容。",
  "- [ ] 在 SQL Editor 中执行 `dist/daji-xingxiang-supabase-verify.sql`，确认数据表、RLS、RLS 策略、存储桶配置、存储对象策略、模型通道和种子数据全部通过。",
  "- [ ] 确认存储桶存在：`customer-assets`、`generated-assets`、`product-assets`、`music-assets`。",
  "- [ ] 在 Auth URL Configuration 中加入正式回调地址：",
  "",
  "```text",
  "https://你的域名/auth/confirm",
  "https://你的域名/protected",
  "https://你的域名/auth/update-password",
  "```",
  "",
  "- [ ] 从 Supabase 控制台复制环境变量到 Vercel，不写入仓库。",
  "",
  "记录：",
  "",
  "- Supabase 项目地址：`待填写`",
  "- Supabase Project Ref：`待填写`",
  "- SQL 执行结果：`待填写`",
  "",
  "## 4. Vercel 部署",
  "",
  "- [ ] 在 Vercel 导入 GitHub 仓库。",
  "- [ ] Framework 选择 `Next.js`。",
  "- [ ] Node.js 使用 `20.18.0` 或更高版本。",
  "- [ ] Install Command 填写 `pnpm install --frozen-lockfile`。",
  "- [ ] Build Command 填写 `pnpm run build`。",
  "- [ ] 按 `dist/daji-xingxiang-env-handoff.md` 填写 Supabase 和应用环境变量。",
  "- [ ] 使用 `dist/daji-xingxiang-vercel-env-template.env` 逐项核对 Vercel 环境变量。",
  "- [ ] 配置 `CRON_SECRET`，确认后台 Worker 调用需要鉴权。",
  "- [ ] 按 `dist/daji-xingxiang-model-handoff.md` 填写至少一个模型通道密钥。",
  "- [ ] 部署完成后，将正式域名写入 `NEXT_PUBLIC_APP_URL` 并重新部署。",
  "",
  "记录：",
  "",
  "- Vercel 项目地址：`待填写`",
  "- 正式访问域名：`待填写`",
  "- 部署结果：`待填写`",
  "",
  "## 5. AI 模型通道",
  "",
  "- [ ] 配置 `AI_EXECUTION_MODE=real`。",
  "- [ ] 配置 `ARK_API_KEY` 和三个模型 ID。",
  "- [ ] 确认 Vercel Cron 每分钟调用 `/api/internal/ai-worker`。",
  "- [ ] 使用 `doubao-seedream-5-0-260128` 创建一次真实文生图任务。",
  "- [ ] 使用同一模型创建一次真实图生图任务。",
  "- [ ] 在 `/admin/jobs` 确认任务状态和结果记录正常。",
  "",
  "记录：",
  "",
  "- 已启用模型通道：`待填写`",
  "- 火山方舟真实生图验证结果：`待填写`",
  "",
  "## 6. 部署后验收",
  "",
  "部署完成后运行：",
  "",
  "```bash",
  "SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
  "```",
  "",
  "然后打开以下页面确认：",
  "",
  "- [ ] `/` 首页可以访问。",
  "- [ ] `/projects/new` 可以创建项目。",
  "- [ ] `/studio/demo` 可以走通无画布形象大师演示流程。",
  "- [ ] `/admin/launch` 显示 Supabase、存储桶配置和模型通道状态。",
  "- [ ] `/admin/models` 可以查看模型配置。",
  "- [ ] `/admin/jobs` 可以查看生成任务。",
  "",
  "## 7. 发布验收结论",
  "",
  "- 上线负责人：`待填写`",
  "- 上线时间：`待填写`",
  "- 最终域名：`待填写`",
  "- 验收结论：`待填写`",
  "",
  "## 8. 安全要求",
  "",
  "- 不要把任何真实密钥写入本文件。",
  "- 不要提交 `.env.local`、`.env.production` 或 `.vercel`。",
  "- `SUPABASE_SERVICE_ROLE_KEY`、模型密钥和回调密钥只能放在服务端环境变量中。",
  "- 发布后如怀疑密钥泄露，应立即在对应平台轮换密钥并重新部署。",
  "",
];

writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log("检查通过：已生成上线执行核对单。");
console.log("路径：dist/daji-xingxiang-launch-runbook.md");
