create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'admin', 'staff');
create type public.asset_kind as enum ('customer_image', 'customer_video', 'product_image', 'generated_image', 'generated_video', 'music');
create type public.product_type as enum ('sku', 'asset');
create type public.job_type as enum ('text_to_image', 'image_to_image', 'image_to_video', 'video_render', 'copywriting');
create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'canceled');
create type public.model_capability as enum ('text_to_image', 'image_to_image', 'image_to_video', 'video_generation', 'copywriting');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.user_role not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  customer_name text,
  status text not null default '草稿',
  selected_style_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asset_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  kind public.asset_kind not null,
  bucket text not null,
  path text not null,
  public_url text,
  title text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  type public.product_type not null default 'asset',
  sku text,
  price numeric(12, 2),
  purchase_url text,
  image_url text,
  prompt_text text not null default '',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.style_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  positive_prompt text not null default '',
  negative_prompt text not null default '',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.video_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aspect_ratio text not null default '9:16',
  duration_seconds integer not null default 13,
  camera_direction text not null default '',
  transition_style text not null default '',
  prompt_template text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.script_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bucket text,
  path text,
  public_url text,
  usage_note text,
  mood_tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers(id) on delete cascade,
  name text not null,
  display_name text not null,
  capabilities public.model_capability[] not null default '{}',
  default_params jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_id, name)
);

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  model text not null,
  job_type public.job_type not null,
  status public.job_status not null default 'queued',
  prompt text not null default '',
  input_asset_ids uuid[] not null default '{}',
  output_asset_ids uuid[] not null default '{}',
  request_payload jsonb not null default '{}',
  response_payload jsonb not null default '{}',
  provider_job_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ai_jobs(id) on delete cascade,
  status public.job_status not null,
  message text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.projects
  add constraint projects_selected_style_id_fkey
  foreign key (selected_style_id) references public.style_presets(id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_style_presets_updated_at
before update on public.style_presets
for each row execute function public.set_updated_at();

create trigger set_video_templates_updated_at
before update on public.video_templates
for each row execute function public.set_updated_at();

create trigger set_ai_jobs_updated_at
before update on public.ai_jobs
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.asset_files enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.style_presets enable row level security;
alter table public.video_templates enable row level security;
alter table public.script_templates enable row level security;
alter table public.music_tracks enable row level security;
alter table public.ai_providers enable row level security;
alter table public.ai_models enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.job_events enable row level security;

create policy "用户可读取自己的资料"
on public.profiles for select
using (auth.uid() = id);

create policy "用户可更新自己的资料"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "用户可管理自己的项目"
on public.projects for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "用户可管理自己的素材"
on public.asset_files for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "登录用户可读取商品分类"
on public.product_categories for select
to authenticated
using (true);

create policy "登录用户可读取商品"
on public.products for select
to authenticated
using (true);

create policy "登录用户可读取风格模板"
on public.style_presets for select
to authenticated
using (true);

create policy "登录用户可读取视频模板"
on public.video_templates for select
to authenticated
using (true);

create policy "登录用户可读取脚本模板"
on public.script_templates for select
to authenticated
using (true);

create policy "登录用户可读取音乐库"
on public.music_tracks for select
to authenticated
using (true);

create policy "登录用户可读取模型配置"
on public.ai_providers for select
to authenticated
using (true);

create policy "登录用户可读取模型"
on public.ai_models for select
to authenticated
using (true);

create policy "用户可管理自己的生成任务"
on public.ai_jobs for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "用户可读取自己任务事件"
on public.job_events for select
using (
  exists (
    select 1
    from public.ai_jobs
    where ai_jobs.id = job_events.job_id
      and ai_jobs.owner_id = auth.uid()
  )
);
