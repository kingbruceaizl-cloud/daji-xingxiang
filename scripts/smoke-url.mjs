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
  await assertTextEndpoint("/robots.txt", `${baseUrl}/sitemap.xml`);
  await assertTextEndpoint("/sitemap.xml", `${baseUrl}/projects/new`);
  await assertTextEndpoint("/manifest.webmanifest", "大吉形象");
  await assertSecurityHeaders();
  await assertPrivateIndexingHeaders(["/api/health"]);

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
