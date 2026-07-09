# 大吉形象上线说明

## 1. 当前上线状态

当前项目已经具备 Next.js 生产构建能力，可以部署到 Vercel。真实上线还需要完成以下外部配置：

- 创建 Supabase 项目。
- 配置 Supabase 环境变量。
- 配置 Supabase Auth 回调地址。
- 创建数据库表和存储桶。
- 在 Vercel 中配置环境变量。
- 将当前项目推送到可被 Vercel 导入的 GitHub 仓库，或明确选择 Vercel CLI 手动部署。
- 绑定正式域名。
- 接入至少一个 AI 模型通道密钥。

本地 MVP 已支持无登录演示：

- 创建本地项目。
- 上传客户图片并显示预览。
- 使用演示模型通道生成形象图任务。
- 保存演示结果到当前项目的页面状态。

## 2. Supabase 配置

需要在 Supabase 控制台获取：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

建议创建以下存储桶：

- `customer-assets`
- `generated-assets`
- `product-assets`
- `music-assets`

项目已提供 SQL 迁移文件，见 `docs/database.md`。迁移会创建以下数据表：

- `profiles`
- `projects`
- `project_assets`
- `asset_files`
- `product_categories`
- `products`
- `style_presets`
- `video_templates`
- `script_templates`
- `music_tracks`
- `ai_providers`
- `ai_models`
- `ai_jobs`
- `job_events`

详细操作见 `docs/supabase-setup.md`。

## 3. Vercel 部署

1. 将项目推送到 GitHub。当前项目已初始化本地 Git 仓库，使用 `main` 作为默认分支，并已创建本地初始提交；还需要创建 GitHub 空仓库并关联远程仓库：

```bash
git status --short
git remote add origin https://github.com/你的账号/你的仓库.git
git push -u origin main
```

如果远程仓库地址填错，先移除后重加：

```bash
git remote remove origin
git remote add origin https://github.com/你的账号/你的仓库.git
```

2. 在 Vercel 中导入该 GitHub 仓库。
3. Framework 选择 Next.js。
4. Node.js Version 使用 20.18.0 或更高版本；项目根目录的 `.node-version` 已固定为 `20.18.0`。
5. Build Command 使用：

```bash
pnpm run build
```

6. Install Command 使用：

```bash
pnpm install --frozen-lockfile
```

7. 填入 `.env.example` 中的环境变量。
   正式环境变量可参考 `docs/env-vars.md` 和 `.env.production.example`。
8. 部署后，将线上域名写入：

```env
NEXT_PUBLIC_APP_URL=
```

9. 部署前可以运行：

```bash
pnpm run release:check
```

该命令会统一执行后台演示模式冒烟测试、本地发布包验证、生产模式冒烟测试、部署目标审计、正式环境变量预检，并在检测到线上 https 域名后检查公网地址。也可以按需拆开运行：

```bash
pnpm run smoke:admin-demo
pnpm run verify:local
pnpm run check:supabase
pnpm run check:release
pnpm run check:deploy
pnpm run smoke:prod
pnpm run preflight
```

`check:deploy` 默认按 GitHub 导入 Vercel 的方式检查 Git 仓库和远程地址。如果你后续选择 Vercel CLI 手动部署，可以运行：

```bash
ALLOW_MANUAL_VERCEL_DEPLOY=1 pnpm run check:deploy
```

项目还提供 GitHub Actions 自动验证，见 `docs/ci-release.md`。建议自动化验证通过后再部署到 Vercel。

如果暂时不能推送 GitHub，也可以生成并校验源码交付包：

```bash
pnpm run release:package
```

校验通过后，`dist/daji-xingxiang-source-<提交号>.zip` 可作为干净源码包交给部署环境使用。需要排查时，可拆开运行 `release:archive` 和 `release:verify-archive`。

同一次执行还会生成 `dist/daji-xingxiang-env-handoff.md`，用于交接 Vercel、Supabase 和模型通道环境变量配置，不包含真实密钥值。

还会生成 `dist/daji-xingxiang-github-handoff.md`，用于创建 GitHub 仓库、绑定远程、推送分支、检查 Actions 和下载源码包附件。

还会生成 `dist/daji-xingxiang-supabase-init.sql`，创建 Supabase 项目后可将该文件完整复制到 Supabase SQL Editor 执行。

还会生成 `dist/daji-xingxiang-supabase-verify.sql`，用于执行初始化 SQL 后检查表、RLS、存储桶、模型通道和种子数据是否完整。

还会生成 `dist/daji-xingxiang-vercel-env-template.env`，用于在 Vercel 环境变量面板逐项填写生产变量。

还会生成 `dist/daji-xingxiang-vercel-handoff.md`，用于核对 Vercel 导入时的框架、Node、安装命令、构建命令、环境变量和部署后检查。

还会生成 `dist/daji-xingxiang-model-handoff.md`，用于核对 KIE、OpenAI、即梦、可灵、通义等模型通道的密钥、回调地址和部署后验证步骤。

还会生成 `dist/daji-xingxiang-launch-runbook.md`，用于正式发布当天逐项执行 GitHub、Supabase、Vercel、模型通道和验收动作。

交付目录还会生成 `dist/daji-xingxiang-launch-summary.md`，用于快速查看当前提交、交付物、剩余外部配置和下一步上线动作。

部署完成后运行线上冒烟测试：

```bash
SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url
```

## 4. Supabase Auth 回调地址

上线后需要在 Supabase Auth URL Configuration 中加入：

```text
https://你的域名/auth/confirm
https://你的域名/protected
https://你的域名/auth/update-password
```

本地开发建议加入：

```text
http://localhost:3000/auth/confirm
http://localhost:3000/protected
http://localhost:3000/auth/update-password
```

## 5. AI 模型通道配置

至少需要先配置一个模型通道才能真实生成图片或视频。

未配置模型通道时，系统会使用演示模型通道走通页面流程，但不会产生真实 AI 结果。

第一阶段建议优先接入 KIE：

```env
KIE_API_KEY=
KIE_CALLBACK_SECRET=
```

启用 KIE 时，`KIE_CALLBACK_SECRET` 是正式上线必填项，建议使用 16 位以上随机强字符串，并和 KIE 回调配置保持一致。

配置模型前可先生成模型通道交接单：

```bash
pnpm run release:model-handoff
```

后续预留：

```env
OPENAI_API_KEY=
JIMENG_API_KEY=
KLING_API_KEY=
TONGYI_API_KEY=
```

## 6. 当前阻塞项

真正发布到公网需要外部账号和密钥，无法只靠本地代码完成：

- Supabase 项目 URL 和 Publishable Key。
- Supabase Service Role Key。
- Vercel 项目或 GitHub 仓库权限。
- KIE 或其他模型通道密钥。

拿到这些信息后，即可继续完成数据库迁移、存储配置和正式部署。

## 7. 健康检查

项目提供健康检查接口和后台体检页：

```http
GET /api/health
```

```text
/admin/launch
```

接口和页面会返回：

- 当前是否处于演示模式。
- Supabase 公共环境变量是否配置。
- Service Role Key 是否配置。
- AI 模型通道是否配置。
- 数据库连接是否正常。
- 必要存储桶是否创建。
- 当前部署平台、应用环境、线上域名、Git 分支和提交号。

公开站点文件：

- `/robots.txt`
- `/sitemap.xml`
- `/manifest.webmanifest`

基础安全响应头：

- `X-Content-Type-Options`
- `Referrer-Policy`
- `X-Frame-Options`
- `Permissions-Policy`
- 后台、登录后页面和 API 额外返回 `X-Robots-Tag: noindex, nofollow, noarchive`，避免被搜索引擎索引。

## 8. 后台权限

后台页面和后台写入接口已加入权限保护：

- 未配置 Supabase 时，后台以演示模式展示，不写入真实数据。
- 配置 Supabase 后，访问后台需要先登录。
- 只有 `profiles.role` 为 `owner` 或 `admin` 的账号可以写入商品、风格和模型配置。
- 后台写入接口依赖 `SUPABASE_SERVICE_ROLE_KEY`，但不会仅凭 Service Role Key 开放写入。
