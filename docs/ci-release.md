# 自动化发布验证

项目已提供 GitHub Actions 工作流：

```text
.github/workflows/verify.yml
```

## 触发时机

- 推送到 `main` 或 `master` 分支。
- 创建或更新拉取请求。

## 检查内容

工作流会执行：

```bash
pnpm run verify:local
```

GitHub Actions 会读取项目根目录的 `.node-version` 来安装 Node.js，避免本地、CI 和 Vercel 运行版本漂移。

包括：

- 中文界面检查。
- 待提交文件密钥安全检查。
- Supabase 初始化文件检查。
- 发布包基础文件检查。
- 代码规范检查。
- Next.js 生产构建。

## 和 Vercel 的关系

建议先让 GitHub Actions 通过，再合并或部署到 Vercel。

Vercel 仍负责真实部署；GitHub Actions 负责提前发现明显问题。

## 需要注意

当前工作流不需要真实 Supabase 或模型通道密钥，因为它验证的是发布包、本地构建能力，以及仓库中不应提交真实密钥。

正式上线前仍需在 Vercel 中配置 `.env.example` 中列出的环境变量，并通过 `/admin/launch` 做上线体检。
