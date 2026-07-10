alter table public.ai_jobs
  add column if not exists task_key text,
  add column if not exists model_version text,
  add column if not exists error_code text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists persistence_status text not null default 'pending'
    check (persistence_status in ('pending', 'running', 'succeeded', 'failed', 'not_required')),
  add column if not exists idempotency_key text,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists last_polled_at timestamptz,
  add column if not exists next_poll_at timestamptz,
  add column if not exists lease_owner text,
  add column if not exists lease_expires_at timestamptz;

alter table public.asset_files
  add column if not exists source_key text;

create unique index if not exists idx_ai_jobs_provider_task_unique
  on public.ai_jobs(provider, provider_job_id)
  where provider_job_id is not null;

create unique index if not exists idx_ai_jobs_owner_idempotency_unique
  on public.ai_jobs(owner_id, idempotency_key)
  where owner_id is not null and idempotency_key is not null;

create index if not exists idx_ai_jobs_recovery
  on public.ai_jobs(status, next_poll_at, lease_expires_at)
  where status in ('pending', 'queued', 'submitting', 'running', 'persisting', 'retrying');

create unique index if not exists idx_asset_files_source_key_unique
  on public.asset_files(source_key)
  where source_key is not null;

insert into public.ai_providers (name, display_name, is_active)
values ('volcengine', '火山方舟（豆包）', true)
on conflict (name) do update set
  display_name = excluded.display_name,
  is_active = true;

update public.ai_providers
set is_active = false
where name = 'kie';

insert into public.ai_models
  (provider_id, name, display_name, capabilities, default_params, is_active)
select
  id,
  'doubao-seedream-5-0-260128',
  'Seedream 5.0 完整版',
  array['text_to_image', 'image_to_image']::public.model_capability[],
  '{"size":"2K","sequential_image_generation":"disabled","watermark":false}'::jsonb,
  true
from public.ai_providers
where name = 'volcengine'
on conflict (provider_id, name) do update set
  display_name = excluded.display_name,
  capabilities = excluded.capabilities,
  default_params = excluded.default_params,
  is_active = true;

update public.ai_model_routes
set
  provider = 'volcengine',
  model = 'doubao-seedream-5-0-260128',
  default_params = '{"size":"2K","sequential_image_generation":"disabled","watermark":false}'::jsonb,
  is_active = true
where task_key in ('text_to_image', 'image_to_image');

update public.ai_model_routes
set is_active = false
where task_key = 'long_video_generation';
