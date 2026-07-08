# 大吉形象项目协作规则

## 项目定位

这是一个基于 Next.js + Supabase 的 AI 形象设计产品。

MVP 第一阶段只做“形象大师无画布版”，面向形象顾问或内部运营人员，核心流程是：上传客户素材、选择形象商品/风格、生成形象图片、生成变装短视频、后续扩展成长视频。

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
- AI 模型架构要预留 OpenAI、即梦、可灵、通义、KIE 等多模型。
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
- KIE API 作为第一批 AI 生成能力候选
- React Flow 仅作为未来画布版预留，不在 MVP 首屏流程中实现

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
- 不要把 KIE、OpenAI、即梦、可灵、通义等密钥暴露给前端。
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
