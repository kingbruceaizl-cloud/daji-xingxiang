import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const targets = ["app", "components", "lib", "docs", "README.md"];
const extensions = new Set([".ts", ".tsx", ".md", ".mdx"]);

const prohibitedTerms = [
  "Provider",
  "SKU",
  "Storage",
  "Dashboard",
  "Upload",
  "Generate",
  "Save",
  "Login",
  "Sign Up",
  "Untitled",
];

const allowedTechnicalTerms = [
  "AI",
  "API",
  "CLI",
  "CSS",
  "GPT",
  "HTTP",
  "HTTPS",
  "JSON",
  "KB",
  "KIE",
  "MCP",
  "MB",
  "MVP",
  "Next.js",
  "Node.js",
  "OpenAI",
  "Postgres",
  "React",
  "React Flow",
  "RLS",
  "SDK",
  "SQL",
  "Supabase",
  "Tailwind",
  "TypeScript",
  "URL",
  "Vercel",
  "Git",
  "GitHub",
  "GPT Image",
  "Image",
  "%s",
  "Service Role Key",
  "Nano Banana",
  "Seedance",
  "KIE_API_KEY",
  "OPENAI_API_KEY",
  "JIMENG_API_KEY",
  "KLING_API_KEY",
  "TONGYI_API_KEY",
  "mock",
  "localhost",
  "pnpm",
  "gpt-image-2-text-to-image",
  "gpt-image-2-image-to-image",
  "mock-image-v1",
  "mock-video-v1",
];

const ignoredStringLinePatterns = [
  /^["']use client["'];?$/,
  /^\s*import\b/,
  /\bfrom\s+["'`]/,
  /^\s*export\s+type\b/,
  /^\s*type\s+\w+\s*=/,
  /className\s*=/,
  /className\s*[:=]/,
  /href\s*=/,
  /src\s*=/,
  /accept\s*=/,
  /id\s*[:=]/,
  /key\s*=/,
  /onConflict/,
  /placeholderTokens/,
  /provider\s*[:=]/,
  /model\s*[:=]/,
  /bucket\s*[:=]/,
  /endpoint\s*=/,
  /method\s*:/,
  /headers\s*:/,
  /Content-Type/,
  /\b(status|source|kind|type|variant|size|side|align|state)\b\s*(===|!==|==|=|:)/,
  /\bvalue\s*(===|!==|==)/,
  /redirect\(/,
  /router\.push\(/,
  /\.from\(/,
  /\.select\(/,
  /\.eq\(/,
  /\.order\(/,
  /process\.env/,
];

const latinOnlyAllowedPatterns = [
  /^https?:\/\//i,
  /^[\w.-]+@[\w.-]+\.\w+$/,
  /^\/[\w./:[\]{}?&=%-]+$/,
  /^#[\w-]+$/,
  /^--?[\w-]+$/,
  /^[\w-]+\/[\w-]+$/,
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/,
  /^[a-z]+\/[a-z0-9.+-]+$/i,
  /^#[0-9a-fA-F]{3,8}$/,
];

const ignoredLinePatterns = [
  /node_modules/,
  /pnpm-lock/,
];

function getExtension(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

function collectFiles(entry) {
  const path = join(root, entry);

  if (!existsSync(path)) {
    return [];
  }

  const stats = statSync(path);
  if (stats.isFile()) {
    return extensions.has(getExtension(path)) ? [path] : [];
  }

  const files = [];
  for (const item of readdirSync(path)) {
    if (item.startsWith(".") || item === "node_modules") {
      continue;
    }

    const child = join(path, item);
    const childStats = statSync(child);
    if (childStats.isDirectory()) {
      files.push(...collectFiles(relative(root, child)));
    } else if (extensions.has(getExtension(child))) {
      files.push(child);
    }
  }

  return files;
}

function shouldIgnoreLine(line) {
  return ignoredLinePatterns.some((pattern) => pattern.test(line));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasLatin(value) {
  return /[A-Za-z]/.test(value);
}

function hasChinese(value) {
  return /[\u3400-\u9fff]/.test(value);
}

function stripAllowedTechnicalTerms(value) {
  const withoutTemplateExpressions = value.replace(/\$\{[^}]*\}/g, "");

  return [...allowedTechnicalTerms]
    .sort((a, b) => b.length - a.length)
    .reduce(
      (text, term) => text.replace(new RegExp(escapeRegExp(term), "gi"), ""),
      withoutTemplateExpressions,
    );
}

function hasUnapprovedLatin(value) {
  return hasLatin(stripAllowedTechnicalTerms(value));
}

function isLatinOnlyAllowed(value) {
  if (latinOnlyAllowedPatterns.some((pattern) => pattern.test(value))) {
    return true;
  }

  return !hasUnapprovedLatin(value);
}

function isLikelyUserFacingString(line) {
  return /\b(placeholder|aria-label|title|alt|label|detail|description|message|error|content|prompt|usage|text|submitText)\b/.test(
    line,
  ) || /(^|[,{]\s*)name\s*:/.test(line);
}

function looksLikeUtilityClassString(value) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return false;
  }

  return tokens.every((token) =>
    /^(?:\[&|data-\[|aria-\[|[a-z-]+:|md:|lg:|xl:|sm:|dark:|group-|peer-|[a-z]+-|\[[^\]]+\]|[a-z]+$)/.test(
      token,
    ),
  );
}

function shouldIgnoreStringCandidate(line, value) {
  if (ignoredStringLinePatterns.some((pattern) => pattern.test(line))) {
    return true;
  }

  if (looksLikeUtilityClassString(value)) {
    return true;
  }

  const withoutTemplateExpressions = value.replace(/\$\{[^}]*\}/g, "");
  if (
    /^\/[^\s]*$/.test(withoutTemplateExpressions) ||
    /^[A-Za-z0-9_./:-]+$/.test(withoutTemplateExpressions) ||
    /^[A-Za-z0-9_,]+$/.test(withoutTemplateExpressions)
  ) {
    return true;
  }

  if (/^[@./#?&:=\w-]+$/.test(value) && /[\/_.@#:=?-]/.test(value)) {
    return true;
  }

  if (isLikelyUserFacingString(line)) {
    return false;
  }

  if (/^[@./#?&:=\w-]+$/.test(value)) {
    return true;
  }

  if (
    value.includes(" ") &&
    /\b(flex|grid|rounded|border|text|bg|px|py|mx|my|gap|items|justify)\b/.test(
      value,
    )
  ) {
    return true;
  }

  return false;
}

function extractCodeTextCandidates(line) {
  const candidates = [];
  const stringPattern = /(["'`])((?:\\.|(?!\1).)*?)\1/g;
  const jsxTextPattern = />([^<>{}]+)</g;

  for (const match of line.matchAll(stringPattern)) {
    const value = match[2].trim();
    const afterMatch = line.slice(match.index + match[0].length).trimStart();
    const isObjectKey = afterMatch.startsWith(":");
    if (value && !isObjectKey) {
      candidates.push({ source: "string", value });
    }
  }

  for (const match of line.matchAll(jsxTextPattern)) {
    const value = match[1].trim();
    if (value) {
      candidates.push({ source: "jsx", value });
    }
  }

  return candidates.filter((candidate) => {
    if (candidate.source === "string") {
      return !shouldIgnoreStringCandidate(line, candidate.value);
    }

    return true;
  });
}

const findings = [];

for (const target of targets) {
  for (const file of collectFiles(target)) {
    const relativeFile = relative(root, file);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    lines.forEach((line, index) => {
      if (shouldIgnoreLine(line)) {
        return;
      }

      const ext = getExtension(file);
      const candidates =
        ext === ".md" || ext === ".mdx"
          ? [{ source: "markdown", value: line.trim() }]
          : extractCodeTextCandidates(line);

      for (const { source, value: candidate } of candidates) {
        for (const term of prohibitedTerms) {
          if (!candidate.includes(term)) {
            continue;
          }

          findings.push({
            file: relativeFile,
            line: index + 1,
            term,
            text: candidate,
          });
        }

        if (source === "markdown") {
          continue;
        }

        if (!hasLatin(candidate) || !hasUnapprovedLatin(candidate)) {
          continue;
        }

        if (hasChinese(candidate)) {
          findings.push({
            file: relativeFile,
            line: index + 1,
            term: "未在技术名词白名单中的英文",
            text: candidate,
          });
          continue;
        }

        if (!isLatinOnlyAllowed(candidate)) {
          findings.push({
            file: relativeFile,
            line: index + 1,
            term: "纯英文界面词",
            text: candidate,
          });
        }
      }
    });
  }
}

console.log("大吉形象中文界面检查");
console.log("--------------------");

if (!findings.length) {
  console.log("检查通过：未发现高风险英文界面词。");
  process.exit(0);
}

console.log("发现可能出现在界面或文档中的英文词，请确认是否需要中文化：");
for (const finding of findings) {
  console.log(
    `- ${finding.file}:${finding.line} [${finding.term}] ${finding.text}`,
  );
}

process.exitCode = 1;
