# 大吉形象

面向形象顾问和商家的 AI 形象设计软件。MVP 第一阶段为“形象大师无画布版”：上传客户素材，选择风格和商品，生成形象图片，再生成变装短视频。

## 当前进度

- 已初始化 Next.js + Supabase 项目骨架。
- 已完成中文首页、项目列表、新建本地项目、形象大师工作台和后台预览页。
- 已完成本地项目下的客户图片上传预览、演示生图任务和保存反馈。
- 已预留 KIE、OpenAI、即梦、可灵、通义等多模型通道。
- 已整理产品、前端、后端、API 和上线文档。

## 本地运行

```bash
pnpm install
pnpm run dev
```

默认访问：

```text
http://localhost:3000
```

如果 3000 端口被占用，Next.js 会自动切换到其他端口。

## 常用页面

- `/`: 大吉形象中文首页
- `/studio/demo`: 形象大师无画布演示流程
- `/studio/[projectId]`: 指定项目的形象大师工作台
- `/projects`: 项目列表
- `/projects/new`: 新建形象项目
- `/admin`: 后台预览
- `/admin/products`: 商品库管理
- `/admin/styles`: 风格模板管理
- `/admin/video-templates`: 视频脚本管理
- `/admin/music`: 音乐库管理
- `/admin/models`: 模型配置管理
- `/admin/jobs`: 生成任务记录
- `/admin/launch`: 上线体检
- `/protected`: 登录后工作台
- `/auth/login`: 登录
- `/auth/sign-up`: 注册

## 环境变量

复制 `.env.example` 为 `.env.local`，然后填入 Supabase 和 AI 模型通道配置。

```bash
cp .env.example .env.local
```

本地体验可以先不填写环境变量，系统会使用本地项目和演示模型通道。正式上线建议配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

服务端密钥：

- `SUPABASE_SERVICE_ROLE_KEY`
- `KIE_API_KEY`
- `OPENAI_API_KEY`
- `JIMENG_API_KEY`
- `KLING_API_KEY`
- `TONGYI_API_KEY`

## 验证

```bash
pnpm run release:check
pnpm run release:clean
pnpm run release:package
pnpm run release:env-handoff
pnpm run release:github-handoff
pnpm run release:launch-summary
pnpm run release:supabase-sql
pnpm run release:vercel-handoff
pnpm run release:verify-handoff
pnpm run publish:status
pnpm run verify:ci
pnpm run verify:commit
pnpm run verify:local
pnpm run check:env
pnpm run check:secrets
pnpm run check:materials
pnpm run check:supabase
pnpm run check:release
pnpm run check:deploy
pnpm run smoke:admin-demo
pnpm run smoke:prod
SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url
pnpm run supabase:sql
pnpm run preflight
```

正式上线前优先运行 `release:check`，它会串联后台演示模式冒烟测试、本地发布包验证、生产模式冒烟测试、部署目标审计、正式环境变量预检，并在检测到线上 https 域名后继续检查公网地址。`release:package` 会先清理旧交付物，再基于当前 Git 提交生成干净源码交付包、SHA256 校验文件、JSON 发布清单、环境变量交接单、GitHub 仓库交接单、Supabase 初始化 SQL、Vercel 部署交接单和上线摘要，并执行 `release:verify-handoff` 确认八件交付物完整、指向当前提交且未发现明显密钥风险。`publish:status` 会用中文显示 GitHub、Vercel、Supabase、模型密钥和本地配置的发布通道状态，但不会打印任何密钥值。`verify:ci` 会模拟 GitHub Actions，执行完整本地发布验证和生产模式冒烟测试。推送到 GitHub 后，`verify.yml` 会自动运行 `verify:ci`；需要交付源码包时可手动运行 `release-package.yml` 并下载 Actions 附件；部署后可手动运行 `online-smoke.yml` 并输入线上域名。首次提交前优先运行 `verify:commit`，它会用锁文件严格安装依赖，再执行完整本地发布验证。`verify:local` 会检查环境变量模板、密钥安全、中文界面、素材来源、Supabase 初始化文件、发布包基础文件、代码规范和生产构建。`check:secrets` 会扫描待提交文件，防止真实模型密钥、Service Role Key、JWT 或私钥误提交。`check:deploy` 会检查当前项目是否具备 GitHub/Vercel 导入所需的基础条件；如果选择 Vercel CLI 手动部署，可使用 `ALLOW_MANUAL_VERCEL_DEPLOY=1 pnpm run check:deploy` 跳过 Git 远程仓库要求。`smoke:admin-demo` 会清空 Supabase 环境变量并确认后台商品、风格、视频脚本、音乐、模型、任务和上线体检页面都能在演示模式打开。`smoke:prod` 会启动生产模式服务并检查关键页面和接口。`smoke:url` 用于部署后检查线上域名。`supabase:sql` 会按顺序输出初始化 SQL，方便复制到 Supabase SQL Editor。没有配置正式环境变量时，`preflight` 和 `release:check` 会提示缺少的上线配置；本地演示可以继续使用 `pnpm run dev`。

也可以打开 `/admin/launch` 查看中文上线体检页面，确认 Supabase、数据库、存储桶和模型通道是否就绪。

本地演示路径：

1. 打开 `/projects/new` 创建本地项目。
2. 进入工作台后上传客户图片。
3. 点击“生成形象图”查看演示任务结果。
4. 点击“保存到项目”查看保存反馈。

## 文档

- 产品需求：`docs/prd.md`
- 前端需求：`docs/frontend-requirements.md`
- 后端需求：`docs/backend-requirements.md`
- API 说明：`docs/api/README.md`
- KIE 对接：`docs/api/kie.md`
- 数据库配置：`docs/database.md`
- Supabase 初始化：`docs/supabase-setup.md`
- 环境变量配置：`docs/env-vars.md`
- 自动化发布验证：`docs/ci-release.md`
- 发布前检查：`docs/release-checklist.md`
- 上线交接单：`docs/launch-handoff.md`
- 上线说明：`docs/deployment.md`
- 素材来源：`docs/material-sources.md`
