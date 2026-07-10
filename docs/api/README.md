# API 文档目录

这里存放第三方 API 文档、接口约定和环境变量说明。

## AI 应用 1.0 默认接入

- 火山方舟（豆包）：已确认为 1.0 默认生产模型通道，接入约定见 `docs/api/volcengine-ark.md`。
- Doubao-Seed-2.1-Pro：文字、方案、提示词、图片理解和图片转文字。
- Doubao-Seedream-5.0 完整版：文生图和图生图。
- Doubao-Seedance-2.0：文生视频、图生视频和变装短视频。

## 兼容与预留通道

- OpenAI：预留文案、生图、多模态能力。
- 即梦：预留图像/视频生成能力。
- 可灵：预留视频生成能力。
- 通义：预留图像/视频/文案能力。

## 内部接口

服务端内部 API 见：

- `docs/api/internal.md`

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_EXECUTION_MODE=mock
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=
ARK_TEXT_MODEL_ID=
ARK_IMAGE_MODEL_ID=doubao-seedream-5-0-260128
ARK_VIDEO_MODEL_ID=
OPENAI_API_KEY=
JIMENG_API_KEY=
KLING_API_KEY=
TONGYI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

说明：

- `NEXT_PUBLIC_` 开头的变量会暴露给前端，只能放公开配置。
- 所有模型通道密钥必须只在服务端读取。
- 回调密钥用于校验第三方回调是否可信。
