create table if not exists public.ai_model_routes (
  id uuid primary key default gen_random_uuid(),
  task_key text not null unique check (
    task_key in (
      'text_generation',
      'image_understanding',
      'text_to_image',
      'image_to_image',
      'image_to_video',
      'video_generation',
      'long_video_generation'
    )
  ),
  display_name text not null,
  description text not null default '',
  provider text not null default 'mock',
  model text not null default '',
  default_params jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_ai_model_routes_updated_at on public.ai_model_routes;
create trigger set_ai_model_routes_updated_at
before update on public.ai_model_routes
for each row execute function public.set_updated_at();

alter table public.ai_model_routes enable row level security;

drop policy if exists "登录用户可读取模型路由" on public.ai_model_routes;
create policy "登录用户可读取模型路由"
on public.ai_model_routes for select
to authenticated
using (true);
