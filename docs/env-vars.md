# 环境变量配置说明

## 1. 本地开发

复制 `.env.example`：

```bash
cp .env.example .env.local
```

本地演示可以先不填写 Supabase 和模型通道密钥，系统会使用本地项目和演示模型通道。

## 2. 正式上线

参考 `.env.production.example`，将变量填入 Vercel 的环境变量面板。

正式上线必须配置：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false`
- `AI_EXECUTION_MODE=real`
- `CRON_SECRET`
- `ARK_API_KEY`
- `ARK_TEXT_MODEL_ID`
- `ARK_IMAGE_MODEL_ID`
- `ARK_VIDEO_MODEL_ID`

## 3. 变量用途

| 变量 | 用途 | 是否可暴露给浏览器 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 可以 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 公开访问密钥 | 可以 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端写入数据库和管理数据 | 不可以 |
| `NEXT_PUBLIC_APP_URL` | 线上域名、回调和元信息地址 | 可以 |
| `NEXT_PUBLIC_APP_ENV` | 应用运行环境，正式上线必须为 `production` | 可以 |
| `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` | 团队内测阶段必须为 `false`，员工通过后台邀请 | 可以 |
| `AI_EXECUTION_MODE` | `mock` 仅演示，`real` 才允许调用真实模型；生产必须为 `real` | 不可以 |
| `CRON_SECRET` | Vercel Cron 调用后台 Worker 的鉴权密钥，至少使用 24 位随机值 | 不可以 |
| `AI_WORKER_SECRET` | 可选，独立 Worker 调用密钥；未配置时复用 `CRON_SECRET` | 不可以 |
| `AI_WORKER_BATCH_SIZE` | 单次后台领取任务数，默认 `1`，当前限制为 `1-3` | 不可以 |
| `ARK_BASE_URL` | 火山方舟 API 基础地址；当前项目默认 `https://ark.cn-beijing.volces.com/api/v3`，最终以控制台示例为准 | 不可以 |
| `ARK_API_KEY` | 火山方舟服务端 API Key | 不可以 |
| `ARK_TEXT_MODEL_ID` | Doubao-Seed-2.1-Pro 的完整模型 ID，从当前账号控制台复制 | 不可以 |
| `ARK_IMAGE_MODEL_ID` | Doubao-Seedream-5.0 完整版模型 ID，当前优先值为 `doubao-seedream-5-0-260128`，仍以控制台为准 | 不可以 |
| `ARK_VIDEO_MODEL_ID` | Doubao-Seedance-2.0 的完整模型 ID，从当前账号控制台复制 | 不可以 |
| `OPENAI_API_KEY` | OpenAI 模型通道密钥 | 不可以 |
| `JIMENG_API_KEY` | 即梦模型通道密钥 | 不可以 |
| `KLING_API_KEY` | 可灵模型通道密钥 | 不可以 |
| `TONGYI_API_KEY` | 通义模型通道密钥 | 不可以 |

## 4. 检查命令

```bash
pnpm run check:env
pnpm run release:env-handoff
pnpm run release:model-handoff
pnpm run release:vercel-env-template
pnpm run preflight
```

`check:env` 检查模板是否齐全；`release:env-handoff` 会生成 `dist/daji-xingxiang-env-handoff.md`，用于交接 Vercel、Supabase 和模型通道配置，不输出任何真实密钥值；`release:model-handoff` 后续需同步为核对火山方舟默认模型与其他预留通道；`release:vercel-env-template` 会生成 `dist/daji-xingxiang-vercel-env-template.env`，用于在 Vercel 面板逐项填写生产变量；`preflight` 检查当前环境是否满足正式上线条件。

环境检查和交接脚本必须以火山方舟为正式通道，并验证生产环境不会自动回退到 Mock。

`preflight` 不只检查变量是否存在，也会拦截 `你的域名`、`<填写...>`、`example.com` 等占位值，以及明显过短的密钥。

## 5. 安全提醒

- 不要提交 `.env.local`、`.env.production` 或任何真实密钥。
- Vercel 中的生产环境变量和预览环境变量应分别配置。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放在服务端环境变量中，不能加 `NEXT_PUBLIC_` 前缀。
- `ARK_API_KEY` 和三个模型 ID 只允许在服务端读取，不得加 `NEXT_PUBLIC_` 前缀。
- `CRON_SECRET` 与 `AI_WORKER_SECRET` 只允许在服务端读取，不能写入前端或日志。
