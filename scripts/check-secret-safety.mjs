import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const findings = [];
const textExtensions = new Set([
  "",
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
]);

const ignoredPaths = [".env", ".env.local", ".env.production", ".vercel"];
const secretEnvKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "KIE_API_KEY",
  "KIE_CALLBACK_SECRET",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
];

const secretPatterns = [
  {
    name: "OpenAI 风格密钥",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "JWT 或 Supabase 密钥",
    pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    name: "私钥内容",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
  {
    name: "Vercel Token",
    pattern: /\bvercel_[A-Za-z0-9]{20,}\b/i,
  },
];

function run(command, args) {
  const result = spawnSync(command, args, {
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

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function isTextFile(path) {
  if (path === ".gitignore" || path === ".node-version") {
    return true;
  }

  return textExtensions.has(extname(path));
}

function listCommitCandidateFiles() {
  const result = run("git", ["ls-files", "--cached", "--others", "--exclude-standard"]);
  if (!result.ok) {
    findings.push("无法读取 Git 待提交文件列表。");
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter(Boolean)
    .filter((path) => isTextFile(path));
}

function checkIgnoredPath(path) {
  const result = run("git", ["check-ignore", "-q", path]);
  if (!result.ok) {
    findings.push(`${path} 未被 Git 忽略，可能导致本地密钥误提交。`);
  }
}

function isPlaceholderSecret(value) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");

  return (
    !normalized ||
    normalized.includes("你的") ||
    normalized.includes("<") ||
    normalized.includes(">")
  );
}

function checkEnvExampleFile(path) {
  if (!existsSync(resolve(process.cwd(), path))) {
    return;
  }

  const content = read(path);
  for (const key of secretEnvKeys) {
    const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (match && !isPlaceholderSecret(match[1])) {
      findings.push(`${path} 中的 ${key} 不应填写真实密钥。`);
    }
  }
}

function checkFileContent(path) {
  const absolutePath = resolve(process.cwd(), path);
  if (!existsSync(absolutePath)) {
    return;
  }

  const content = read(path);
  for (const secretPattern of secretPatterns) {
    if (secretPattern.pattern.test(content)) {
      findings.push(`${path} 疑似包含${secretPattern.name}，请移出代码仓库。`);
    }
  }
}

console.log("大吉形象密钥安全检查");
console.log("--------------------");

for (const path of ignoredPaths) {
  checkIgnoredPath(path);
}

checkEnvExampleFile(".env.example");
checkEnvExampleFile(".env.production.example");

for (const path of listCommitCandidateFiles()) {
  checkFileContent(path);
}

if (findings.length) {
  console.log("未通过，先处理以下密钥安全问题：");
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log("检查通过：未发现会被提交的明显密钥风险。");
}
