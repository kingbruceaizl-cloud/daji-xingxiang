# 内部 API 说明

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

如果已配置 `SUPABASE_SERVICE_ROLE_KEY`，接口会同时把任务写入 `ai_jobs` 表；未配置时返回演示结果，不阻塞前端体验。

匿名用户只能使用 `mock` 演示通道。`kie` 等真实模型通道需要先登录后再创建任务，避免公开部署后被匿名请求消耗模型额度。

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

如果要直接查询第三方模型通道，可带上：

```http
GET /api/jobs/:id?provider=kie
```

接口优先查 Supabase 的 `ai_jobs`；如果没有配置 Supabase，会返回演示状态。

如果任务已经有生成素材，接口会返回：

- `outputAssetIds`: 已保存的生成素材 ID。
- `outputAssets`: 生成素材列表，包含图片或视频的临时访问链接。
- `previewUrl`: 第一张生成图或视频封面的可访问链接。

`generated-assets` 是私有存储桶，任务查询接口会在服务端生成短期签名链接，不会把 Supabase Service Role Key 暴露给浏览器。

配置 Supabase 后，如果生成任务带有 `owner_id`，只有该登录账号可以读取任务详情和生成素材签名链接；没有 `owner_id` 的演示任务保持兼容读取。

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

这些接口依赖 `SUPABASE_SERVICE_ROLE_KEY`，未配置时会返回中文配置提示。
配置 Supabase 后，调用后台写入接口还需要当前登录用户在 `profiles.role` 中为 `owner` 或 `admin`。

## 当前模型通道状态

- `mock`: 已可用，用于上线前演示。
- `kie`: 已预留封装入口，等待正式密钥和请求参数确认。
- `openai`、`jimeng`、`kling`、`tongyi`: 已在数据库和文档中预留。

## 模型通道回调

```http
POST /api/provider-callback/kie
```

可选 Header：

```http
x-daji-callback-secret: <KIE_CALLBACK_SECRET>
```

回调会根据 `taskId` 匹配 `ai_jobs.provider_job_id`，将 KIE 状态同步为系统状态，并写入 `job_events`。如果回调中包含结果 URL，系统会转存到 `generated-assets`，创建 `asset_files`，并把素材 ID 写回 `ai_jobs.output_asset_ids`。未配置 Supabase 时只返回中文确认信息。
