const rawBaseUrl = process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
const failures = [];

function log(message) {
  console.log(message);
}

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

const baseUrl = normalizeBaseUrl(rawBaseUrl);

function isLocalHostname(hostname) {
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
}

function parseBaseUrl() {
  try {
    return new URL(baseUrl);
  } catch {
    failures.push("线上地址格式无效，请使用完整 https 域名。");
    return null;
  }
}

function assertOnlineBaseUrl() {
  const parsed = parseBaseUrl();
  if (!parsed) {
    return null;
  }

  if (parsed.protocol !== "https:") {
    failures.push("线上冒烟测试必须使用 https 域名。");
  }

  if (isLocalHostname(parsed.hostname)) {
    failures.push("线上冒烟测试不能使用本地地址。");
  }

  return parsed;
}

function normalizeHealthUrl(value) {
  if (!value) {
    return "";
  }

  return String(value).trim().replace(/\/+$/, "");
}

async function assertPage(path, expectedText) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "follow",
  });
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

  if (!data.deployment?.platform) {
    failures.push("/api/health 未返回部署平台信息。");
  }

  if (!data.deployment?.appEnv) {
    failures.push("/api/health 未返回应用环境信息。");
  }

  const publicUrl = normalizeHealthUrl(data.deployment?.publicUrl);
  if (!publicUrl) {
    failures.push("/api/health 未返回应用公开访问地址。");
  } else if (publicUrl !== baseUrl) {
    failures.push("/api/health 中的应用公开访问地址与当前线上测试域名不一致。");
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

async function assertMockGenerationAllowed() {
  const response = await fetch(`${baseUrl}/api/generate/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "mock",
      prompt: "大吉形象线上冒烟演示图",
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
      prompt: "大吉形象线上冒烟真实模型保护",
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

async function main() {
  log("大吉形象线上地址冒烟测试");
  log("------------------------");

  if (!baseUrl) {
    throw new Error(
      "请设置 SMOKE_BASE_URL 或 NEXT_PUBLIC_APP_URL，例如：SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
    );
  }

  assertOnlineBaseUrl();

  if (failures.length) {
    log("发现需要处理的问题：");
    for (const item of failures) {
      log(`- ${item}`);
    }
    process.exitCode = 1;
    return;
  }

  await assertPage("/", "大吉形象");
  await assertPage("/projects/new", "创建客户形象设计项目");
  await assertPage("/studio/demo", "生成形象图片");
  await assertPage("/auth/login", "登录");
  await assertHealth();
  await assertCatalog();
  await assertMockGenerationAllowed();
  await assertRealProviderGenerationGuard();
  await assertAdminWriteGuard();
  await assertTextEndpoint("/robots.txt", `${baseUrl}/sitemap.xml`);
  await assertTextEndpoint("/sitemap.xml", `${baseUrl}/projects/new`);
  await assertTextEndpoint("/manifest.webmanifest", "大吉形象");
  await assertSecurityHeaders();
  await assertPrivateIndexingHeaders(["/api/health"]);
  await assertPrivateCacheHeaders(["/api/health"]);

  if (failures.length) {
    log("发现需要处理的问题：");
    for (const item of failures) {
      log(`- ${item}`);
    }
    process.exitCode = 1;
  } else {
    log(`检查通过：${baseUrl} 的关键页面和接口正常。`);
  }
}

main().catch((error) => {
  process.exitCode = 1;
  log(error instanceof Error ? error.message : "线上地址冒烟测试失败。");
});
