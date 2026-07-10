create table if not exists public.ai_job_runtime (
  job_id uuid primary key references public.ai_jobs(id) on delete cascade,
  dispatch_payload jsonb not null default '{}',
  provider_result_urls text[] not null default '{}',
  provider_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_ai_job_runtime_updated_at on public.ai_job_runtime;
create trigger set_ai_job_runtime_updated_at
before update on public.ai_job_runtime
for each row execute function public.set_updated_at();

alter table public.ai_job_runtime enable row level security;

revoke all on table public.ai_job_runtime from anon, authenticated;
grant all on table public.ai_job_runtime to service_role;

create or replace function public.claim_ai_jobs(
  p_worker_id text,
  p_limit integer default 1,
  p_lease_seconds integer default 300
)
returns setof public.ai_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(p_worker_id), '') is null then
    raise exception 'worker id is required';
  end if;

  return query
  with candidates as (
    select job.id
    from public.ai_jobs as job
    where job.status in (
      'pending',
      'queued',
      'submitting',
      'running',
      'persisting',
      'retrying'
    )
      and (job.next_poll_at is null or job.next_poll_at <= now())
      and (job.lease_expires_at is null or job.lease_expires_at <= now())
    order by job.created_at asc
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 10)
  )
  update public.ai_jobs as job
  set
    status = 'submitting',
    lease_owner = p_worker_id,
    lease_expires_at = now() + make_interval(
      secs => least(greatest(coalesce(p_lease_seconds, 300), 30), 900)
    ),
    started_at = coalesce(job.started_at, now()),
    next_poll_at = null
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.claim_ai_jobs(text, integer, integer) from public;
revoke all on function public.claim_ai_jobs(text, integer, integer) from anon, authenticated;
grant execute on function public.claim_ai_jobs(text, integer, integer) to service_role;

comment on table public.ai_job_runtime is
  '仅服务端 Worker 可读的任务运行数据，不通过客户端 RLS 暴露。';

comment on function public.claim_ai_jobs(text, integer, integer) is
  '使用行锁和租约原子领取待处理或超时未完成的 AI 任务。';
