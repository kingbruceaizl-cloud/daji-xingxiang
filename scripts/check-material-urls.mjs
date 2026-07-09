import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const filesToScan = [
  "lib/demo-data.ts",
  "supabase/seed/0001_seed_demo_data.sql",
  "docs/material-sources.md",
];

const materialUrlPattern = /https:\/\/images\.pexels\.com\/[^\s"'`)<>]+/g;
const batchSize = 4;
const findings = [];

function read(path) {
  const fullPath = resolve(process.cwd(), path);

  if (!existsSync(fullPath)) {
    findings.push(`缺少文件：${path}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function normalizeUrl(value) {
  return value.replace(/[.,;，。；]+$/, "");
}

function collectMaterialUrls() {
  const urls = new Set();

  for (const file of filesToScan) {
    const content = read(file);
    for (const match of content.matchAll(materialUrlPattern)) {
      urls.add(normalizeUrl(match[0]));
    }
  }

  return [...urls].sort();
}

async function checkImageUrl(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return `素材地址格式无效：${url}`;
  }

  if (parsedUrl.protocol !== "https:") {
    return `素材地址必须使用 HTTPS：${url}`;
  }

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await requestImageHeaders(url);
    if (result.ok) {
      return "";
    }

    lastError = result.message;
    if (attempt < 2) {
      await sleep(500);
    }
  }

  return lastError;
}

async function requestImageHeaders(url) {
  const headResult = await requestUrl(url, "HEAD");
  if (headResult.ok || !headResult.retryWithGet) {
    return headResult;
  }

  return requestUrl(url, "GET");
}

async function requestUrl(url, method) {
  try {
    const response = await fetch(url, {
      method,
      headers:
        method === "GET"
          ? {
              Range: "bytes=0-1023",
            }
          : undefined,
      signal: AbortSignal.timeout(method === "GET" ? 15000 : 8000),
    });
    const contentType = response.headers.get("content-type") || "";
    const contentLength = Number(response.headers.get("content-length") || "0");

    if (method === "GET") {
      await response.body?.cancel();
    }

    if (!response.ok) {
      return {
        ok: false,
        retryWithGet: method === "HEAD",
        message: `素材地址不可访问：${url}，状态码 ${response.status}`,
      };
    }

    if (!contentType.startsWith("image/")) {
      return {
        ok: false,
        retryWithGet: method === "HEAD",
        message: `素材地址返回类型不是图片：${url}，当前类型 ${contentType || "未知"}`,
      };
    }

    if (Number.isFinite(contentLength) && contentLength > 0 && contentLength < 1024) {
      return {
        ok: false,
        retryWithGet: method === "HEAD",
        message: `素材图片体积异常偏小：${url}，当前 ${contentLength} 字节`,
      };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求失败";

    return {
      ok: false,
      retryWithGet: method === "HEAD",
      message: `素材地址检查失败：${url}，${message}`,
    };
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function checkUrlsInBatches(urls) {
  const results = [];

  for (let index = 0; index < urls.length; index += batchSize) {
    const batch = urls.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map(checkImageUrl))));
  }

  return results.filter(Boolean);
}

console.log("大吉形象线上素材连通性检查");
console.log("--------------------------");

const urls = collectMaterialUrls();

if (!urls.length) {
  findings.push("未发现可检查的线上素材地址。");
}

findings.push(...(await checkUrlsInBatches(urls)));

if (findings.length) {
  console.log("发现需要处理的问题：");
  for (const item of findings) {
    console.log(`- ${item}`);
  }
  process.exitCode = 1;
} else {
  console.log(`检查通过：${urls.length} 个线上素材地址均可访问并返回图片。`);
}
