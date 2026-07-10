import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const port = Number(process.env.SMOKE_ADMIN_PORT || 3211);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = 30000;
const failures = [];

function log(message) {
  console.log(message);
}

function createDemoEnv() {
  return {
    ...process.env,
    PORT: String(port),
    NEXT_PUBLIC_APP_URL: baseUrl,
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
  };
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });

    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await wait(500);
  }

  throw new Error("后台演示服务启动超时。");
}

async function assertPage(path, expectedText) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();

  if (!response.ok) {
    failures.push(`${path} 返回状态异常：${response.status}`);
    return;
  }

  if (!text.includes(expectedText)) {
    failures.push(`${path} 未找到关键中文文案：${expectedText}`);
  }
}

async function runAdminChecks() {
  await assertPage("/admin", "后台控制台");
  await assertPage("/admin/products", "新增真实商品或搭配素材");
  await assertPage("/admin/products", "商品名称");
  await assertPage("/admin/products", "商品列表");
  await assertPage("/admin/styles", "维护提示词风格模板");
  await assertPage("/admin/styles", "字段说明");
  await assertPage("/admin/video-templates", "维护变装短视频模板和脚本文案");
  await assertPage("/admin/video-templates", "字段说明");
  await assertPage("/admin/music", "管理短视频音乐和情绪标签");
  await assertPage("/admin/music", "字段说明");
  await assertPage("/admin/models", "维护 AI 模型通道与模型能力");
  await assertPage("/admin/models", "任务能力路由");
  await assertPage("/admin/models", "字段说明");
  await assertPage("/admin/jobs", "查看图片、视频和文案生成记录");
  await assertPage("/admin/jobs", "演示生图模型");
  await assertPage("/admin/jobs", "演示视频模型");
  await assertPage("/admin/operations", "查看生成服务健康状态并处理系统告警");
  await assertPage("/admin/operations", "当前显示演示指标");
  await assertPage("/admin/launch", "上线体检");
}

log("大吉形象后台演示模式冒烟测试");
log("----------------------------");

const demoEnv = createDemoEnv();
const built = await runCommand("pnpm", ["exec", "next", "build"], demoEnv);

if (!built) {
  log("后台演示模式构建失败。");
  process.exit(1);
}

const server = spawn("pnpm", ["exec", "next", "start", "-p", String(port)], {
  cwd: process.cwd(),
  env: demoEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (data) => {
  if (process.env.SMOKE_VERBOSE) {
    process.stdout.write(data.toString());
  }
});

server.stderr.on("data", (data) => {
  if (process.env.SMOKE_VERBOSE) {
    process.stderr.write(data.toString());
  }
});

try {
  await waitForServer();
  await runAdminChecks();

  if (failures.length) {
    log("发现需要处理的问题：");
    for (const item of failures) {
      log(`- ${item}`);
    }
    process.exitCode = 1;
  } else {
    log("检查通过：后台演示模式页面均可访问。");
  }
} catch (error) {
  process.exitCode = 1;
  log(error instanceof Error ? error.message : "后台演示模式冒烟测试失败。");
} finally {
  server.kill("SIGTERM");
  await wait(500);
}
