alter table public.profiles
  alter column role set default 'staff'::public.user_role;

create table if not exists public.usage_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  monthly_text_limit integer not null default 500 check (monthly_text_limit >= -1),
  monthly_image_limit integer not null default 100 check (monthly_image_limit >= -1),
  monthly_video_limit integer not null default 20 check (monthly_video_limit >= -1),
  max_concurrent_jobs integer not null default 2 check (max_concurrent_jobs >= 1),
  is_generation_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_usage_limits_updated_at on public.usage_limits;
create trigger set_usage_limits_updated_at
before update on public.usage_limits
for each row execute function public.set_updated_at();

alter table public.usage_limits enable row level security;

drop policy if exists "用户可读取自己的用量限制" on public.usage_limits;
create policy "用户可读取自己的用量限制"
on public.usage_limits for select
to authenticated
using (auth.uid() = user_id);

insert into public.usage_limits (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.user_role;
begin
  perform pg_advisory_xact_lock(hashtext('daji-initial-owner'));

  if exists (select 1 from public.profiles where role = 'owner') then
    assigned_role := 'staff';
  else
    assigned_role := 'owner';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  insert into public.usage_limits (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.enqueue_ai_job(
  p_owner_id uuid,
  p_project_id uuid,
  p_provider text,
  p_model text,
  p_job_type public.job_type,
  p_task_key text,
  p_prompt text,
  p_input_asset_ids uuid[],
  p_request_payload jsonb,
  p_persistence_status text,
  p_idempotency_key text
)
returns public.ai_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  limits public.usage_limits;
  active_count integer;
  month_count integer;
  created_job public.ai_jobs;
begin
  if p_owner_id is null then
    raise exception using errcode = 'P0001', message = 'OWNER_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));

  insert into public.usage_limits (user_id)
  values (p_owner_id)
  on conflict (user_id) do nothing;

  select * into limits
  from public.usage_limits
  where user_id = p_owner_id;

  if p_provider <> 'mock' then
    if not limits.is_generation_enabled then
      raise exception using errcode = 'P0001', message = 'GENERATION_DISABLED';
    end if;

    select count(*) into active_count
    from public.ai_jobs
    where owner_id = p_owner_id
      and provider <> 'mock'
      and status in ('pending', 'queued', 'submitting', 'running', 'persisting', 'retrying');

    if active_count >= limits.max_concurrent_jobs then
      raise exception using errcode = 'P0001', message = 'CONCURRENT_LIMIT_REACHED';
    end if;

    if p_job_type in ('text_generation', 'image_understanding', 'copywriting') then
      select count(*) into month_count
      from public.ai_jobs
      where owner_id = p_owner_id
        and provider <> 'mock'
        and job_type in ('text_generation', 'image_understanding', 'copywriting')
        and created_at >= date_trunc('month', now());
      if limits.monthly_text_limit >= 0 and month_count >= limits.monthly_text_limit then
        raise exception using errcode = 'P0001', message = 'MONTHLY_TEXT_LIMIT_REACHED';
      end if;
    elsif p_job_type in ('text_to_image', 'image_to_image') then
      select count(*) into month_count
      from public.ai_jobs
      where owner_id = p_owner_id
        and provider <> 'mock'
        and job_type in ('text_to_image', 'image_to_image')
        and created_at >= date_trunc('month', now());
      if limits.monthly_image_limit >= 0 and month_count >= limits.monthly_image_limit then
        raise exception using errcode = 'P0001', message = 'MONTHLY_IMAGE_LIMIT_REACHED';
      end if;
    else
      select count(*) into month_count
      from public.ai_jobs
      where owner_id = p_owner_id
        and provider <> 'mock'
        and job_type in ('image_to_video', 'video_generation', 'video_render', 'long_video_generation')
        and created_at >= date_trunc('month', now());
      if limits.monthly_video_limit >= 0 and month_count >= limits.monthly_video_limit then
        raise exception using errcode = 'P0001', message = 'MONTHLY_VIDEO_LIMIT_REACHED';
      end if;
    end if;
  end if;

  insert into public.ai_jobs (
    owner_id,
    project_id,
    provider,
    model,
    model_version,
    job_type,
    task_key,
    status,
    prompt,
    input_asset_ids,
    request_payload,
    response_payload,
    persistence_status,
    idempotency_key
  ) values (
    p_owner_id,
    p_project_id,
    p_provider,
    p_model,
    p_model,
    p_job_type,
    p_task_key,
    'pending',
    p_prompt,
    coalesce(p_input_asset_ids, '{}'),
    coalesce(p_request_payload, '{}'),
    '{}',
    p_persistence_status,
    p_idempotency_key
  )
  returning * into created_job;

  return created_job;
end;
$$;

revoke all on function public.enqueue_ai_job(
  uuid, uuid, text, text, public.job_type, text, text, uuid[], jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.enqueue_ai_job(
  uuid, uuid, text, text, public.job_type, text, text, uuid[], jsonb, text, text
) to service_role;

create index if not exists idx_ai_jobs_owner_monthly_usage
  on public.ai_jobs(owner_id, job_type, created_at)
  where provider <> 'mock';
