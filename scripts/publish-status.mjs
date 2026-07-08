import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

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

function hasCommand(command) {
  return run("zsh", ["-lc", `command -v ${command}`]).ok;
}

function hasEnv(key) {
  return Boolean(process.env[key]);
}

function status(label, passed, detail) {
  const mark = passed ? "已就绪" : "待处理";
  console.log(`- ${label}：${mark}${detail ? `，${detail}` : ""}`);
}

console.log("大吉形象发布通道状态");
console.log("--------------------");

const branch = run("git", ["branch", "--show-current"]);
const latestCommit = run("git", ["log", "--oneline", "--decorate", "-1"]);
const origin = run("git", ["remote", "get-url", "origin"]);
const workingTree = run("git", ["status", "--short"]);

status("本地 Git 仓库", branch.ok && Boolean(branch.stdout), `当前分支 ${branch.stdout || "未知"}`);
status("本地提交", latestCommit.ok && Boolean(latestCommit.stdout), latestCommit.stdout || "尚未提交");
status("工作区", workingTree.ok && !workingTree.stdout, workingTree.stdout ? "存在未提交修改" : "干净");
status("GitHub 远程 origin", origin.ok && Boolean(origin.stdout), origin.stdout || "尚未配置");

console.log("");
console.log("命令行发布工具");
console.log("----------------");

status("GitHub CLI", hasCommand("gh"), "可用于创建仓库和推送检查");
status("Vercel CLI", hasCommand("vercel"), "可用于命令行部署");
status("Supabase CLI", hasCommand("supabase"), "可用于命令行迁移");

console.log("");
console.log("Token 与环境变量");
console.log("----------------");

status("GitHub Token", hasEnv("GITHUB_TOKEN") || hasEnv("GH_TOKEN"));
status("Vercel Token", hasEnv("VERCEL_TOKEN"));
status("Supabase Access Token", hasEnv("SUPABASE_ACCESS_TOKEN"));
status("Supabase 项目地址", hasEnv("NEXT_PUBLIC_SUPABASE_URL"));
status("Supabase 服务端密钥", hasEnv("SUPABASE_SERVICE_ROLE_KEY"));
status(
  "AI 模型密钥",
  [
    "KIE_API_KEY",
    "OPENAI_API_KEY",
    "JIMENG_API_KEY",
    "KLING_API_KEY",
    "TONGYI_API_KEY",
  ].some(hasEnv),
);
status("线上应用地址", hasEnv("NEXT_PUBLIC_APP_URL"));

console.log("");
console.log("本地配置文件");
console.log("------------");

status(".env.local", existsSync(resolve(process.cwd(), ".env.local")), "本地真实配置文件，不应提交");
status(".env.production", existsSync(resolve(process.cwd(), ".env.production")), "正式配置文件，不应提交");
status(".vercel", existsSync(resolve(process.cwd(), ".vercel")), "Vercel 项目链接目录，不应提交");

console.log("");
console.log("下一步建议");
console.log("----------");

if (!origin.ok || !origin.stdout) {
  console.log("1. 创建 GitHub 空仓库，然后执行：");
  console.log("   git remote add origin https://github.com/你的账号/你的仓库.git");
  console.log("   git push -u origin main");
} else {
  console.log("1. GitHub 远程仓库已配置，可以确认 GitHub Actions 是否通过。");
}

if (!hasEnv("NEXT_PUBLIC_SUPABASE_URL") || !hasEnv("SUPABASE_SERVICE_ROLE_KEY")) {
  console.log("2. 创建 Supabase 项目，执行 pnpm run supabase:sql 输出的初始化 SQL。");
}

if (!hasEnv("NEXT_PUBLIC_APP_URL")) {
  console.log("3. 在 Vercel 部署后，将线上域名写入 NEXT_PUBLIC_APP_URL。");
}

if (
  ![
    "KIE_API_KEY",
    "OPENAI_API_KEY",
    "JIMENG_API_KEY",
    "KLING_API_KEY",
    "TONGYI_API_KEY",
  ].some(hasEnv)
) {
  console.log("4. 至少配置一个真实 AI 模型通道密钥，例如 KIE_API_KEY。");
}
