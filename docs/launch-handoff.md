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

然后粘贴到 Supabase SQL Editor 中执行。

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
