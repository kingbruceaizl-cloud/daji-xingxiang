# 火山方舟（豆包）AI 应用 1.0 接入约定

## 1. 状态

- 产品方案：已确认。
- 文档基线：本文件是 1.0 的默认模型接入依据。
- 代码接入：Doubao-Seed-2.1-Pro 文字/图片理解、Seedream 5.0 文生图/图生图、Seedance 2.0 异步视频、持久任务 Worker 和结果转存均已实现，等待真实密钥与真人素材规则联调；`mock` 仅用于开发演示。
- 内部 Provider 标识：`volcengine`。
- 前端中文名称：火山方舟（豆包）。

## 2. 官方资料

- Doubao-Seed-2.1-Pro：https://docs.volcengine.com/docs/82379/1585128?lang=zh
- Seedream 5.0 图片生成教程：https://www.volcengine.com/docs/82379/1824121?lang=zh
- Doubao-Seedance-2.0：https://console.volcengine.com/ark/region:cn-beijing/model/detail?Id=doubao-seedance-2-0
- 火山方舟模型列表：https://www.volcengine.com/docs/82379/1330310?lang=zh
- Responses API：https://www.volcengine.com/docs/82379/1569618?lang=zh
- 图片生成 API：https://www.volcengine.com/docs/82379/1541523?lang=zh
- 创建视频生成任务：https://www.volcengine.com/docs/82379/1520757?lang=zh
- 查询视频生成任务：https://www.volcengine.com/docs/82379/1521309?lang=zh
- 取消或删除视频生成任务：https://www.volcengine.com/docs/82379/1521720?lang=zh
- Doubao Seedance 2.0 提示词指南：https://www.volcengine.com/docs/82379/2222480?lang=zh
- Seedance 2.0 真人人像与可信素材库：https://www.volcengine.com/docs/82379/2315856?lang=zh

用户提供的 `1585128` 页面是“迁移至 Responses API”，不是 Doubao-Seed-2.1-Pro 的模型专属接口页。控制台页面可能要求登录。正式开发前，仍必须在项目实际使用的火山引擎账号中打开“快速 API 接入”，核准模型是否已开通、完整模型 ID、地域、请求地址、配额、计费、并发、参数和返回结构。

## 3. 1.0 能力映射

| 任务能力 | 默认模型展示名 | 2026-07-10 官方模型 ID | 模型 ID 环境变量 | 主要用途 |
| --- | --- | --- | --- | --- |
| `text_generation` | Doubao-Seed-2.1-Pro | `doubao-seed-2-1-pro-260628` | `ARK_TEXT_MODEL_ID` | 需求分析、形象方案、文案、生图提示词、视频提示词和分镜 |
| `image_understanding` | Doubao-Seed-2.1-Pro | `doubao-seed-2-1-pro-260628` | `ARK_TEXT_MODEL_ID` | 客户图片、商品图和参考图理解；图片描述与图片转文字 |
| `text_to_image` | Doubao-Seedream-5.0 完整版 | `doubao-seedream-5-0-260128` | `ARK_IMAGE_MODEL_ID` | 无客户参考图时生成形象图 |
| `image_to_image` | Doubao-Seedream-5.0 完整版 | `doubao-seedream-5-0-260128` | `ARK_IMAGE_MODEL_ID` | 根据客户照片、商品图和风格参考图生成形象图 |
| `image_to_video` | Doubao-Seedance-2.0 | `doubao-seedance-2-0-260128` | `ARK_VIDEO_MODEL_ID` | 根据已确认形象图生成变装短视频 |
| `video_generation` | Doubao-Seedance-2.0 | `doubao-seedance-2-0-260128` | `ARK_VIDEO_MODEL_ID` | 根据脚本、提示词和参考素材生成短视频 |
| `long_video_generation` | 暂不配置 | 无 | 无 | 只保留未来扩展位 |

展示名称只用于界面与文档。请求参数中的 `model` 必须取对应环境变量，使用控制台给出的完整模型 ID；不要根据展示名称自行拼接版本号。

## 4. 环境变量约定

```env
# 火山方舟服务端配置。密钥和值不得使用 NEXT_PUBLIC_ 前缀。
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=

# 从当前账号的火山方舟控制台复制完整模型 ID。
ARK_IMAGE_MODEL_ID=doubao-seedream-5-0-260128
ARK_TEXT_MODEL_ID=
ARK_VIDEO_MODEL_ID=
CRON_SECRET=
AI_WORKER_SECRET=
AI_WORKER_BATCH_SIZE=1
```

要求：

- 所有变量只在 Next.js 服务端读取。
- `ARK_BASE_URL` 是当前项目的配置默认值；如果控制台示例对某类能力给出不同地址，以官方“快速 API 接入”为准，并在 Provider 内按能力配置。
- `.env.local` 和生产环境变量不能提交到 Git。
- 日志、错误响应、任务请求快照和后台页面不能包含 `ARK_API_KEY` 或完整鉴权 Header。
- 前端不能直接调用火山方舟，也不能接收密钥。
- Worker 密钥只能用于服务端 Cron 或独立 Worker，不能进入浏览器代码。

## 5. 已核对的调用形态

| 能力 | 调用形态 | 处理要求 |
| --- | --- | --- |
| Doubao-Seed-2.1-Pro | `POST /api/v3/responses`；同步返回，可选 SSE 流式；兼容 Chat API | 1.0 优先采用 Responses API，服务端解析结构化结果 |
| Doubao-Seedream-5.0 完整版 | `POST /api/v3/images/generations`；默认同步返回，可选流式 | 处理 URL 或 Base64；第三方 URL 只作临时输入，立即转存 |
| Doubao-Seedance-2.0 | `POST /api/v3/contents/generations/tasks` 创建异步任务 | 保存任务 ID，通过回调或查询恢复状态 |
| Seedance 查询 | `GET /api/v3/contents/generations/tasks/{id}` | 读取统一状态和成功结果中的视频 URL |
| Seedance 取消/删除 | `DELETE /api/v3/contents/generations/tasks/{id}` | 供应商 `cancelled` 映射为系统 `canceled` |

当前 Worker 以查询接口作为可靠恢复路径。后台“取消”先停止大吉形象继续轮询；在正式开放视频取消前，还需要用目标账号验证供应商删除接口对“取消未完成任务”和“删除已完成任务”的差异，不能把本地取消描述成供应商已停止计费。

## 6. 统一业务流程

```text
客户素材与目标
→ Doubao-Seed-2.1-Pro 图片理解与需求分析
→ 生成结构化形象方案
→ 生成并优化生图提示词
→ Doubao-Seedream-5.0 完整版生成形象图片
→ 操作者选择满意图片
→ Doubao-Seed-2.1-Pro 生成视频提示词与镜头方案
→ Doubao-Seedance-2.0 生成变装短视频
→ 转存 Supabase Storage
→ 保存任务、参数、模型版本和结果素材关联
```

## 7. Provider 归一化要求

火山方舟 Provider 要复用 `/lib/ai` 的统一模型路由，不让页面和业务 API 直接依赖供应商请求格式。

Provider 至少需要处理：

- 文字与图片理解：接收文字、图片 URL 和结构化输出要求，返回可解析的中文结果。
- 图片生成：接收提示词、参考图片、比例和质量参数，返回同步结果或供应商任务 ID。
- 视频生成：接收提示词、参考图片、比例、时长及模型支持的音频参数，返回供应商任务 ID。
- 状态归一化：统一转换为 `queued`、`running`、`succeeded`、`failed`、`canceled`；供应商的 `cancelled` 等拼写映射为系统的 `canceled`。
- 错误归一化：区分鉴权失败、参数错误、限流、内容审核、超时、供应商故障和结果转存失败，对前端只返回安全中文提示。
- 幂等：重复提交、轮询或回调不能生成重复素材记录。

不得假设文字、生图和生视频共用完全相同的创建任务、查询或回调协议。每种能力都要以对应官方页面和当前控制台示例为准。

## 8. 任务与数据记录

每次真实调用至少记录：

- 项目与操作者。
- 内部 Provider：`volcengine`。
- 模型展示名与实际完整模型 ID。
- 任务能力、提示词版本和最终请求参数。
- 输入素材 ID；原始图片 URL 只在服务端短期使用。
- 第三方任务 ID、统一状态、重试次数和时间戳。
- 安全处理后的错误分类与错误信息。
- 输出素材 ID 和 Supabase Storage 路径。

不要把密钥、鉴权 Header、客户素材二进制或不必要的供应商原始响应写入日志。

## 9. 结果转存

- 第三方返回的图片和视频 URL 一律视为临时地址。
- 任务成功后立即由服务端下载，校验响应状态、内容类型、文件大小和允许的下载域名，再写入 `generated-assets`。
- 创建 `asset_files` 记录，并把素材 ID 写入 `ai_jobs.output_asset_ids`。
- 前端只使用系统生成的短期签名链接访问私有生成素材。
- 转存失败要单独记录，不能把第三方临时 URL 当作永久结果。

## 10. 接入前必须核准

- 三个模型在目标账号和 `cn-beijing` 地域是否可用。
- 三个完整模型 ID 和是否需要创建推理接入点。
- 文字/多模态请求协议与结构化输出能力。
- Seedream 的参考图数量、支持尺寸、输出格式、同步/异步模式和结果 URL 有效期。
- Seedance 的参考素材形式、比例、时长、分辨率、音频能力、查询接口和超时范围。
- 使用客户真人素材生成视频时，目标账号是否强制要求可信素材入库、真人认证或 Asset ID。
- 限流、并发、单次费用、内容安全错误码和重试建议。

以上信息没有从控制台核准前，不在代码中猜测默认参数。

项目目前“不自建真人授权确认流程”的决定继续保留，但这不代表可以绕过火山方舟自身的真人认证或可信素材规则。如果目标账号的 Seedance 2.0 调用要求先取得授权 Asset ID，1.0 必须复用火山方舟的合规入库流程，或者重新确认视频功能范围，不能直接拿普通上传 URL 绕过限制。

## 11. 验收标准

- 文字分析和形象方案能从服务端真实调用并返回结构化中文结果。
- 图片理解能处理客户照片，并生成可编辑的图片转文字结果。
- 文生图和图生图至少各完成一次真实测试。
- 选定形象图后能生成变装短视频，并能持续查询任务状态。
- 所有真实通道调用要求登录；匿名用户只能使用 `mock`。
- 浏览器请求、页面、日志和构建产物中没有火山方舟密钥。
- 图片和视频均已转存 Supabase Storage，不依赖第三方临时 URL。
- 任务记录包含模型 ID、参数、状态、错误和输出素材关联。
- `pnpm run lint` 与 `pnpm run build` 通过。
