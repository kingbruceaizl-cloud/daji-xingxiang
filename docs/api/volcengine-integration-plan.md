# 火山方舟（豆包）AI 应用 1.0 代码接入计划

## 1. 目标与当前状态

目标：保留明确的 `mock` 演示模式，把火山方舟设为 AI 应用 1.0 唯一默认生产 Provider，完成文字/图片理解、生图和短视频的真实闭环。KIE 不进入正式调用链路。

当前状态：

- 已完成严格 Mock/Real 隔离、火山方舟 Provider 注册和 Seedream 5.0 请求映射。
- 已完成任务先落库、私有素材 ID、项目归属校验、结果安全转存和公共 Catalog 任务隔离。
- 已完成 `ai_job_runtime`、数据库租约、原子领取、后台 Worker、失败重试和服务重启恢复。
- 已完成火山方舟环境变量、数据库迁移、发布脚本与上线检查清理。
- 已完成：严格区分 Mock/真实模式、持久任务 Worker、结果转存、任务恢复、Seedream Provider、文字/图片理解 Provider、Seedance 异步视频 Provider、工作台三步形象方案流程和项目级业务历史恢复。
- 待完成：远端应用数据库迁移、真实 API Key 联调、Seedance 真人素材规则联调和多角色 SaaS 能力。

详细 API 约定见 `docs/api/volcengine-ark.md`。

## 2. 阶段 0：核准账号与官方接口合同

在写真实请求参数前完成：

- 在目标火山方舟账号开通三个模型。
- 复制并记录三个完整模型 ID，分别填入 `ARK_TEXT_MODEL_ID`、`ARK_IMAGE_MODEL_ID`、`ARK_VIDEO_MODEL_ID`。
- 核准文字/图片理解、图片生成、视频任务创建与查询的官方示例。
- 核准地域、配额、并发、计费、审核错误、超时、重试和结果 URL 有效期。
- 用目标账号确认 Seedance 2.0 的客户真人人像是否必须进入可信素材库并取得 Asset ID。
- 密钥只配置到本地 `.env.local` 或部署平台，不通过聊天、截图或提交文件传递。

输出：一份不含密钥的接口参数核对表，以及可在服务端运行的最小测试请求。

## 3. 阶段 1：先修复真实调用的基础风险

### 3.1 严格 Provider 注册

涉及文件：

- `lib/ai/index.ts`
- `lib/ai/model-routing.ts`
- `lib/ai/mock-provider.ts`

修改要求：

- 未注册 Provider 必须明确失败，不能静默回退到 `mock`。
- 只有路由或操作者明确选择 `mock` 时才能返回演示结果。
- 生产环境缺少 Provider、路由、密钥或模型 ID 时返回安全中文错误，不能伪装成功。

原因：当前请求 `provider=volcengine` 会落到 Mock，且返回值仍可能显示为火山方舟，造成“假真实成功”。

### 3.2 本地任务先落库

涉及文件：

- `lib/ai/persistence.ts`
- 已新增 `lib/ai/job-orchestrator.ts`
- `app/api/generate/image/route.ts`
- `app/api/generate/video/route.ts`

统一顺序：

1. 校验登录、项目归属、素材归属和参数。
2. 创建本地 `ai_jobs`，取得本地任务 ID。
3. 生成与本地任务绑定的回调信息或幂等键。
4. 调用火山方舟。
5. 更新 Provider 任务 ID、状态和安全处理后的响应摘要。
6. 每个阶段写入 `job_events`。

这样可避免快速回调找不到记录、数据库写入失败后产生孤儿计费任务，以及重复提交造成重复扣费。

### 3.3 修复数据隔离

涉及文件：

- `app/api/catalog/route.ts`
- `lib/catalog.ts`
- `app/api/jobs/[id]/route.ts`
- 两个生成路由与上传路由

修改要求：

- 公共 Catalog 不再通过 Service Role 返回所有用户的最近任务。
- 后台任务列表使用独立的受权限保护接口。
- 查询任务只接受系统本地任务 ID，并校验任务所有者。
- 不允许通过 `?provider=` 查询任意第三方任务 ID。
- `projectId`、输入素材与输出素材都必须校验属于当前用户和当前项目。
- 对前端过滤 Provider 原始响应，不返回 `raw`、签名临时 URL 或内部错误详情。

### 3.4 私有素材改用素材 ID

涉及文件：

- `app/api/upload/route.ts`
- `components/upload/upload-button.tsx`
- `components/studio/customer-assets-panel.tsx`
- `components/studio/generate-panel.tsx`
- 已新增 `lib/assets/resolve-ai-input.ts`

修改要求：

- 前端向生成接口传 `inputAssetIds`，不传任意外部 `inputImageUrls`。
- 上传接口为前端返回短期 `previewUrl`，同时保留素材 ID。
- 服务端验证素材与项目归属后，再生成短期签名 URL、Base64 或供应商支持的 Asset URI。
- 不把 Supabase Service Role Key 或长期公开地址暴露给浏览器。

### 3.5 加固生成结果转存

涉及文件：

- `lib/ai/result-assets.ts`
- Provider 回调与任务恢复逻辑

修改要求：

- 只下载 HTTPS 且属于明确允许域名的结果。
- 设置连接/总超时、重定向限制、Content-Length 和实际下载上限。
- 校验 MIME 类型与文件头，图片和视频分别使用允许列表。
- 大视频避免一次性完整读入内存。
- 转存按稳定来源键幂等，重复回调不能创建重复素材。
- 数据库写入失败时清理孤儿 Storage 文件。
- 不在 metadata 或错误信息中持久化带签名参数的完整临时 URL。
- “模型生成成功”和“结果转存完成”分开记录；转存失败必须可重试。

## 4. 阶段 2：数据模型和类型合同

### 4.1 TypeScript

修改 `lib/ai/types.ts`：

- 内部状态统一为 `queued`、`running`、`succeeded`、`failed`、`canceled`。
- 把供应商的 `cancelled` 等拼写映射为 `canceled`。
- 补齐 `text_generation`、`image_understanding`、`video_generation` 等任务类型。
- 为结构化文字结果、图片理解结果、媒体结果、错误分类和转存状态建立明确类型。
- `CreateJobResult` 支持同步媒体 URL/Base64、结构化内容和异步 Provider 任务 ID。

### 4.2 Supabase 迁移

新增迁移，至少处理：

- `volcengine` Provider 和三个豆包模型。
- 三组 1.0 默认路由，长视频继续禁用生产路由。
- 对齐 `job_type`、`model_capability` 和 `canceled` 状态。
- 增加 `task_key`、模型版本、错误分类、重试次数、转存状态、完成时间和客户端幂等键。
- 为非空 `(provider, provider_job_id)` 增加唯一约束。
- 为输出素材增加可用于回调幂等的稳定来源唯一键。
- 从正式种子、路由和上线检查中移除 KIE。

模型 ID 只能在阶段 0 核准后写入配置或种子；不根据展示名称猜测版本号。

## 5. 阶段 3：实现火山方舟 Provider

建议文件结构：

```text
lib/ai/volcengine/
  config.ts
  client.ts
  text.ts
  image.ts
  video.ts
  errors.ts
  status.ts
  index.ts
```

### 5.1 Doubao-Seed-2.1-Pro

- 已实现文字生成、图片理解和图片转文字的统一 Responses Provider，等待真实模型联调。
- 服务端要求结构化输出，并用 Schema 解析；解析失败时不把任意文本直接当业务数据。
- 已新增服务端接口：
  - `POST /api/ai/analyze-image`
  - `POST /api/ai/appearance-plan`
  - `POST /api/ai/prompts`
- 输出形象方案、生图提示词、视频提示词和镜头方案，均允许操作者确认后再进入生成。

### 5.2 Doubao-Seedream-5.0 完整版

- 支持文生图和图生图。
- 处理官方接口实际返回的同步 URL 或 Base64。
- 返回结果后立即进入安全转存流程，转存完成后才把系统素材结果交给前端。
- 同步图片结果直接进入统一转存流程。

### 5.3 Doubao-Seedance-2.0

- 已实现创建异步视频任务、保存 Provider 任务 ID、后台查询、失败重试、结果转存和重启恢复。
- 新增 `app/api/provider-callback/volcengine/route.ts`，同时保留受控轮询作为丢回调恢复路径。
- 回调只做签名校验、状态落库和转存排队，快速返回 2xx；大视频转存不阻塞回调响应。
- 回调与轮询都要提取官方返回中的视频结果并走同一幂等转存流程。
- 如果客户真人素材必须使用可信素材 Asset ID，在创建任务前明确校验并返回可操作的中文提示。

回调签名建议使用单独的 `ARK_CALLBACK_SIGNING_SECRET`，以本地任务 ID 生成 HMAC；不要在 URL 中直接放 API Key 或共享明文密钥。

## 6. 阶段 4：任务查询、恢复与前端流程

### 6.1 任务恢复

修改 `app/api/jobs/[id]/route.ts`：

- 先按本地任务 ID 查询并校验所有权。
- 对过期的非终态任务执行限频 Provider 补查。
- 将补查结果、事件和输出素材写回数据库。
- 刷新页面或重新进入项目后可以恢复仍在运行的视频生成任务。
- 前端轮询使用退避与可恢复策略，不固定在约两分钟后永久停止。

### 6.2 工作台

修改：

- `components/studio/studio-creation-flow.tsx`
- `components/studio/generate-panel.tsx`
- `components/studio/customer-assets-panel.tsx`
- `lib/ai/display.ts`
- 首页和后台模型配置文案

目标流程：

1. 上传客户素材。
2. 显示 Doubao-Seed-2.1-Pro 的结构化分析与人工确认。
3. 显示形象方案与可编辑生图提示词。
4. 调用 Doubao-Seedream-5.0 完整版，并展示转存后的形象图。
5. 选择形象图，生成可编辑的视频提示词与镜头方案。
6. 调用 Doubao-Seedance-2.0，并持续显示任务状态和结果。

火山方舟统一显示为“火山方舟（豆包）”；普通工作台不展示完整模型 ID。

## 7. 阶段 5：发布、检查与测试

同步更新：

- `lib/launch-readiness.ts`
- `scripts/check-secret-safety.mjs`
- `scripts/check-env-templates.mjs`
- `scripts/preflight.mjs`
- 环境变量、Vercel、模型交接和上线摘要生成脚本
- Supabase 初始化/验收脚本
- 生产冒烟脚本

发布检查必须要求：

- `ARK_API_KEY` 和三个模型 ID 已配置且不是占位值。
- 三个模型路由均指向 `volcengine`。
- 匿名用户不能调用 `volcengine` 或其他真实 Provider。
- `mock` 结果不会被标记成火山方舟结果。
- 构建产物、浏览器网络请求和日志不包含密钥。

至少增加以下自动测试：

- Provider 请求映射与模型 ID 读取。
- 未知 Provider 拒绝。
- 生产环境禁止自动回退 Mock。
- 文字结构化输出解析失败。
- 状态与错误码归一化。
- 回调签名、回调幂等与丢回调补查。
- 私有素材跨项目访问拒绝。
- Storage 下载域名、大小、类型与超时限制。
- 同步图片转存和异步视频转存。
- Catalog 与任务接口的数据隔离。

最后运行：

```bash
pnpm run lint
pnpm run build
pnpm run preflight
```

## 8. 完成定义

只有同时满足以下条件，才能把豆包 AI 应用 1.0 标记为“已接入”：

- 三个模型均通过目标账号的真实端到端测试。
- 文字分析、图片理解、生图和变装短视频形成完整可恢复链路。
- 图片和视频均已转存 Supabase Storage。
- 真实调用必须登录，并具备基础限频、幂等和所有权校验。
- 任务、事件、错误和模型版本可追踪。
- Mock 不会伪装为真实 Provider。
- Seedance 真人素材的供应商合规前置已验证并形成明确操作流程。
- 自动测试、lint、build、上线前检查和线上冒烟均通过。
