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

该压缩包只包含 Git 已提交文件，不包含 `node_modules`、`.next`、`.env` 或 `.vercel`。交接单统一覆盖 Supabase、Vercel、火山方舟、Seedream、后台 Worker 与任务能力路由，不输出真实密钥值。Supabase 初始化 SQL 包含持久任务表和原子领取函数，验收 SQL 会检查这些结构。`release:package` 会复核源码包、校验文件、清单和全部交接文档。

推送到 GitHub 后，也可以在 Actions 页面手动运行“大吉形象源码包交付”，工作流会先执行完整 CI 验证和线上素材连通性检查，再生成并上传源码包附件。

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
AI_EXECUTION_MODE=real
CRON_SECRET=
AI_WORKER_SECRET=
AI_WORKER_BATCH_SIZE=1
```

配置 AI 应用 1.0 默认模型：

```env
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=
ARK_TEXT_MODEL_ID=
ARK_IMAGE_MODEL_ID=
ARK_VIDEO_MODEL_ID=
```

后续多模型通道可继续补：

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

执行完成后，再运行交付目录中的 `dist/daji-xingxiang-supabase-verify.sql`，确认表、RLS、RLS 策略、存储桶配置、存储对象策略、模型通道和种子数据均显示通过。

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

确认 Supabase、数据库、存储桶配置和模型通道都已就绪。

## 当前剩余外部事项

- 创建 GitHub 仓库并配置 `origin`。
- 推送 `main` 分支。
- 创建 Supabase 项目。
- 执行 Supabase 初始化 SQL。
- 在 Vercel 导入 GitHub 仓库。
- 在 Vercel 配置正式环境变量。
- 配置线上域名。
- 配置火山方舟 API Key 和三个豆包模型 ID。
