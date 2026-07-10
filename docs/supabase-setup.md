# Supabase 初始化操作说明

## 1. 需要准备

- Supabase 项目地址。
- Supabase 公开访问密钥。
- Supabase 服务端密钥。
- 一个可用于后台管理的登录邮箱。

## 2. 执行数据库脚本

在 Supabase 控制台打开 SQL Editor，按顺序执行：

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_auth_storage_and_indexes.sql`
3. `supabase/migrations/0003_model_task_routes.sql`
4. `supabase/migrations/0004_production_ai_jobs.sql`
5. `supabase/migrations/0005_production_ai_job_fields.sql`
6. `supabase/migrations/0006_durable_ai_worker.sql`
7. `supabase/migrations/0007_volcengine_video.sql`
8. `supabase/migrations/0008_team_roles_and_quotas.sql`
9. `supabase/seed/0001_seed_demo_data.sql`

也可以在本地运行以下命令，把三段 SQL 合并输出后复制到 SQL Editor：

```bash
pnpm run supabase:sql
```

生成完整交付包时也会输出数据库初始化文件：

```text
dist/daji-xingxiang-supabase-init.sql
```

创建 Supabase 项目后，可直接复制该文件全部内容到 SQL Editor 执行。

执行完成后，复制验收 SQL 到 SQL Editor，检查表、RLS、RLS 策略、存储桶配置、存储对象策略、模型通道、模型能力路由和种子数据：

```text
dist/daji-xingxiang-supabase-verify.sql
```

## 3. 脚本会创建什么

- 用户资料、项目、素材、商品、风格模板、视频模板、音乐、模型通道、模型能力路由、生成任务等数据表。
- 注册后自动创建用户资料的触发器。
- 客户素材、生成结果、商品素材、音乐素材四个存储桶。
- 存储桶公开属性、文件大小限制和 MIME 类型白名单。
- 基础行级权限策略。
- 存储对象访问策略，私有素材桶会校验 `owner_id` 或路径第一段用户 ID。
- 默认商品分类、演示商品、风格模板、视频模板、模型通道、模型能力路由和 Seedream 5.0 完整版。
- AI 后台运行表、任务租约和 `claim_ai_jobs` 原子领取函数。
- 团队角色、员工模型用量限制和带原子额度检查的任务入队函数。

## 4. 关闭公开注册

团队内测与正式上线阶段，在 Supabase 控制台进入 **Authentication → Sign In / Providers**，关闭 **Allow new users to sign up**。官方说明该开关关闭后只有已有账号可以登录；新员工由大吉形象后台的“团队权限”页面发送邀请。

应用环境同时设置：

```env
NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false
```

仅隐藏注册页面并不能阻止别人直接调用 Supabase 注册接口，因此控制台开关也必须关闭。参考 [Supabase Auth 通用配置](https://supabase.com/docs/guides/auth/general-configuration) 与 [管理员邀请员工接口](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)。

## 5. 本地检查

执行以下命令确认本地 Supabase 初始化文件齐全：

```bash
pnpm run check:supabase
```

## 6. 环境变量

将 Supabase 控制台中的值填入 `.env.local` 和 Vercel 环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

正式上线还需要：

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP=false
AI_EXECUTION_MODE=real
CRON_SECRET=
ARK_API_KEY=
ARK_TEXT_MODEL_ID=
ARK_IMAGE_MODEL_ID=
ARK_VIDEO_MODEL_ID=
```

OpenAI、即梦、可灵、通义等模型通道密钥可在对应 Provider 实现后补充；当前生产链路不使用 KIE。

## 7. 配置完成后检查

启动项目后打开：

```text
/admin/launch
```

或访问：

```http
GET /api/health
```

如果数据库、存储桶配置和模型通道都显示“已就绪”，即可进入正式部署流程。
上线后还可以在该页面核对部署平台、应用环境、线上域名、Git 分支和提交号是否与交付包一致。
