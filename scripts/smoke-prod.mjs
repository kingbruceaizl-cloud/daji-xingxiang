import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const port = Number(process.env.SMOKE_PORT || 3210);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = 30000;
const startedAt = Date.now();
const failures = [];

function log(message) {
  console.log(message);
}

async function waitForServer() {
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

  throw new Error("生产服务启动超时。");
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

async function assertHealth() {
  const response = await fetch(`${baseUrl}/api/health`);
  const data = await response.json();

  if (!response.ok || !data.ok) {
    failures.push("/api/health 返回异常。");
    return;
  }

  if (data.name !== "大吉形象") {
    failures.push("/api/health 未返回正确应用名称。");
  }

  if (!Array.isArray(data.checks) || data.checks.length < 5) {
    failures.push("/api/health 上线体检项不足。");
  }
}

async function assertCatalog() {
  const response = await fetch(`${baseUrl}/api/catalog`);
  const payload = await response.json();
  const data = payload.data;

  if (!response.ok || !payload.ok || !data) {
    failures.push("/api/catalog 返回异常。");
    return;
  }

  if (!Array.isArray(data.productCategories) || data.productCategories.length < 8) {
    failures.push("/api/catalog 商品分类不足。");
  }

  if (!Array.isArray(data.products) || data.products.length < 8) {
    failures.push("/api/catalog 示例商品不足。");
  }
}

async function assertKieCallback() {
  const headers = {
    "Content-Type": "application/json",
  };

  if (process.env.KIE_CALLBACK_SECRET) {
    headers["x-daji-callback-secret"] = process.env.KIE_CALLBACK_SECRET;
  }

  const response = await fetch(`${baseUrl}/api/provider-callback/kie`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: 200,
      msg: "success",
      data: {
        taskId: "smoke-kie-callback",
        state: "success",
        resultJson: JSON.stringify({
          resultUrls: ["https://example.com/generated-image.jpg"],
        }),
      },
    }),
  });
  const text = await response.text();

  if (!response.ok) {
    failures.push(`/api/provider-callback/kie 返回状态异常：${response.status}`);
    return;
  }

  if (!text.includes("KIE 回调")) {
    failures.push("/api/provider-callback/kie 未返回中文确认信息。");
  }
}

async function assertDemoJobLookup() {
  const response = await fetch(`${baseUrl}/api/jobs/smoke-job-id`);
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    failures.push("/api/jobs/smoke-job-id 返回异常。");
    return;
  }

  if (!payload.job || payload.job.status !== "succeeded") {
    failures.push("/api/jobs/smoke-job-id 未返回演示任务状态。");
  }
}

async function assertTextEndpoint(path, expectedText) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();

  if (!response.ok) {
    failures.push(`${path} 返回状态异常：${response.status}`);
    return;
  }

  if (!text.includes(expectedText)) {
    failures.push(`${path} 未找到关键内容：${expectedText}`);
  }
}

async function assertSecurityHeaders() {
  const response = await fetch(`${baseUrl}/`);
  const expectedHeaders = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-frame-options": "SAMEORIGIN",
  };

  for (const [key, expectedValue] of Object.entries(expectedHeaders)) {
    const actualValue = response.headers.get(key);
    if (actualValue !== expectedValue) {
      failures.push(`缺少或错误的安全响应头：${key}`);
    }
  }

  const permissionsPolicy = response.headers.get("permissions-policy") || "";
  if (!permissionsPolicy.includes("camera=()")) {
    failures.push("缺少或错误的安全响应头：permissions-policy");
  }
}

async function runSmokeChecks() {
  await assertPage("/", "大吉形象");
  await assertPage("/projects/new", "创建客户形象设计项目");
  await assertPage("/studio/demo", "生成形象图片");
  await assertPage("/studio/demo", "KIE 图像");
  await assertPage("/admin/launch", "上线体检");
  await assertHealth();
  await assertCatalog();
  await assertKieCallback();
  await assertDemoJobLookup();
  await assertTextEndpoint("/robots.txt", "sitemap.xml");
  await assertTextEndpoint("/sitemap.xml", "/projects/new");
  await assertTextEndpoint("/manifest.webmanifest", "大吉形象");
  await assertSecurityHeaders();
}

log("大吉形象生产模式冒烟测试");
log("------------------------");

const server = spawn("pnpm", ["exec", "next", "start", "-p", String(port)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || baseUrl,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (data) => {
  const text = data.toString();
  if (process.env.SMOKE_VERBOSE) {
    process.stdout.write(text);
  }
});

server.stderr.on("data", (data) => {
  const text = data.toString();
  if (process.env.SMOKE_VERBOSE) {
    process.stderr.write(text);
  }
});

try {
  await waitForServer();
  await runSmokeChecks();

  if (failures.length) {
    log("发现需要处理的问题：");
    for (const item of failures) {
      log(`- ${item}`);
    }
    process.exitCode = 1;
  } else {
    log("检查通过：生产服务关键页面和接口正常。");
  }
} catch (error) {
  process.exitCode = 1;
  log(error instanceof Error ? error.message : "生产模式冒烟测试失败。");
} finally {
  server.kill("SIGTERM");
  await wait(500);
}
