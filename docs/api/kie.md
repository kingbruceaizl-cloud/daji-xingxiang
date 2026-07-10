# KIE 历史接入说明

> 状态说明：项目已确认不使用 KIE。本文件仅保留历史实现背景，KIE 不进入模型路由、环境变量、上线检查或正式调用链路。正式方案见 `docs/api/volcengine-ark.md`。

## 参考文档

根据用户提供的参考图，优先整理以下 KIE 文档：

- https://docs.kie.ai/market/google/nanobanana2
- https://docs.kie.ai/market/gpt/gpt-image-2-text-to-image
- https://docs.kie.ai/market/gpt/gpt-image-2-image-to-image

## 对接原则

- 前端不直接调用 KIE。
- 所有 KIE 请求从 Next.js 服务端 API 发起。
- KIE 任务 ID 要保存到 `ai_jobs.provider_job_id`。
- KIE 返回的临时结果 URL 要下载后转存到 Supabase 存储。
- 回调接口必须校验签名或自定义密钥。

## 能力映射

### 文生图

用于根据风格模板和商品提示词生成形象概念图。

统一业务接口：

```ts
createImageJob({
  provider: "kie",
  model: "gpt-image-2-text-to-image",
  prompt,
  aspectRatio,
  callbackUrl,
})
```

### 图生图

用于基于客户照片和商品/风格生成变装形象图。

统一业务接口：

```ts
createImageJob({
  provider: "kie",
  model: "gpt-image-2-image-to-image",
  prompt,
  inputImageUrls,
  aspectRatio,
  callbackUrl,
})
```

### KIE 视频生成预留

KIE Provider 自身的视频模型仍待确认；平台 AI 应用 1.0 的变装短视频默认由 Doubao-Seedance-2.0 负责。

## 待补充

- 请求 URL
- 请求 Header
- 请求参数
- 回调参数
- 失败码
- 计费和并发限制
- 结果 URL 有效期

## 当前已预留接口

项目已提供 KIE 回调入口：

```http
POST /api/provider-callback/kie
```

如果配置了 `KIE_CALLBACK_SECRET`，请求需要携带：

```http
x-daji-callback-secret: <KIE_CALLBACK_SECRET>
```

当前回调接口会校验 `KIE_CALLBACK_SECRET`，解析 `taskId`、`state`、`resultJson`，并在配置 Supabase Service Role Key 后更新 `ai_jobs` 与 `job_events`。如果回调包含结果 URL，系统会下载结果并转存到 Supabase `generated-assets` 存储桶，创建 `asset_files` 记录，再把素材 ID 写回 `ai_jobs.output_asset_ids`。未配置 Supabase 时会返回中文确认信息，不阻塞 KIE 回调。

结果转存规则：

- 图片任务保存为 `generated_image`。
- 视频任务保存为 `generated_video`。
- 原始第三方结果 URL 记录在素材 `metadata.sourceUrl` 中。
- 转存失败不会阻断任务状态更新，会在回调响应和任务事件中记录转存失败信息，便于后台排查。
- 前端通过 `GET /api/jobs/:id` 获取生成结果，接口会为私有素材生成短期访问链接。

状态映射：

- `waiting`、`queuing`: `queued`
- `generating`: `running`
- `success`: `succeeded`
- `fail`: `failed`

回调示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_gptimage_xxx",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://example.com/generated.jpg\"]}"
  }
}
```

## 已实现的 KIE 调用

项目已按 KIE 文档预留并实现：

- 创建任务：`POST https://api.kie.ai/api/v1/jobs/createTask`
- 查询任务：`GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...`

环境变量：

```env
KIE_BASE_URL=https://api.kie.ai
KIE_API_KEY=
KIE_CALLBACK_SECRET=
```

当前已接入的模型：

- `gpt-image-2-text-to-image`
- `gpt-image-2-image-to-image`

视频模型仍保留配置位，等确认具体 KIE 视频模型文档后接入。
