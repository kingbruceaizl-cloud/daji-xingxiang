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

async function assertHomeMetadata() {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  const expectedSnippets = [
    '<html lang="zh-CN"',
    "<title>大吉形象</title>",
    'name="description" content="面向形象顾问的 AI 形象设计与变装视频工作台"',
    'name="application-name" content="大吉形象"',
    'rel="manifest" href="/manifest.webmanifest"',
    'property="og:title" content="大吉形象"',
    'property="og:site_name" content="大吉形象"',
    'property="og:locale" content="zh_CN"',
    'name="twitter:title" content="大吉形象"',
  ];

  if (!response.ok) {
    failures.push(`首页元信息返回状态异常：${response.status}`);
    return;
  }

  for (const snippet of expectedSnippets) {
    if (!html.includes(snippet)) {
      failures.push(`首页缺少中文品牌元信息：${snippet}`);
    }
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

  if (!data.deployment || data.deployment.platform !== "本地或自托管") {
    failures.push("/api/health 未返回本地生产模式部署信息。");
  }

  if (!data.deployment?.appEnv) {
    failures.push("/api/health 未返回应用环境信息。");
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

async function assertMockGenerationAllowed() {
  const response = await fetch(`${baseUrl}/api/generate/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "mock",
      prompt: "大吉形象生产冒烟演示图",
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.ok || !payload.job) {
    failures.push("/api/generate/image 演示生成未正常返回。");
    return;
  }

  if (payload.job.provider !== "mock") {
    failures.push("/api/generate/image 演示生成未使用 mock 通道。");
  }
}

async function assertRealProviderGenerationGuard() {
  const response = await fetch(`${baseUrl}/api/generate/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "kie",
      prompt: "大吉形象生产冒烟真实模型保护",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  const message = typeof payload.message === "string" ? payload.message : "";

  if (response.status !== 401 || payload.ok) {
    failures.push("/api/generate/image 匿名真实模型请求应被拒绝。");
    return;
  }

  if (!message.includes("真实模型通道 kie 需要先登录后再生成")) {
    failures.push("/api/generate/image 匿名真实模型请求未返回中文登录提示。");
  }
}

async function assertAdminWriteGuard() {
  const response = await fetch(`${baseUrl}/api/admin/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "冒烟测试匿名商品",
      type: "asset",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  const message = typeof payload.message === "string" ? payload.message : "";
  const allowedMessages = [
    "请先配置 Supabase Service Role Key",
    "请先登录后再操作后台",
    "当前账号没有后台管理权限",
  ];

  if (response.ok || payload.ok) {
    failures.push("/api/admin/products 匿名写入不应成功。");
    return;
  }

  if (![400, 401, 403].includes(response.status)) {
    failures.push(`/api/admin/products 匿名写入返回状态异常：${response.status}`);
  }

  if (!allowedMessages.some((item) => message.includes(item))) {
    failures.push("/api/admin/products 匿名写入未返回中文权限提示。");
  }
}

async function assertAdminAssetUploadGuard() {
  const formData = new FormData();
  formData.set("bucket", "product-assets");
  formData.set("file", new Blob(["smoke"], { type: "image/png" }), "smoke.png");

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  const message = typeof payload.message === "string" ? payload.message : "";
  const allowedMessages = [
    "请先配置 Supabase Service Role Key",
    "请先登录后再上传后台素材",
    "当前账号没有后台素材上传权限",
  ];

  if (response.ok || payload.ok) {
    failures.push("/api/upload 匿名上传后台素材不应成功。");
    return;
  }

  if (![400, 401, 403].includes(response.status)) {
    failures.push(`/api/upload 匿名上传后台素材返回状态异常：${response.status}`);
  }

  if (!allowedMessages.some((item) => message.includes(item))) {
    failures.push("/api/upload 匿名上传后台素材未返回中文权限提示。");
  }
}

async function assertInvalidUploadTypeGuard() {
  const formData = new FormData();
  formData.set("bucket", "customer-assets");
  formData.set("file", new Blob(["smoke"], { type: "text/plain" }), "smoke.txt");

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  const message = typeof payload.message === "string" ? payload.message : "";

  if (response.status !== 400 || payload.ok) {
    failures.push("/api/upload 错误文件类型不应成功。");
    return;
  }

  if (!message.includes("不支持该文件类型")) {
    failures.push("/api/upload 错误文件类型未返回中文提示。");
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

async function assertManifest() {
  const response = await fetch(`${baseUrl}/manifest.webmanifest`);
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload) {
    failures.push("/manifest.webmanifest 返回异常。");
    return;
  }

  const expectedValues = {
    name: "大吉形象",
    short_name: "大吉形象",
    description: "中文 AI 形象设计、商品搭配和变装视频工作台",
    start_url: "/projects/new",
    display: "standalone",
    lang: "zh-CN",
  };

  for (const [key, expectedValue] of Object.entries(expectedValues)) {
    if (payload[key] !== expectedValue) {
      failures.push(`/manifest.webmanifest ${key} 配置异常。`);
    }
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

async function assertPrivateIndexingHeaders(paths) {
  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    const robotsHeader = response.headers.get("x-robots-tag") || "";
    const normalized = robotsHeader.toLowerCase();

    for (const expectedValue of ["noindex", "nofollow", "noarchive"]) {
      if (!normalized.includes(expectedValue)) {
        failures.push(`${path} 缺少防索引响应头：${expectedValue}`);
      }
    }
  }
}

async function assertPrivateCacheHeaders(paths) {
  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    const cacheControl = response.headers.get("cache-control") || "";
    const normalized = cacheControl.toLowerCase();

    if (!normalized.includes("no-store")) {
      failures.push(`${path} 缺少私有内容缓存控制：no-store`);
    }

    if (!normalized.includes("max-age=0")) {
      failures.push(`${path} 缺少私有内容缓存控制：max-age=0`);
    }
  }
}

async function runSmokeChecks() {
  await assertPage("/", "大吉形象");
  await assertHomeMetadata();
  await assertPage("/projects/new", "创建客户形象设计项目");
  await assertPage("/studio/demo", "生成形象图片");
  await assertPage("/studio/demo", "KIE 图像");
  await assertPage("/admin/launch", "上线体检");
  await assertHealth();
  await assertCatalog();
  await assertKieCallback();
  await assertDemoJobLookup();
  await assertMockGenerationAllowed();
  await assertRealProviderGenerationGuard();
  await assertAdminWriteGuard();
  await assertAdminAssetUploadGuard();
  await assertInvalidUploadTypeGuard();
  await assertTextEndpoint("/robots.txt", "sitemap.xml");
  await assertTextEndpoint("/sitemap.xml", "/projects/new");
  await assertManifest();
  await assertSecurityHeaders();
  await assertPrivateIndexingHeaders(["/api/health", "/admin/launch"]);
  await assertPrivateCacheHeaders(["/api/health", "/admin/launch"]);
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
