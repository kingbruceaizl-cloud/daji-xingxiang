# 大吉形象上线交接单

## 当前代码状态

- 本地 Git 仓库已初始化。
- 默认分支：`main`。
- 已创建本地初始提交：`初始化大吉形象 MVP`。
- 当前还没有配置 GitHub 远程仓库 `origin`。

查看当前提交：

```bash
git log --oneline --decorate -1
```

## 推送到 GitHub

创建 GitHub 空仓库后，在本项目根目录执行：

```bash
git remote add origin https://github.com/你的账号/你的仓库.git
git push -u origin main
```

如果远程仓库地址填错，可以先移除后重加：

```bash
git remote remove origin
git remote add origin https://github.com/你的账号/你的仓库.git
```

如果暂时不能配置 GitHub 远程仓库，也可以生成干净源码交付包：

```bash
pnpm run release:package
```

生成位置：

```text
dist/daji-xingxiang-source-<提交号>.zip
dist/daji-xingxiang-source-<提交号>.zip.sha256
dist/daji-xingxiang-release-<提交号>.json
dist/daji-xingxiang-env-handoff.md
dist/daji-xingxiang-github-handoff.md
dist/daji-xingxiang-launch-runbook.md
dist/daji-xingxiang-launch-summary.md
dist/daji-xingxiang-model-handoff.md
dist/daji-xingxiang-supabase-init.sql
dist/daji-xingxiang-supabase-verify.sql
dist/daji-xingxiang-vercel-env-template.env
dist/daji-xingxiang-vercel-handoff.md
```

该压缩包只包含 Git 已提交文件，不包含 `node_modules`、`.next`、`.env` 或 `.vercel`。`.sha256` 文件用于校验压缩包完整性，JSON 清单记录提交号、生成时间、文件大小和校验摘要。环境变量交接单用于记录 Supabase、Vercel 和模型通道需要填写的变量，不输出真实密钥值。GitHub 仓库交接单用于创建仓库、绑定远程、推送、检查 Actions 和下载交付附件。AI 模型通道交接单用于配置 KIE 回调、KIE 图像模型和后续 OpenAI、即梦、可灵、通义预留密钥。上线执行核对单用于正式发布当天逐项执行 GitHub、Supabase、Vercel、模型和验收动作。上线摘要用于汇总当前提交、交付物、外部配置缺口和下一步动作。Supabase 初始化 SQL 可直接复制到 Supabase SQL Editor 执行；Supabase 验收 SQL 用于执行初始化后检查表、RLS、存储桶、模型通道和种子数据。Vercel 环境变量模板用于在 Vercel 面板逐项填写生产变量。Vercel 部署交接单用于导入项目时核对框架、Node、安装命令、构建命令和部署后检查。`release:package` 会生成源码包后立即复核源码包、校验文件和清单是否一致，并确认压缩包内包含上线所需的关键源码、文档和 Supabase 初始化文件。需要排查时，可拆开运行 `release:archive`、`release:verify-archive`、`release:env-handoff`、`release:github-handoff`、`release:supabase-sql`、`release:supabase-verify-sql`、`release:vercel-env-template`、`release:vercel-handoff`、`release:model-handoff`、`release:launch-runbook` 和 `release:launch-summary`。

推送到 GitHub 后，也可以在 Actions 页面手动运行“大吉形象源码包交付”，工作流会先执行完整 CI 验证，再生成并上传源码包附件。

## Vercel 导入设置

- Framework：Next.js
- Node.js Version：20.18.0 或更高版本
- Install Command：`pnpm install --frozen-lockfile`
- Build Command：`pnpm run build`

项目已提供：

- `vercel.json`
- `.node-version`
- `.npmrc`
- `.github/workflows/verify.yml`
- `.github/workflows/release-package.yml`
- `.github/workflows/online-smoke.yml`

## 必填环境变量

在 Vercel 环境变量面板填写：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

至少配置一个真实模型通道密钥，例如：

```env
KIE_BASE_URL=https://api.kie.ai
KIE_API_KEY=
KIE_CALLBACK_SECRET=
```

后续可继续补：

```env
OPENAI_API_KEY=
JIMENG_API_KEY=
KLING_API_KEY=
TONGYI_API_KEY=
```

## Supabase 初始化

创建 Supabase 项目后，复制完整初始化 SQL：

```bash
pnpm run supabase:sql
```

也可以使用交付目录中的 `dist/daji-xingxiang-supabase-init.sql`。将完整 SQL 粘贴到 Supabase SQL Editor 中执行。

执行完成后，再运行交付目录中的 `dist/daji-xingxiang-supabase-verify.sql`，确认表、RLS、存储桶、模型通道和种子数据均显示通过。

需要确认的存储桶：

- `customer-assets`
- `generated-assets`
- `product-assets`
- `music-assets`

上线后在 Supabase Auth URL Configuration 中加入：

```text
https://你的域名/auth/confirm
https://你的域名/protected
https://你的域名/auth/update-password
```

## 发布前后检查

查看当前发布通道状态：

```bash
pnpm run publish:status
```

推送前：

```bash
pnpm run verify:commit
```

部署前：

```bash
pnpm run release:check
```

部署后：

```bash
SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url
```

也可以在 GitHub Actions 页面手动运行“大吉形象线上冒烟验证”，输入线上域名后自动执行同样的线上检查。

也可以打开：

```text
/admin/launch
```

确认 Supabase、数据库、存储桶和模型通道都已就绪。

## 当前剩余外部事项

- 创建 GitHub 仓库并配置 `origin`。
- 推送 `main` 分支。
- 创建 Supabase 项目。
- 执行 Supabase 初始化 SQL。
- 在 Vercel 导入 GitHub 仓库。
- 在 Vercel 配置正式环境变量。
- 配置线上域名。
- 配置至少一个真实 AI 模型密钥。
