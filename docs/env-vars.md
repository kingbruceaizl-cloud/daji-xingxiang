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
- 至少一个 AI 模型通道密钥，例如 `KIE_API_KEY`
- 如果启用 KIE，还必须配置 `KIE_CALLBACK_SECRET`

## 3. 变量用途

| 变量 | 用途 | 是否可暴露给浏览器 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 可以 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 公开访问密钥 | 可以 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端写入数据库和管理数据 | 不可以 |
| `NEXT_PUBLIC_APP_URL` | 线上域名、回调和元信息地址 | 可以 |
| `KIE_API_KEY` | KIE 模型通道密钥 | 不可以 |
| `KIE_CALLBACK_SECRET` | KIE 回调校验密钥；启用 KIE 时正式上线必填，建议 16 位以上随机强字符串 | 不可以 |
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

`check:env` 检查模板是否齐全；`release:env-handoff` 会生成 `dist/daji-xingxiang-env-handoff.md`，用于交接 Vercel、Supabase 和模型通道配置，不输出任何真实密钥值；`release:model-handoff` 会生成 `dist/daji-xingxiang-model-handoff.md`，用于核对 KIE 回调和多模型预留密钥；`release:vercel-env-template` 会生成 `dist/daji-xingxiang-vercel-env-template.env`，用于在 Vercel 面板逐项填写生产变量；`preflight` 检查当前环境是否满足正式上线条件。

## 5. 安全提醒

- 不要提交 `.env.local`、`.env.production` 或任何真实密钥。
- Vercel 中的生产环境变量和预览环境变量应分别配置。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放在服务端环境变量中，不能加 `NEXT_PUBLIC_` 前缀。
- 启用 KIE 时不要省略 `KIE_CALLBACK_SECRET`，否则回调入口缺少可信校验。
