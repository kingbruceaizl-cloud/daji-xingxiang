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

function extractCodeTextCandidates(line) {
  const candidates = [];
  const stringPattern = /(["'`])((?:\\.|(?!\1).)*?)\1/g;
  const jsxTextPattern = />([^<>{}]+)</g;

  for (const match of line.matchAll(stringPattern)) {
    const value = match[2].trim();
    if (value) {
      candidates.push(value);
    }
  }

  for (const match of line.matchAll(jsxTextPattern)) {
    const value = match[1].trim();
    if (value) {
      candidates.push(value);
    }
  }

  return candidates.filter((value) => {
    if (/^[@./#?&:=\w-]+$/.test(value)) {
      return false;
    }

    if (
      value.includes(" ") &&
      /\b(flex|grid|rounded|border|text|bg|px|py|mx|my|gap|items|justify)\b/.test(
        value,
      )
    ) {
      return false;
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
        ext === ".md" || ext === ".mdx" ? [line.trim()] : extractCodeTextCandidates(line);

      for (const candidate of candidates) {
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
