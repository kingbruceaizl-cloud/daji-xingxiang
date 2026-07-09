# 数据库与存储配置

## 迁移文件

项目已提供 Supabase SQL 迁移：

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_auth_storage_and_indexes.sql`
- `supabase/seed/0001_seed_demo_data.sql`

迁移包含：

- 用户资料
- 项目
- 素材文件
- 商品分类
- 商品库
- 风格模板
- 视频模板
- 脚本模板
- 音乐库
- AI 模型通道
- AI 模型
- 生成任务
- 任务事件
- 基础 RLS 权限
- 注册后自动创建用户资料
- 存储桶
- 存储对象访问策略
- 存储桶公开属性、文件大小限制和 MIME 类型白名单
- 私有素材桶 `owner_id` 与用户路径归属校验
- 常用索引

音乐库包含 `usage_note` 使用场景说明，便于运营在生成短视频时选择合适的情绪和节奏。

AI 生成结果会先转存到 `generated-assets`，再写入 `asset_files`，并通过 `ai_jobs.output_asset_ids` 关联到对应生成任务。

## 存储桶

上线前建议在 Supabase 存储中创建：

- `customer-assets`
- `generated-assets`
- `product-assets`
- `music-assets`

## 执行方式

在 Supabase SQL Editor 中依次执行：

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_auth_storage_and_indexes.sql`
3. `supabase/seed/0001_seed_demo_data.sql`

如果后续使用 Supabase CLI，可以改为：

```bash
supabase db push
```

也可以运行以下命令合并输出完整初始化 SQL，再复制到 Supabase SQL Editor：

```bash
pnpm run supabase:sql
```

生成交付包后，还可以使用 `dist/daji-xingxiang-supabase-verify.sql` 在 Supabase SQL Editor 中验收真实项目，检查数据表、RLS、RLS 策略、存储桶配置、存储对象策略、模型通道和种子数据。

本地文件完整性检查：

```bash
pnpm run check:supabase
```

## 权限说明

第一阶段后台默认只有项目负责人使用，但表结构已预留：

- `owner`
- `admin`
- `staff`

后续可以增加后台管理策略，让 `admin` 管理商品库和模型配置，让 `staff` 只能创建客户形象项目。
