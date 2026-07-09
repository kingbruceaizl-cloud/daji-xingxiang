import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(distDir, "daji-xingxiang-supabase-verify.sql");

console.log("大吉形象 Supabase 验收 SQL 生成");
console.log("--------------------------------");

const requiredTables = [
  "profiles",
  "projects",
  "asset_files",
  "product_categories",
  "products",
  "style_presets",
  "video_templates",
  "script_templates",
  "music_tracks",
  "ai_providers",
  "ai_models",
  "ai_jobs",
  "job_events",
];

const requiredBucketSettings = [
  {
    name: "customer-assets",
    public: false,
    fileSizeLimit: 104857600,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
  },
  {
    name: "generated-assets",
    public: false,
    fileSizeLimit: 524288000,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
  },
  {
    name: "product-assets",
    public: true,
    fileSizeLimit: 52428800,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: "music-assets",
    public: false,
    fileSizeLimit: 52428800,
    mimeTypes: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"],
  },
];

const requiredProviders = ["kie", "openai", "jimeng", "kling", "tongyi"];

const requiredStoragePolicies = [
  "用户可读取自己的客户素材",
  "用户可上传自己的客户素材",
  "用户可更新自己的客户素材",
  "用户可删除自己的客户素材",
  "公开读取商品素材",
];

function valuesList(values) {
  return values.map((value) => `    ('${value}')`).join(",\n");
}

function sqlArray(values) {
  return `array[${values.map((value) => `'${value}'`).join(", ")}]::text[]`;
}

function bucketValuesList(values) {
  return values
    .map(
      (value) =>
        `    ('${value.name}', ${value.public}, ${value.fileSizeLimit}, ${sqlArray(value.mimeTypes)})`,
    )
    .join(",\n");
}

const sql = `-- 大吉形象 Supabase 初始化验收 SQL
-- 使用方式：执行 dist/daji-xingxiang-supabase-init.sql 后，将本文件全部复制到 Supabase SQL Editor 运行。
-- 该脚本只读取结构和数量，不输出任何密钥。

with expected_tables(name) as (
  values
${valuesList(requiredTables)}
),
expected_buckets(name, expected_public, expected_file_size_limit, expected_mime_types) as (
  values
${bucketValuesList(requiredBucketSettings)}
),
expected_providers(name) as (
  values
${valuesList(requiredProviders)}
),
expected_storage_policies(name) as (
  values
${valuesList(requiredStoragePolicies)}
),
table_checks as (
  select
    '数据表'::text as check_group,
    name as check_item,
    case when to_regclass('public.' || name) is not null then '通过' else '未通过' end as result,
    case when to_regclass('public.' || name) is not null then '已创建' else '缺失' end as current_value,
    '重新执行 Supabase 初始化 SQL。'::text as suggestion
  from expected_tables
),
rls_checks as (
  select
    'RLS'::text as check_group,
    expected_tables.name as check_item,
    case when coalesce(pg_class.relrowsecurity, false) then '通过' else '未通过' end as result,
    case when coalesce(pg_class.relrowsecurity, false) then '已开启' else '未开启或表缺失' end as current_value,
    '确认初始化 SQL 中的 alter table enable row level security 已执行。'::text as suggestion
  from expected_tables
  left join pg_class on pg_class.oid = to_regclass('public.' || expected_tables.name)
),
table_policy_checks as (
  select
    'RLS 策略'::text as check_group,
    expected_tables.name as check_item,
    case when count(pg_policies.policyname) > 0 then '通过' else '未通过' end as result,
    count(pg_policies.policyname)::text as current_value,
    '确认初始化 SQL 中的 create policy 已执行。'::text as suggestion
  from expected_tables
  left join pg_policies
    on pg_policies.schemaname = 'public'
    and pg_policies.tablename = expected_tables.name
  group by expected_tables.name
),
bucket_checks as (
  select
    '存储桶'::text as check_group,
    expected_buckets.name as check_item,
    case when storage.buckets.id is not null
      and storage.buckets.public = expected_buckets.expected_public
      and storage.buckets.file_size_limit = expected_buckets.expected_file_size_limit
      and expected_buckets.expected_mime_types <@ coalesce(storage.buckets.allowed_mime_types, array[]::text[])
    then '通过' else '未通过' end as result,
    concat_ws(
      '；',
      '存在=' || case when storage.buckets.id is null then '否' else '是' end,
      '公开=' || coalesce(storage.buckets.public::text, '缺失'),
      '大小=' || coalesce(storage.buckets.file_size_limit::text, '缺失'),
      'MIME=' || coalesce(array_to_string(storage.buckets.allowed_mime_types, ','), '缺失')
    ) as current_value,
    '重新执行存储桶初始化 SQL，确认公开属性、大小限制和 MIME 白名单正确。'::text as suggestion
  from expected_buckets
  left join storage.buckets on storage.buckets.id = expected_buckets.name
),
storage_policy_checks as (
  select
    '存储策略'::text as check_group,
    expected_storage_policies.name as check_item,
    case when pg_policies.policyname is not null then '通过' else '未通过' end as result,
    coalesce(pg_policies.cmd || ' / ' || pg_policies.roles::text, '缺失') as current_value,
    '重新执行存储对象 RLS 策略，确认 storage.objects 访问规则存在。'::text as suggestion
  from expected_storage_policies
  left join pg_policies
    on pg_policies.schemaname = 'storage'
    and pg_policies.tablename = 'objects'
    and pg_policies.policyname = expected_storage_policies.name
),
storage_owner_policy_checks as (
  select
    '存储策略'::text as check_group,
    '私有桶归属校验使用 owner_id 与用户路径'::text as check_item,
    case when count(*) filter (
      where (
        coalesce(pg_policies.qual, '') || coalesce(pg_policies.with_check, '')
      ) like '%owner_id%'
      and (
        coalesce(pg_policies.qual, '') || coalesce(pg_policies.with_check, '')
      ) like '%storage.foldername%'
    ) >= 4 then '通过' else '未通过' end as result,
    count(*) filter (
      where (
        coalesce(pg_policies.qual, '') || coalesce(pg_policies.with_check, '')
      ) like '%owner_id%'
      and (
        coalesce(pg_policies.qual, '') || coalesce(pg_policies.with_check, '')
      ) like '%storage.foldername%'
    )::text as current_value,
    '私有素材桶的 select、insert、update、delete 策略都应校验 owner_id 或路径第一段用户 ID。'::text as suggestion
  from pg_policies
  where pg_policies.schemaname = 'storage'
    and pg_policies.tablename = 'objects'
    and pg_policies.policyname in (
      '用户可读取自己的客户素材',
      '用户可上传自己的客户素材',
      '用户可更新自己的客户素材',
      '用户可删除自己的客户素材'
    )
),
provider_checks as (
  select
    '模型通道'::text as check_group,
    expected_providers.name as check_item,
    case when public.ai_providers.name is not null then '通过' else '未通过' end as result,
    coalesce(public.ai_providers.display_name, '缺失') as current_value,
    '重新执行种子数据 SQL。'::text as suggestion
  from expected_providers
  left join public.ai_providers on public.ai_providers.name = expected_providers.name
),
seed_checks as (
  select
    '种子数据'::text as check_group,
    '商品分类不少于 8 个'::text as check_item,
    case when count(*) >= 8 then '通过' else '未通过' end as result,
    count(*)::text as current_value,
    '重新执行种子数据 SQL。'::text as suggestion
  from public.product_categories
  union all
  select '种子数据', '商品不少于 8 个',
    case when count(*) >= 8 then '通过' else '未通过' end,
    count(*)::text,
    '重新执行种子数据 SQL。'
  from public.products
  union all
  select '种子数据', '风格模板不少于 3 个',
    case when count(*) >= 3 then '通过' else '未通过' end,
    count(*)::text,
    '重新执行种子数据 SQL。'
  from public.style_presets
  union all
  select '种子数据', '视频模板不少于 2 个',
    case when count(*) >= 2 then '通过' else '未通过' end,
    count(*)::text,
    '重新执行种子数据 SQL。'
  from public.video_templates
  union all
  select '种子数据', '脚本模板不少于 3 个',
    case when count(*) >= 3 then '通过' else '未通过' end,
    count(*)::text,
    '重新执行种子数据 SQL。'
  from public.script_templates
  union all
  select '种子数据', '音乐曲目不少于 3 个',
    case when count(*) >= 3 then '通过' else '未通过' end,
    count(*)::text,
    '重新执行种子数据 SQL。'
  from public.music_tracks
),
model_checks as (
  select
    '模型配置'::text as check_group,
    'KIE 文生图模型'::text as check_item,
    case when exists (
      select 1
      from public.ai_models
      join public.ai_providers on public.ai_providers.id = public.ai_models.provider_id
      where public.ai_providers.name = 'kie'
        and public.ai_models.name = 'gpt-image-2-text-to-image'
    ) then '通过' else '未通过' end as result,
    'gpt-image-2-text-to-image'::text as current_value,
    '重新执行种子数据 SQL。'::text as suggestion
  union all
  select
    '模型配置',
    'KIE 图生图模型',
    case when exists (
      select 1
      from public.ai_models
      join public.ai_providers on public.ai_providers.id = public.ai_models.provider_id
      where public.ai_providers.name = 'kie'
        and public.ai_models.name = 'gpt-image-2-image-to-image'
    ) then '通过' else '未通过' end,
    'gpt-image-2-image-to-image',
    '重新执行种子数据 SQL。'
),
function_checks as (
  select
    '认证触发器'::text as check_group,
    'handle_new_user 函数'::text as check_item,
    case when to_regprocedure('public.handle_new_user()') is not null then '通过' else '未通过' end as result,
    case when to_regprocedure('public.handle_new_user()') is not null then '已创建' else '缺失' end as current_value,
    '重新执行 Supabase 初始化 SQL 中的认证触发器函数。'::text as suggestion
),
trigger_checks as (
  select
    '认证触发器'::text as check_group,
    '注册后创建用户资料'::text as check_item,
    case when exists (
      select 1
      from pg_trigger
      join pg_class on pg_class.oid = pg_trigger.tgrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_trigger.tgname = 'on_auth_user_created'
        and pg_namespace.nspname = 'auth'
        and pg_class.relname = 'users'
    ) then '通过' else '未通过' end as result,
    'on_auth_user_created'::text as current_value,
    '重新执行 Supabase 初始化 SQL 中的认证触发器部分。'::text as suggestion
)
select check_group as "检查分组",
  check_item as "检查项",
  result as "结果",
  current_value as "当前值",
  suggestion as "处理建议"
from (
  select * from table_checks
  union all select * from rls_checks
  union all select * from table_policy_checks
  union all select * from bucket_checks
  union all select * from storage_policy_checks
  union all select * from storage_owner_policy_checks
  union all select * from provider_checks
  union all select * from seed_checks
  union all select * from model_checks
  union all select * from function_checks
  union all select * from trigger_checks
) checks
order by "检查分组", "检查项";
`;

mkdirSync(distDir, { recursive: true });
writeFileSync(outputPath, sql);

console.log("检查通过：已生成 Supabase 验收 SQL。");
console.log("路径：dist/daji-xingxiang-supabase-verify.sql");
