import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-github-handoff.md");

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

console.log("大吉形象 GitHub 仓库交接单生成");
console.log("--------------------------------");

const branch = run("git", ["branch", "--show-current"]);
const latestCommit = run("git", ["log", "--oneline", "--decorate", "-1"]);
const origin = run("git", ["remote", "get-url", "origin"]);
const workingTree = run("git", ["status", "--short"]);
const currentBranch = branch.stdout || "main";
const originText = origin.ok && origin.stdout ? origin.stdout : "尚未配置";

const lines = [
  "# 大吉形象 GitHub 仓库交接单",
  "",
  `生成时间：${new Date().toISOString()}`,
  "",
  "该文件用于 GitHub 建仓、推送和 Actions 验证交接，不包含任何真实密钥值。",
  "",
  "## 当前 Git 状态",
  "",
  `- 当前分支：${currentBranch}`,
  `- 当前提交：${latestCommit.stdout || "未知"}`,
  `- 工作区：${workingTree.stdout ? "存在未提交修改" : "干净"}`,
  `- 远程仓库 origin：${originText}`,
  "",
  "## 创建 GitHub 仓库",
  "",
  "1. 在 GitHub 创建空仓库，建议仓库名：`daji-xingxiang`。",
  "2. 不要在 GitHub 页面初始化 README、.gitignore 或 License，避免和本地提交历史冲突。",
  "3. 创建后复制仓库 HTTPS 地址。",
  "",
  "## 本地绑定远程并推送",
  "",
  "如果当前还没有 origin：",
  "",
  "```bash",
  "git remote add origin https://github.com/你的账号/你的仓库.git",
  `git push -u origin ${currentBranch}`,
  "```",
  "",
  "如果 origin 填错：",
  "",
  "```bash",
  "git remote remove origin",
  "git remote add origin https://github.com/你的账号/你的仓库.git",
  `git push -u origin ${currentBranch}`,
  "```",
  "",
  "## 推送后检查",
  "",
  "推送完成后，在 GitHub Actions 页面确认：",
  "",
  "- `大吉形象发布验证` 自动运行并通过，其中包含中文界面、生产冒烟和线上素材连通性检查。",
  "- 需要交付源码包时，手动运行 `大吉形象源码包交付`，确认它先完成素材连通性检查再生成附件。",
  "- 部署完成后，手动运行 `大吉形象线上冒烟验证` 并输入线上域名。",
  "",
  "## 源码包交付附件",
  "",
  "手动运行 `大吉形象源码包交付` 后，下载 `daji-xingxiang-source-package` 附件，应包含：",
  "",
  "- `daji-xingxiang-source-<提交号>.zip`",
  "- `daji-xingxiang-source-<提交号>.zip.sha256`",
  "- `daji-xingxiang-release-<提交号>.json`",
  "- `daji-xingxiang-env-handoff.md`",
  "- `daji-xingxiang-github-handoff.md`",
  "- `daji-xingxiang-launch-runbook.md`",
  "- `daji-xingxiang-launch-summary.md`",
  "- `daji-xingxiang-model-handoff.md`",
  "- `daji-xingxiang-supabase-init.sql`",
  "- `daji-xingxiang-supabase-verify.sql`",
  "- `daji-xingxiang-vercel-env-template.env`",
  "- `daji-xingxiang-vercel-handoff.md`",
  "",
  "## 下一步",
  "",
  "1. 在 Vercel 导入该 GitHub 仓库。",
  "2. 创建 Supabase 项目，执行 `daji-xingxiang-supabase-init.sql` 后用 `daji-xingxiang-supabase-verify.sql` 验收。",
  "3. 按 `daji-xingxiang-env-handoff.md` 和 `daji-xingxiang-vercel-env-template.env` 填写 Vercel 环境变量。",
  "4. 按 `daji-xingxiang-model-handoff.md` 配置火山方舟、Seedream 和后台 Worker。",
  "5. 按 `daji-xingxiang-vercel-handoff.md` 完成 Vercel 部署。",
  "6. 按 `daji-xingxiang-launch-runbook.md` 逐项执行上线验收。",
  "",
];

mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log("检查通过：已生成 GitHub 仓库交接单。");
console.log("路径：dist/daji-xingxiang-github-handoff.md");
