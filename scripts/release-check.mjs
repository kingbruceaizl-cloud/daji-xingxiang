import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

function log(message = "") {
  console.log(message);
}

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
    }
  }
}

function getOnlineSmokeBaseUrl() {
  const value = process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const isLocalAddress = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
      url.hostname,
    );

    if (url.protocol !== "https:" || isLocalAddress) {
      return "";
    }

    return value.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function runStep(title, command, args, env = {}) {
  return new Promise((resolveStep) => {
    log("");
    log(`开始：${title}`);
    log("=".repeat(24));

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        log(`完成：${title}`);
        resolveStep(true);
        return;
      }

      log(`未通过：${title}`);
      resolveStep(false);
    });

    child.on("error", () => {
      log(`无法启动：${title}`);
      resolveStep(false);
    });
  });
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env.production");

  log("大吉形象正式发布总检查");
  log("----------------------");
  log("该命令会依次检查本地发布包、生产模式、部署目标、正式环境变量，并在配置线上域名后检查公网地址。");

  const steps = [
    ["后台演示模式冒烟测试", "pnpm", ["run", "smoke:admin-demo"]],
    ["本地发布包验证", "pnpm", ["run", "verify:local"]],
    ["生产模式冒烟测试", "pnpm", ["run", "smoke:prod"]],
    ["部署目标审计", "pnpm", ["run", "check:deploy"]],
    ["正式环境变量预检", "pnpm", ["run", "preflight"]],
  ];

  const onlineBaseUrl = getOnlineSmokeBaseUrl();
  if (onlineBaseUrl) {
    steps.push([
      "线上域名冒烟测试",
      "pnpm",
      ["run", "smoke:url"],
      {
        SMOKE_BASE_URL: onlineBaseUrl,
      },
    ]);
  } else {
    log("");
    log("线上域名冒烟测试：未检测到可用的线上 https 域名，将在正式环境变量通过后提醒补跑。");
  }

  const failedSteps = [];
  for (const [title, command, args, env] of steps) {
    const passed = await runStep(title, command, args, env);
    if (!passed) {
      failedSteps.push(title);
    }
  }

  log("");
  log("发布总检查结果");
  log("--------------");

  if (failedSteps.length) {
    log("未通过，先处理以下步骤：");
    for (const item of failedSteps) {
      log(`- ${item}`);
    }
    process.exitCode = 1;
    return;
  }

  if (!onlineBaseUrl) {
    log("本地和正式环境变量检查已通过。部署到 Vercel 并配置线上域名后，继续运行：");
    log("SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url");
    return;
  }

  log("检查通过：可以进入正式发布或发布确认流程。");
}

main().catch((error) => {
  process.exitCode = 1;
  log(error instanceof Error ? error.message : "正式发布总检查失败。");
});
