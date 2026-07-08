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
3. `supabase/seed/0001_seed_demo_data.sql`

也可以在本地运行以下命令，把三段 SQL 合并输出后复制到 SQL Editor：

```bash
pnpm run supabase:sql
```

生成完整交付包时也会输出数据库初始化文件：

```text
dist/daji-xingxiang-supabase-init.sql
```

创建 Supabase 项目后，可直接复制该文件全部内容到 SQL Editor 执行。

执行完成后，复制验收 SQL 到 SQL Editor，检查表、RLS、存储桶、模型通道和种子数据：

```text
dist/daji-xingxiang-supabase-verify.sql
```

## 3. 脚本会创建什么

- 用户资料、项目、素材、商品、风格模板、视频模板、音乐、模型通道、生成任务等数据表。
- 注册后自动创建用户资料的触发器。
- 客户素材、生成结果、商品素材、音乐素材四个存储桶。
- 基础行级权限策略。
- 默认商品分类、演示商品、风格模板、视频模板、模型通道和 KIE 图像模型。

## 4. 本地检查

执行以下命令确认本地 Supabase 初始化文件齐全：

```bash
pnpm run check:supabase
```

## 5. 环境变量

将 Supabase 控制台中的值填入 `.env.local` 和 Vercel 环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

正式上线还需要：

```env
NEXT_PUBLIC_APP_URL=
KIE_API_KEY=
```

其他模型通道密钥可后续按需补充。

## 6. 配置完成后检查

启动项目后打开：

```text
/admin/launch
```

或访问：

```http
GET /api/health
```

如果数据库、存储桶和模型通道都显示“已就绪”，即可进入正式部署流程。
