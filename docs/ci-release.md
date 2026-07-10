# 自动化发布验证

项目已提供 GitHub Actions 工作流：

```text
.github/workflows/verify.yml
.github/workflows/release-package.yml
.github/workflows/online-smoke.yml
```

## 触发时机

- `verify.yml`：推送到 `main` 或 `master` 分支，或创建/更新拉取请求。
- `release-package.yml`：需要交付源码包时，在 GitHub Actions 页面手动触发。
- `online-smoke.yml`：部署完成后，在 GitHub Actions 页面手动触发，并输入线上 `base_url`。

## 检查内容

### 推送验证

工作流会执行：

```bash
pnpm run verify:ci
pnpm run check:materials:urls
```

GitHub Actions 使用 Node.js 22 LTS 运行自动验证；本地和 Vercel 仍可按项目根目录 `.node-version` 使用 20.18.0 或更高版本。

它会先执行 `verify:local`，再启动生产模式服务并运行 `smoke:prod`，随后检查线上示例素材是否仍可访问。

包括：

- 中文界面检查。
- 待提交文件密钥安全检查。
- Supabase 初始化文件检查。
- 发布包基础文件检查。
- 线上素材地址连通性检查。
- 代码规范检查。
- Next.js 生产构建。
- 生产模式关键页面、接口和安全响应头冒烟测试。

### 线上冒烟验证

部署完成后，在 GitHub Actions 中打开“大吉形象线上冒烟验证”，点击“Run workflow”，输入线上域名，例如：

```text
https://你的域名
```

工作流会执行：

```bash
pnpm run smoke:url
```

它会检查线上首页、项目创建页、演示工作台、登录页、健康检查、商品目录、站点地图、应用清单和基础安全响应头。

线上冒烟验证只接受 `https` 公网地址，不接受 `localhost` 或其他本地地址；同时会核对 `/api/health` 返回的应用公开访问地址是否与本次测试域名一致，避免正式部署后回调、站点地图或元信息仍指向旧地址。

### 源码包交付

需要从 GitHub 生成干净源码包时，在 GitHub Actions 中打开“大吉形象源码包交付”，点击“Run workflow”。

工作流会先执行：

```bash
pnpm run verify:ci
pnpm run check:materials:urls
```

验证通过后继续执行：

```bash
pnpm run release:package
```

完成后会上传一个名为 `daji-xingxiang-source-package` 的附件，包含：

- `daji-xingxiang-source-<提交号>.zip`
- `daji-xingxiang-source-<提交号>.zip.sha256`
- `daji-xingxiang-release-<提交号>.json`
- `daji-xingxiang-env-handoff.md`
- `daji-xingxiang-github-handoff.md`
- `daji-xingxiang-launch-runbook.md`
- `daji-xingxiang-launch-summary.md`
- `daji-xingxiang-model-handoff.md`
- `daji-xingxiang-supabase-init.sql`
- `daji-xingxiang-supabase-verify.sql`
- `daji-xingxiang-vercel-env-template.env`
- `daji-xingxiang-vercel-handoff.md`

源码压缩包内部会额外校验上线关键文件是否齐全，包括 GitHub Actions 工作流、`vercel.json`、`.node-version` 和 `.npmrc`。如果这些文件缺失，交付包校验会失败。

## 和 Vercel 的关系

建议先让 GitHub Actions 通过，再合并或部署到 Vercel。

Vercel 仍负责真实部署；GitHub Actions 负责提前发现明显问题。

## 需要注意

当前工作流不需要真实 Supabase 或模型通道密钥，因为它验证的是发布包、本地构建能力，以及仓库中不应提交真实密钥。

正式上线前仍需在 Vercel 中配置 `.env.example` 中列出的环境变量，并通过 `/admin/launch` 做上线体检。
