# 后端开发需求

## 1. 后端职责

后端负责项目数据、素材存储、商品库、AI 模型通道调用、任务状态、任务恢复、团队权限、用量限制和后台配置。本地 Mock 可以匿名演示，线上真实能力必须登录。

所有 AI 密钥必须只存在服务端环境变量或安全密钥服务中，不能发送到浏览器。AI 应用 1.0 默认接入火山方舟，内部 Provider 标识使用 `volcengine`，中文展示名为“火山方舟（豆包）”。

## 2. Supabase 资源

### Auth

- 使用 Supabase Auth 实现邮箱登录、退出、密码重置和管理员邮件邀请。
- 团队内测阶段关闭 Supabase 公开注册，员工统一从后台邀请。
- 首位账号自动成为 `owner`，后续账号默认成为 `staff`；负责人可任命 `admin`。
- `owner`、`admin` 可访问管理后台；`staff` 只能使用项目和形象大师业务流程。

### 存储

建议 Bucket：

- `customer-assets`: 客户上传图片和视频。
- `generated-assets`: AI 生成图片和视频。
- `product-assets`: 商品图和素材图。
- `music-assets`: 音乐文件。

文件规则：

- `customer-assets`: 支持 JPG、PNG、WebP、MP4、MOV，最大 100MB。
- `generated-assets`: 支持 JPG、PNG、WebP、MP4，最大 500MB。
- `product-assets`: 支持 JPG、PNG、WebP，最大 50MB。
- `music-assets`: 支持 MP3、M4A、WAV，最大 50MB。
- 上传接口必须先校验文件类型和大小，再读取文件内容或写入存储。

### Database

建议表：

- `profiles`
- `projects`
- `asset_files`
- `product_categories`
- `products`
- `style_presets`
- `video_templates`
- `script_templates`
- `music_tracks`
- `ai_providers`
- `ai_models`
- `ai_model_routes`
- `ai_jobs`
- `job_events`
- `ai_job_runtime`：只供 Service Role 和后台 Worker 使用，不向浏览器角色开放。
- `usage_limits`：记录每位员工的月度文字、图片、视频额度、并发上限和真实生成启用状态。
- `system_alerts`：持久记录真实生成任务失败、卡住、确认和关闭状态。

## 3. 核心表字段草案

### `projects`

- `id`
- `owner_id`
- `name`
- `customer_name`
- `status`
- `created_at`
- `updated_at`

### `products`

- `id`
- `category_id`
- `name`
- `type`: `sku` 或 `asset`
- `sku`
- `price`
- `purchase_url`
- `image_url`
- `prompt_text`
- `tags`
- `is_active`
- `created_at`
- `updated_at`

### `style_presets`

- `id`
- `name`
- `description`
- `cover_url`
- `positive_prompt`
- `negative_prompt`
- `tags`
- `is_active`

### `video_templates`

- `id`
- `name`
- `aspect_ratio`
- `duration_seconds`
- `camera_direction`
- `transition_style`
- `prompt_template`
- `is_active`

### `script_templates`

- `id`
- `name`
- `content`
- `tags`
- `is_active`

### `music_tracks`

- `id`
- `name`
- `bucket`
- `path`
- `public_url`
- `usage_note`
- `mood_tags`
- `is_active`

### `ai_jobs`

- `id`
- `project_id`
- `provider`
- `model`
- `job_type`
- `status`
- `input_asset_ids`
- `output_asset_ids`
- `request_payload`
- `provider_job_id`
- `model_version`
- `response_payload`
- `error_code`
- `error_message`
- `created_at`
- `updated_at`

任务状态至少支持 `pending`、`queued`、`submitting`、`running`、`persisting`、`retrying`、`succeeded`、`failed`、`canceled`。如果供应商返回 `cancelled` 等其他拼写，Provider 层统一转换为 `canceled`。如果供应商不支持真正取消，系统仍需记录本地取消状态，并停止后续自动轮询和结果入库。

### `ai_job_runtime`

- `job_id`
- `dispatch_payload`
- `provider_result_urls`
- `provider_metadata`
- `created_at`
- `updated_at`

该表存放后台恢复所需但不应通过客户端 RLS 暴露的数据。客户素材只记录素材 ID，Worker 执行时重新生成短期签名链接；供应商临时结果 URL 在转存完成前保存在此表。

### `ai_model_routes`

- `id`
- `task_key`: `text_generation`、`image_understanding`、`text_to_image`、`image_to_image`、`image_to_video`、`video_generation`、`long_video_generation`
- `display_name`
- `description`
- `provider`
- `model`
- `default_params`
- `is_active`
- `created_at`
- `updated_at`

### `usage_limits`

- `user_id`
- `monthly_text_limit`
- `monthly_image_limit`
- `monthly_video_limit`
- `max_concurrent_jobs`
- `is_generation_enabled`
- `created_at`
- `updated_at`

额度值为 `-1` 表示不限制。只有真实模型任务计入额度，Mock 演示任务不计入。

## 4. 服务端 API 草案

- `POST /api/upload`: 上传客户素材；商品、音乐和生成结果素材桶仅允许 `owner` 或 `admin` 写入。
- `POST /api/projects`: 创建项目。
- `GET /api/projects`: 获取项目列表。
- `GET /api/projects/[id]`: 获取项目详情。
- `POST /api/generate/image`: 创建生图任务。
- `POST /api/generate/video`: 创建视频任务。
- `POST /api/ai/analyze-image`: 分析客户图片并返回结构化客户特征；Mock 与火山方舟 Provider 已实现，等待真实密钥联调。
- `POST /api/ai/appearance-plan`: 根据分析、风格和商品生成结构化形象方案；Mock 与火山方舟 Provider 已实现，等待真实密钥联调。
- `POST /api/ai/prompts`: 根据已确认方案生成生图提示词、视频提示词和镜头方案；Mock 与火山方舟 Provider 已实现，等待真实密钥联调。
- `GET /api/jobs/[id]`: 查询任务状态。
- `GET|POST /api/internal/ai-worker`: 由 Vercel Cron 或独立 Worker 鉴权调用，领取并执行持久任务。
- `POST /api/provider-callback/volcengine`: 作为后续可选优化；当前 Seedance 由持久 Worker 主动查询恢复，文字和生图同步结果由任务编排器直接进入持久化阶段。
- `POST /api/admin/video-templates`: 后台保存视频模板和脚本文案。
- `POST /api/admin/music`: 后台保存音乐配置。
- `POST /api/admin/products`: 创建商品。
- `PATCH /api/admin/products/[id]`: 更新商品。
- `POST /api/admin/styles`: 创建风格模板。
- `POST /api/admin/models`: 创建模型配置。
- `POST /api/admin/team/invite`: 负责人或管理员邀请员工。
- `PATCH /api/admin/team/[id]`: 更新员工额度；只有负责人可以变更角色。
- `PATCH /api/admin/alerts/[id]`: 确认、关闭或重新打开系统告警。

## 5. AI 模型通道抽象

建议在 `/lib/ai` 下设计统一接口：

- `generateText`
- `understandImage`
- `createImageJob`
- `createVideoJob`
- `getJobStatus`
- `normalizeCallback`

业务层只调用统一接口，不直接依赖火山方舟、OpenAI、即梦、可灵或通义的具体请求格式。

AI 应用 1.0 新增火山方舟 Provider，但继续复用统一接口。默认能力路由为：

- `text_generation`、`image_understanding` → `volcengine` / Doubao-Seed-2.1-Pro。
- `text_to_image`、`image_to_image` → `volcengine` / Doubao-Seedream-5.0 完整版。
- `image_to_video`、`video_generation` → `volcengine` / Doubao-Seedance-2.0。
- `long_video_generation` → 暂不启用生产路由。

实际模型参数必须读取 `ARK_TEXT_MODEL_ID`、`ARK_IMAGE_MODEL_ID`、`ARK_VIDEO_MODEL_ID`，以火山方舟控制台中当前账号可用的完整模型 ID 为准。显示名称不能代替 API 模型 ID。

创建生成任务前，服务端需要先按任务能力解析默认模型路由：

- 文字生成：用于形象方案、提示词、脚本文案。
- 图片理解：用于客户照片、商品图和风格参考图识别。
- 文生图：未上传客户素材时生成形象图。
- 图生图：基于客户照片生成换装形象图。
- 图生视频：基于形象图生成变装短视频。
- 视频生成：用于 Doubao-Seedance-2.0 的短视频任务。
- 长视频生成：只保留后续扩展位，1.0 不启用生产路由。

本地和演示环境如果没有配置对应路由，可以回退到演示模型通道。生产环境缺少路由、模型 ID 或密钥时必须明确失败，不能返回演示结果冒充真实生成。

## 6. 回调与异步任务

生图和视频生成通常不是同步完成，必须按异步任务设计：

1. 先创建 `ai_jobs` 与 `ai_job_runtime`，再向浏览器返回任务 ID。
2. Worker 使用 `claim_ai_jobs`、行锁和租约原子领取任务。
3. 调用第三方模型并先保存第三方任务 ID或临时结果 URL。
4. 异步模型等待回调或由 Worker 轮询；同步模型直接进入转存阶段。
5. 下载结果并转存 Supabase Storage，使用 `source_key` 保证幂等。
6. 更新状态、事件、输出素材和完成时间；失败按退避策略重试。
7. 服务重启后，租约过期的非终态任务由下一次 Worker 调用恢复。

真实任务必须通过数据库函数 `enqueue_ai_job` 原子完成额度检查与任务创建，避免用户同时点击时绕过月度额度或并发上限。浏览器角色不能直接执行该函数，只允许服务端 Service Role 调用。

Worker 每次运行后调用 `refresh_ai_job_system_alerts`，把超过 15 分钟未更新的真实任务标记为卡住告警，并自动关闭已经恢复的告警。任务状态触发器会为最终失败任务建立告警，为成功或取消任务关闭相关告警。`get_operations_overview` 在数据库端聚合近 30 天任务量、成功率、平均耗时、模型通道表现和失败原因，避免浏览器读取全部任务后再统计。

火山方舟不同模型可能采用同步响应、异步任务、轮询或回调中的一种或多种形式。Provider 层负责把差异归一化：

- 文字与图片理解的同步结果也要落入统一任务/审计记录。
- 图片和视频生成返回第三方任务 ID 时，写入 `provider_job_id`。
- 只实现控制台和官方文档明确支持的查询或回调方式，不假设三个模型共用同一任务接口。
- 轮询必须设置超时、最大次数和退避策略；重复请求和回调需要幂等。
- 第三方临时 URL 必须在有效期内下载并转存到 `generated-assets`。

## 7. 本地 MVP 兜底

未配置 Supabase 或未登录时，后端只允许本地 Mock 演示：

- `POST /api/projects` 返回 `local-...` 项目 ID，不写入数据库。
- `POST /api/upload` 对图片返回本地 `data:` 预览地址，不写入云端存储。
- 未登录或未配置 Supabase 时，`POST /api/upload` 不能写入商品、音乐或生成结果等后台素材桶。
- `POST /api/generate/image` 和 `POST /api/generate/video` 可使用 `mock` 演示模型通道返回演示任务。
- `volcengine` 等真实模型通道必须要求登录后调用，避免公开部署后被匿名请求消耗模型额度。
- `persistAiJob` 在无 Service Role Key 时跳过数据库写入，并返回清晰中文说明。

## 8. 安全与权限

- 配置 Supabase 后仍要启用 RLS。
- 普通查询只能访问自己的项目和素材。
- 本地 Mock 模式不强制登录；线上真实模型、真实项目和素材持久化必须登录。
- 后台写入接口限制为 `owner` 或 `admin`，角色变更仅允许 `owner`。
- 每个真实生成任务必须校验 `usage_limits`，额度或并发不足时返回可理解的中文提示。
- Supabase Auth 必须关闭公开注册，员工通过后台邀请加入。
- Service Role Key 只能用于服务端，不能放到 `NEXT_PUBLIC_` 环境变量。
- 服务端接口、上线检查和第三方回调只返回中文业务提示，不直接暴露数据库、存储或第三方原始错误。
