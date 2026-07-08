import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const findings = [];
const warnings = [];

function exists(path) {
  return existsSync(resolve(process.cwd(), path));
}

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function requireFile(path, label) {
  if (!exists(path)) {
    findings.push(`缺少${label}：${path}`);
    return "";
  }

  return read(path);
}

function requireIncludes(path, content, values) {
  for (const value of values) {
    if (!content.includes(value)) {
      findings.push(`${path} 缺少部署配置：${value}`);
    }
  }
}

function checkGitTarget() {
  const allowManualDeploy = process.env.ALLOW_MANUAL_VERCEL_DEPLOY === "1";
  const isInsideWorkTree = runGit(["rev-parse", "--is-inside-work-tree"]);

  if (!isInsideWorkTree.ok || isInsideWorkTree.stdout !== "true") {
    const message =
      "当前文件夹还不是 Git 仓库。按默认 Vercel 发布流程，需要先推送到 GitHub 后再导入 Vercel。";

    if (allowManualDeploy) {
      warnings.push(`${message} 已启用手动 Vercel 部署豁免。`);
      return;
    }

    findings.push(message);
    return;
  }

  const hasCommit = runGit(["rev-parse", "--verify", "HEAD"]);
  if (!hasCommit.ok) {
    findings.push("当前 Git 仓库还没有初始提交。推送到 GitHub 前需要先创建第一次提交。");

    const userName = runGit(["config", "--get", "user.name"]);
    const userEmail = runGit(["config", "--get", "user.email"]);
    if (!userName.ok || !userName.stdout || !userEmail.ok || !userEmail.stdout) {
      findings.push("当前 Git 作者姓名或邮箱尚未配置。创建初始提交前需要先配置 Git user.name 和 user.email。");
    }
  }

  const remote = runGit(["remote", "get-url", "origin"]);
  if (!remote.ok || !remote.stdout) {
    const message =
      "当前 Git 仓库缺少 origin 远程地址。按默认 Vercel 发布流程，需要先关联 GitHub 仓库。";

    if (allowManualDeploy) {
      warnings.push(`${message} 已启用手动 Vercel 部署豁免。`);
    } else {
      findings.push(message);
    }
    return;
  }

  console.log(`Git 远程仓库：${remote.stdout}`);
  if (!remote.stdout.includes("github.com")) {
    warnings.push("远程仓库不是 GitHub 地址，请确认 Vercel 已能导入该仓库。");
  }
}

function checkVercelConfig() {
  const vercelConfig = requireFile("vercel.json", "Vercel 配置文件");
  requireIncludes("vercel.json", vercelConfig, [
    '"framework": "nextjs"',
    '"installCommand": "pnpm install --frozen-lockfile"',
    '"buildCommand": "pnpm run build"',
  ]);

  const packageJsonContent = requireFile("package.json", "项目包配置");
  if (packageJsonContent) {
    const packageJson = JSON.parse(packageJsonContent);
    if (packageJson.packageManager !== "pnpm@11.7.0") {
      findings.push("package.json 需要固定 packageManager 为 pnpm@11.7.0，避免 Vercel 安装版本漂移。");
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
  }

  requireFile(".env.production.example", "正式环境变量模板");
  requireFile(".github/workflows/verify.yml", "GitHub 自动验证流程");
}

function checkPublicUrlHint() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    warnings.push("NEXT_PUBLIC_APP_URL 尚未配置；部署后需要改为线上 https 域名。");
    return;
  }

  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "https:") {
      findings.push("NEXT_PUBLIC_APP_URL 需要使用线上 https 地址。");
    }
  } catch {
    findings.push("NEXT_PUBLIC_APP_URL 格式无效。");
  }
}

console.log("大吉形象部署目标审计");
console.log("--------------------");

checkGitTarget();
checkVercelConfig();
checkPublicUrlHint();

if (warnings.length) {
  console.log("需要留意：");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (findings.length) {
  console.log("未通过，先处理以下部署目标：");
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log("检查通过：部署目标配置已具备基础条件。");
}
