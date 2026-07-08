import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-vercel-env-template.env");

console.log("大吉形象 Vercel 环境变量模板生成");
console.log("----------------------------------");

const lines = [
  "# 大吉形象 Vercel 环境变量模板",
  "# 使用方式：在 Vercel 项目 Settings > Environment Variables 中逐项填写。",
  "# 注意：尖括号中的内容必须替换为真实值，不要把填好真实值的文件提交到 Git。",
  "",
  "# Supabase 项目设置 > API",
  "NEXT_PUBLIC_SUPABASE_URL=https://<你的 Supabase 项目编号>.supabase.co",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<填写 Supabase Publishable Key>",
  "SUPABASE_SERVICE_ROLE_KEY=<填写 Supabase Service Role Key>",
  "",
  "# 应用正式域名，部署后替换为 Vercel 或自定义 https 域名。",
  "NEXT_PUBLIC_APP_URL=https://<你的正式域名>",
  "NEXT_PUBLIC_APP_ENV=production",
  "",
  "# 第一阶段推荐优先配置 KIE。",
  "KIE_BASE_URL=https://api.kie.ai",
  "KIE_API_KEY=<填写 KIE API Key>",
  "KIE_CALLBACK_SECRET=<填写随机强字符串，并同步到 KIE 回调配置>",
  "",
  "# 后续多模型预留，未启用时可以先留空。",
  "OPENAI_API_KEY=",
  "JIMENG_API_KEY=",
  "KLING_API_KEY=",
  "TONGYI_API_KEY=",
  "",
  "# 填写完成后运行：pnpm run preflight",
  "# 部署后运行：SMOKE_BASE_URL=https://<你的正式域名> pnpm run smoke:url",
  "",
];

mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}`);

console.log("检查通过：已生成 Vercel 环境变量模板。");
console.log("路径：dist/daji-xingxiang-vercel-env-template.env");
