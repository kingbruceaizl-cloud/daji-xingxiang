# API 文档目录

这里存放第三方 API 文档、接口约定和环境变量说明。

## 当前计划接入

- KIE：第一批图像和视频生成候选。
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
KIE_API_KEY=
KIE_CALLBACK_SECRET=
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
