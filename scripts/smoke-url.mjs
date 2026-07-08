const rawBaseUrl = process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
const failures = [];

function log(message) {
  console.log(message);
}

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }

  return value.replace(/\/+$/, "");
}

const baseUrl = normalizeBaseUrl(rawBaseUrl);

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

async function main() {
  log("大吉形象线上地址冒烟测试");
  log("------------------------");

  if (!baseUrl) {
    throw new Error(
      "请设置 SMOKE_BASE_URL 或 NEXT_PUBLIC_APP_URL，例如：SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url",
    );
  }

  await assertPage("/", "大吉形象");
  await assertPage("/projects/new", "创建客户形象设计项目");
  await assertPage("/studio/demo", "生成形象图片");
  await assertPage("/auth/login", "登录");
  await assertHealth();
  await assertCatalog();
  await assertTextEndpoint("/robots.txt", "sitemap.xml");
  await assertTextEndpoint("/sitemap.xml", "/projects/new");
  await assertTextEndpoint("/manifest.webmanifest", "大吉形象");
  await assertSecurityHeaders();

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
