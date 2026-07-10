# 内部 API 说明

## AI 应用 1.0 默认路由

- 文字、形象方案、提示词和图片理解：火山方舟 Doubao-Seed-2.1-Pro。
- 文生图和图生图：火山方舟 Doubao-Seedream-5.0 完整版。
- 文生视频和图生视频：火山方舟 Doubao-Seedance-2.0。
- 真实 Provider 默认要求登录；匿名用户只能使用 `mock`。

以下文字与图片理解接口已完成 Mock、持久任务和火山方舟 Responses Provider，等待真实模型密钥联调：

```http
POST /api/ai/analyze-image
POST /api/ai/appearance-plan
POST /api/ai/prompts
```

`POST /api/ai/analyze-image` 输入系统中已有的素材 ID，不允许浏览器把火山方舟密钥或供应商请求结构直接传入。接口返回人物特征、可保留特征、搭配建议、可见文字和风险提示等结构化字段。

`POST /api/ai/appearance-plan` 输入客户分析、风格、商品及人工补充要求，返回结构化中文形象方案。

`POST /api/ai/prompts` 根据操作者确认后的方案一次生成生图提示词、负向提示词、视频提示词和镜头方案。

三个接口在 `AI_EXECUTION_MODE=mock` 时同步返回固定的结构化演示结果；在 `AI_EXECUTION_MODE=real` 时先写入持久任务，由 Worker 调用火山方舟 Responses API。真实图片分析只接受已经保存到客户素材库的素材 ID，不能把任意外部图片地址直接交给生产模型。

详细约定见 `docs/api/volcengine-ark.md`。

## 生图任务

```http
POST /api/generate/image
```

请求示例：

```json
{
  "provider": "mock",
  "styleName": "新中式轻礼服",
  "selectedProducts": ["云纹缎面上衣", "珍珠耳饰素材", "空气感卷发"],
  "inputImageUrls": []
}
```

返回：

```json
{
  "ok": true,
  "job": {
    "jobId": "dj_job_xxx",
    "provider": "mock",
    "model": "mock-image-v1",
    "jobType": "text_to_image",
    "status": "succeeded",
    "message": "演示形象图已生成。",
    "previewUrl": "https://..."
  }
}
```

真实通道会先把任务写入 `ai_jobs` 和仅服务端可读的 `ai_job_runtime`，随后返回 HTTP `202`。后台 Worker 领取任务、调用模型并转存结果，浏览器刷新或关闭不会中止任务。未配置 Supabase 时只允许 `mock` 演示结果。

匿名用户只能使用 `mock` 演示通道。`volcengine` 等真实模型通道需要先登录后再创建任务，避免公开部署后被匿名请求消耗模型额度。

## 视频任务

```http
POST /api/generate/video
```

请求示例：

```json
{
  "provider": "mock",
  "styleName": "短视频变装",
  "selectedProducts": ["云纹缎面上衣", "珍珠耳饰素材"],
  "inputImageUrls": ["https://example.com/generated-image.png"]
}
```

## 任务查询

```http
GET /api/jobs/:id
```

接口只接受本系统生成的本地 UUID，不接受第三方任务 ID，也不允许浏览器指定 Provider 绕过本地权限。服务端先校验任务归属，再读取 Supabase 中的持久状态。

如果任务已经有生成素材，接口会返回：

- `outputAssetIds`: 已保存的生成素材 ID。
- `outputAssets`: 生成素材列表，包含图片或视频的临时访问链接。
- `previewUrl`: 第一张生成图或视频封面的可访问链接。

`generated-assets` 是私有存储桶，任务查询接口会在服务端生成短期签名链接，不会把 Supabase Service Role Key 暴露给浏览器。

配置 Supabase 后，只有任务所属登录账号可以读取任务详情和生成素材签名链接；数据库中的无归属任务不会向匿名用户开放。

## 后台任务 Worker

```http
GET /api/internal/ai-worker
POST /api/internal/ai-worker
Authorization: Bearer <CRON_SECRET>
```

- Vercel Cron 每分钟调用一次；生成接口也会在响应后尝试立即唤醒。
- Worker 使用数据库行锁与租约原子领取任务，避免多个实例重复处理。
- 供应商结果 URL 仅保存在不向浏览器开放的 `ai_job_runtime`，转存完成后前端只读取 Supabase Storage 签名链接。
- 失败任务按 15 秒、60 秒、5 分钟退避重试；服务重启后由过期租约恢复。
- `AI_WORKER_SECRET` 可供独立 Worker 使用；未配置时复用 `CRON_SECRET`。

## 商品与模板目录

```http
GET /api/catalog
```

## 项目列表与创建

```http
GET /api/projects
POST /api/projects
GET /api/projects/:id
```

创建项目请求示例：

```json
{
  "name": "张女士｜新中式宴会形象",
  "customerName": "张女士",
  "notes": "用于宴会形象设计"
}
```

项目详情接口会返回：

- `project`: 项目基础信息。
- `assets`: 项目素材摘要，包含客户素材和生成结果。
- `jobs`: 生成任务摘要，包含模型、状态、提示词和更新时间。

未配置 Supabase 或未登录时，详情接口会返回演示项目数据，保证项目详情页可预览。

## 素材上传

```http
POST /api/upload
```

表单字段：

- `file`: 文件
- `bucket`: `customer-assets`、`generated-assets`、`product-assets` 或 `music-assets`
- `projectId`: 可选项目 ID

权限规则：

- 普通登录用户只能上传 `customer-assets` 客户素材。
- `product-assets`、`music-assets` 和 `generated-assets` 属于后台素材目录，只允许 `owner` 或 `admin` 上传。
- AI 回调产生的结果通常由服务端直接转存到 `generated-assets`，不建议前端直接写入。

文件规则：

- `customer-assets`: 支持 JPG、PNG、WebP、MP4、MOV，最大 100MB。
- `generated-assets`: 支持 JPG、PNG、WebP、MP4，最大 500MB。
- `product-assets`: 支持 JPG、PNG、WebP，最大 50MB。
- `music-assets`: 支持 MP3、M4A、WAV，最大 50MB。
- 服务端会先校验文件类型和大小，再读取文件内容或写入存储。

未配置 Supabase 或未登录时，接口会返回中文提示，不会写入真实存储。

## 后台管理

### 创建商品

```http
POST /api/admin/products
```

```json
{
  "name": "云纹缎面上衣",
  "type": "sku",
  "categoryName": "服装",
  "sku": "DJ-CL-001",
  "price": 399,
  "imageUrl": "https://example.com/product.jpg",
  "promptText": "新中式云纹缎面上衣",
  "tags": "新中式,宴会,真实商品"
}
```

### 创建风格模板

```http
POST /api/admin/styles
```

### 创建模型配置

```http
POST /api/admin/models
```

示例：

```json
{
  "provider": "volcengine",
  "providerDisplayName": "火山方舟（豆包）",
  "name": "从 ARK_IMAGE_MODEL_ID 读取的完整模型 ID",
  "displayName": "Doubao-Seedream-5.0 完整版",
  "capabilities": "image_to_image",
  "defaultParams": {
    "aspectRatio": "auto",
    "quality": "high"
  },
  "taskRoutes": [
    {
      "taskKey": "image_to_image",
      "displayName": "图生图",
      "description": "基于客户照片生成换装形象图",
      "isActive": true
    }
  ]
}
```

`taskRoutes` 用于配置任务能力路由。工作台默认使用后台自动路由；如果没有配置对应路由，服务端会回退到演示通道。

这些接口依赖 `SUPABASE_SERVICE_ROLE_KEY`，未配置时会返回中文配置提示。
配置 Supabase 后，调用后台写入接口还需要当前登录用户在 `profiles.role` 中为 `owner` 或 `admin`。

## 当前模型通道状态

- `mock`: 已可用，用于上线前演示。
- `volcengine`: 已实现 Seedream 5.0 文生图、图生图、后台任务持久化和结果转存；等待真实密钥联调。
- `openai`、`jimeng`、`kling`、`tongyi`: 已在数据库和文档中预留。
