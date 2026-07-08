# 发布前检查清单

## 1. 本地发布包检查

```bash
pnpm run release:check
pnpm run release:package
pnpm run verify:commit
pnpm run verify:local
pnpm run check:secrets
pnpm run check:deploy
pnpm run smoke:admin-demo
pnpm run smoke:prod
SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url
```

正式发布前优先运行 `pnpm run release:check`。该总命令会依次运行后台演示模式冒烟测试、本地发布包验证、生产模式冒烟测试、部署目标审计、正式环境变量预检，并在检测到 `SMOKE_BASE_URL` 或线上 `NEXT_PUBLIC_APP_URL` 后继续检查公网地址。

这些命令会检查：

- 中文界面高风险英文词。
- 环境变量模板。
- 待提交文件是否疑似包含真实密钥、JWT 或私钥。
- 线上素材来源记录。
- Supabase 初始化文件。
- 发布包基础文件。
- 源码交付包、SHA256 校验文件和 JSON 发布清单。
- 后台演示模式下商品、风格、视频脚本、音乐、模型、任务和上线体检页面。
- GitHub/Vercel 导入所需的部署目标条件。
- 代码规范。
- 生产构建。
- 生产模式关键页面和接口。
- 线上域名关键页面和接口。
- 站点地图、爬虫规则和应用清单。
- 基础安全响应头。

## 2. Supabase 初始化

```bash
pnpm run check:supabase
pnpm run supabase:sql
```

将 `supabase:sql` 输出复制到 Supabase SQL Editor 中执行。

## 3. 正式环境变量

```bash
pnpm run preflight
```

`preflight` 已包含在 `release:check` 中；单独运行它可以快速确认正式环境变量是否齐全。

正式上线前必须配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- 至少一个 AI 模型通道密钥，例如 `KIE_API_KEY`

## 4. 系统内体检

启动项目后打开：

```text
/admin/launch
```

确认环境、数据库、存储桶和模型通道都已就绪。

## 5. Vercel 发布

Vercel 已读取 `vercel.json`：

- 安装命令：`pnpm install --frozen-lockfile`
- 构建命令：`pnpm run build`
- 框架：Next.js
- Node.js：20.18.0 或更高版本

项目根目录提供 `.node-version`，本地和部署平台建议使用 Node.js 20.18.0 或更高版本。

发布前运行：

```bash
pnpm run check:deploy
```

该命令会检查项目是否已经是 Git 仓库、是否已有初始提交、是否配置了 `origin` 远程仓库、是否具备 Vercel 配置文件和正式环境变量模板。若选择 Vercel CLI 手动部署，可以使用 `ALLOW_MANUAL_VERCEL_DEPLOY=1 pnpm run check:deploy` 跳过 Git 远程仓库要求。

当前本地项目已经初始化 Git 仓库，并已创建本地初始提交。后续需要你创建 GitHub 仓库后执行：

```bash
pnpm run verify:commit
git remote add origin https://github.com/你的账号/你的仓库.git
git push -u origin main
```

更完整的交接步骤见 `docs/launch-handoff.md`。

部署后，将线上域名填入 `NEXT_PUBLIC_APP_URL`，再重新运行上线体检。

部署后建议运行：

```bash
SMOKE_BASE_URL=https://你的域名 pnpm run smoke:url
```

如果 Vercel 域名已经写入 `NEXT_PUBLIC_APP_URL`，也可以直接重新运行：

```bash
pnpm run release:check
```

## 6. 自动化验证

代码推送到 GitHub 后，会通过 `.github/workflows/verify.yml` 自动运行：

```bash
pnpm run verify:local
```

建议自动化验证通过后再进入正式部署。
