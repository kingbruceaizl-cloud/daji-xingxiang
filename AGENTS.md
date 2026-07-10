# 大吉形象项目协作规则

## 项目定位

这是一个基于 Next.js + Supabase 的 AI 形象设计产品。

MVP 第一阶段只做“形象大师无画布版”，面向形象顾问或内部运营人员，核心流程是：上传客户素材、选择形象商品/风格、生成形象图片、生成变装短视频、后续扩展长视频。

Lovart 只作为交互结构参考，不复刻品牌。项目品牌统一为“大吉形象”。

## 抽象任务处理规则

当用户给出的任务比较抽象、模糊或跨度较大时，不要直接开始执行。先做下面三件事：

1. 将用户原始需求重写成更清晰、更适合 AI 执行的任务指令。
2. 列出你对需求的理解、默认判断和需要用户定夺的问题。
3. 只有在用户确认后，再进入初始化、改代码、接 API 或实现页面。

如果有可以直接决定且风险较低的部分，可以明确写为“默认决定”，不要反复追问。

## 当前已确认的产品决策

- MVP 先做形象大师无画布版。
- Lovart 只参考交互结构，品牌完全使用“大吉形象”。
- AI 应用 1.0 默认直连火山方舟：Doubao-Seed-2.1-Pro 负责文字与图片理解，Doubao-Seedream-5.0 完整版负责生图，Doubao-Seedance-2.0 负责生视频。
- KIE 不进入正式调用链路。AI 模型架构继续保留 Provider 抽象，预留 OpenAI、即梦、可灵、通义等多模型；豆包是 1.0 默认生产方案，不把业务代码写死到单一供应商。
- 商品库同时支持真实可售 SKU 和形象搭配素材。
- 长视频参考暂未确定，先只保留扩展位。
- 暂不做支付、积分、额度系统。
- 客户上传真人图片/视频暂不做授权确认流程。
- 后台第一阶段只给项目负责人自己使用，后续扩展多员工、多角色权限。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Row Level Security
- 火山方舟 API 作为 AI 应用 1.0 的默认生产模型通道
- Mock 只用于开发和流程演示，正式环境不能自动降级到 Mock
- React Flow 仅作为未来画布版预留，不在 MVP 首屏流程中实现

## AI 应用 1.0 模型分工

- `Doubao-Seed-2.1-Pro`：需求分析、形象方案、文案、提示词、分镜、图片理解和图片转文字。
- `Doubao-Seedream-5.0` 完整版：文生图、图生图、多参考图生成，以及模型支持范围内的图片编辑。
- `Doubao-Seedance-2.0`：文生视频、图生视频和人物变装短视频。
- 内部 Provider 标识统一使用 `volcengine`，前端中文名称统一显示为“火山方舟（豆包）”。
- 展示名称与实际 API 模型 ID 分开管理。代码和文档不猜测版本号，实际调用使用火山方舟控制台中当前账号可用的完整模型 ID，并通过服务端环境变量配置。
- 长视频仍只保留扩展位，不把它路由到 Seedance 2.0 的 MVP 短视频流程。
- 详细接入约定见 `/docs/api/volcengine-ark.md`。

默认处理链路：客户素材与需求 → Doubao-Seed-2.1-Pro 分析并生成结构化方案 → Doubao-Seedream-5.0 完整版生成形象图片 → Doubao-Seed-2.1-Pro 基于选中图片生成视频提示词 → Doubao-Seedance-2.0 生成变装短视频 → 转存 Supabase Storage。

## 目录约定

- `/app`: Next.js 路由、页面和服务端入口
- `/components`: 可复用 UI 组件
- `/lib`: 工具函数、服务端 SDK、AI Provider 抽象
- `/docs/prd.md`: 产品需求与范围
- `/docs/frontend-requirements.md`: 前端开发需求
- `/docs/backend-requirements.md`: 后端开发需求
- `/docs/api`: 第三方 API 文档、接口约定和环境变量说明
- `/docs/images`: 参考截图、流程图、界面参考

## 开发规范

- 优先沿用模板已有结构和 shadcn/radix/Tailwind 风格。
- 不要把火山方舟、OpenAI、即梦、可灵、通义等密钥暴露给前端。
- 所有第三方生成请求必须从服务端发起。
- 图片和视频生成结果要转存到 Supabase Storage，不能长期依赖第三方临时 URL。
- 涉及用户数据、素材、商品、任务记录的表必须考虑 RLS。
- 第一阶段不实现复杂画布，不引入 React Flow 页面逻辑，除非用户再次确认。
- 新功能应先写入 docs，再实现代码。

## 验证命令

常用本地命令：

```bash
pnpm run dev
pnpm run lint
pnpm run build
```

启动后默认访问：

```text
http://localhost:3000
```
