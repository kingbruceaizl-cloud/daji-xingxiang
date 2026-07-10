# 后端开发需求

## 1. 后端职责

后端负责项目数据、素材存储、商品库、AI 模型通道调用、任务状态、回调处理和后台配置。认证能力保留，但第一阶段不作为使用前置条件。

所有 AI 密钥必须只存在服务端环境变量或安全密钥服务中，不能发送到浏览器。

## 2. Supabase 资源

### Auth

- 使用 Supabase Auth 实现邮箱注册、登录、退出，作为上线和后续团队权限能力。
- MVP 第一阶段允许无登录使用本地项目；配置 Supabase 后再把真实项目写入数据库。
- 第一阶段所有登录用户都视为项目负责人。
- 后续再扩展 `profiles.role` 和多角色权限。

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
- `error_message`
- `created_at`
- `updated_at`

## 4. 服务端 API 草案

- `POST /api/upload`: 上传客户素材；商品、音乐和生成结果素材桶仅允许 `owner` 或 `admin` 写入。
- `POST /api/projects`: 创建项目。
- `GET /api/projects`: 获取项目列表。
- `GET /api/projects/[id]`: 获取项目详情。
- `POST /api/generate/image`: 创建生图任务。
- `POST /api/generate/video`: 创建视频任务。
- `GET /api/jobs/[id]`: 查询任务状态。
- `POST /api/provider-callback/kie`: 接收 KIE 回调，更新 `ai_jobs`，写入 `job_events`，并将生成结果转存到素材库。
- `POST /api/admin/video-templates`: 后台保存视频模板和脚本文案。
- `POST /api/admin/music`: 后台保存音乐配置。
- `POST /api/admin/products`: 创建商品。
- `PATCH /api/admin/products/[id]`: 更新商品。
- `POST /api/admin/styles`: 创建风格模板。
- `POST /api/admin/models`: 创建模型配置。

## 5. AI 模型通道抽象

建议在 `/lib/ai` 下设计统一接口：

- `createImageJob`
- `createVideoJob`
- `getJobStatus`
- `normalizeCallback`

业务层只调用统一接口，不直接依赖 KIE、OpenAI、即梦、可灵或通义的具体请求格式。

## 6. 回调与异步任务

生图和视频生成通常不是同步完成，必须按异步任务设计：

1. 创建本地 `ai_jobs` 记录。
2. 调用第三方模型通道。
3. 保存第三方任务 ID。
4. 等待回调或轮询。
5. 成功后下载结果并转存 Supabase 存储。
6. 更新 `ai_jobs.status` 和输出素材。

## 7. 本地 MVP 兜底

未配置 Supabase 或未登录时，后端需要允许第一阶段继续演示：

- `POST /api/projects` 返回 `local-...` 项目 ID，不写入数据库。
- `POST /api/upload` 对图片返回本地 `data:` 预览地址，不写入云端存储。
- 未登录或未配置 Supabase 时，`POST /api/upload` 不能写入商品、音乐或生成结果等后台素材桶。
- `POST /api/generate/image` 和 `POST /api/generate/video` 可使用 `mock` 演示模型通道返回演示任务。
- `kie` 等真实模型通道必须要求登录后调用，避免公开部署后被匿名请求消耗模型额度。
- `persistAiJob` 在无 Service Role Key 时跳过数据库写入，并返回清晰中文说明。

## 8. 安全与权限

- 配置 Supabase 后仍要启用 RLS。
- 普通查询只能访问自己的项目和素材。
- 第一阶段本地模式不强制登录；配置 Supabase 后，后台写入接口限制为 `owner` 或 `admin`。
- Service Role Key 只能用于服务端，不能放到 `NEXT_PUBLIC_` 环境变量。
- 服务端接口、上线检查和第三方回调只返回中文业务提示，不直接暴露数据库、存储或第三方原始错误。
