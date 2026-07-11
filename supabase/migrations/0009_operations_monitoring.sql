create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (alert_type in ('ai_job_failed', 'ai_job_stalled')),
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  source_type text not null default 'ai_job',
  source_id uuid,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_system_alerts_updated_at on public.system_alerts;
create trigger set_system_alerts_updated_at
before update on public.system_alerts
for each row execute function public.set_updated_at();

create unique index if not exists idx_system_alerts_source_unique
  on public.system_alerts(alert_type, source_type, source_id)
  where source_id is not null;

create index if not exists idx_system_alerts_open
  on public.system_alerts(status, severity, last_seen_at desc)
  where status <> 'resolved';

alter table public.system_alerts enable row level security;

drop policy if exists "后台管理员可读取系统告警" on public.system_alerts;
create policy "后台管理员可读取系统告警"
on public.system_alerts for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('owner', 'admin')
  )
);

drop policy if exists "后台管理员可更新系统告警" on public.system_alerts;
create policy "后台管理员可更新系统告警"
on public.system_alerts for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('owner', 'admin')
  )
);

revoke insert, delete on table public.system_alerts from anon, authenticated;
grant select, update on table public.system_alerts to authenticated;
grant all on table public.system_alerts to service_role;

create or replace function public.sync_ai_job_system_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'failed'
    and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.system_alerts (
      alert_type,
      severity,
      status,
      source_type,
      source_id,
      title,
      message,
      metadata,
      first_seen_at,
      last_seen_at,
      acknowledged_at,
      acknowledged_by,
      resolved_at,
      resolved_by
    ) values (
      'ai_job_failed',
      case
        when new.job_type in ('image_to_video', 'video_generation', 'video_render', 'long_video_generation')
          then 'critical'
        else 'warning'
      end,
      'open',
      'ai_job',
      new.id,
      '生成任务失败',
      coalesce(nullif(new.error_message, ''), '模型任务失败，请在任务记录中查看详情。'),
      jsonb_build_object(
        'provider', new.provider,
        'model', new.model,
        'jobType', new.job_type,
        'errorCode', new.error_code,
        'retryCount', new.retry_count
      ),
      now(),
      now(),
      null,
      null,
      null,
      null
    )
    on conflict (alert_type, source_type, source_id) where source_id is not null
    do update set
      severity = excluded.severity,
      status = 'open',
      title = excluded.title,
      message = excluded.message,
      metadata = excluded.metadata,
      last_seen_at = now(),
      acknowledged_at = null,
      acknowledged_by = null,
      resolved_at = null,
      resolved_by = null;
  elsif tg_op = 'UPDATE'
    and new.status in ('succeeded', 'canceled')
    and old.status is distinct from new.status then
    update public.system_alerts
    set
      status = 'resolved',
      resolved_at = now(),
      resolved_by = null,
      last_seen_at = now()
    where source_type = 'ai_job'
      and source_id = new.id
      and status <> 'resolved';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_ai_job_system_alert on public.ai_jobs;
create trigger sync_ai_job_system_alert
after insert or update of status on public.ai_jobs
for each row execute function public.sync_ai_job_system_alert();

create or replace function public.refresh_ai_job_system_alerts(
  p_stale_minutes integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  stale_after interval;
  detected_count integer := 0;
  resolved_count integer := 0;
begin
  stale_after := make_interval(
    mins => least(greatest(coalesce(p_stale_minutes, 15), 5), 1440)
  );

  insert into public.system_alerts (
    alert_type,
    severity,
    status,
    source_type,
    source_id,
    title,
    message,
    metadata,
    first_seen_at,
    last_seen_at
  )
  select
    'ai_job_stalled',
    'warning',
    'open',
    'ai_job',
    job.id,
    '生成任务长时间未更新',
    '任务超过预期时间没有进展，请检查 Worker、模型平台或结果转存状态。',
    jsonb_build_object(
      'provider', job.provider,
      'model', job.model,
      'jobType', job.job_type,
      'status', job.status,
      'lastUpdatedAt', job.updated_at
    ),
    now(),
    now()
  from public.ai_jobs as job
  where job.provider <> 'mock'
    and job.status in ('pending', 'queued', 'submitting', 'running', 'persisting', 'retrying')
    and job.updated_at < now() - stale_after
  on conflict (alert_type, source_type, source_id) where source_id is not null
  do update set
    status = 'open',
    message = excluded.message,
    metadata = excluded.metadata,
    last_seen_at = now(),
    resolved_at = null,
    resolved_by = null;

  get diagnostics detected_count = row_count;

  update public.system_alerts as alert
  set
    status = 'resolved',
    resolved_at = now(),
    resolved_by = null,
    last_seen_at = now()
  where alert.alert_type = 'ai_job_stalled'
    and alert.status <> 'resolved'
    and not exists (
      select 1
      from public.ai_jobs as job
      where job.id = alert.source_id
        and job.provider <> 'mock'
        and job.status in ('pending', 'queued', 'submitting', 'running', 'persisting', 'retrying')
        and job.updated_at < now() - stale_after
    );

  get diagnostics resolved_count = row_count;

  return jsonb_build_object(
    'detected', detected_count,
    'resolved', resolved_count,
    'staleMinutes', extract(epoch from stale_after) / 60
  );
end;
$$;

create or replace function public.get_operations_overview(
  p_days integer default 30
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from public.ai_jobs
    where provider <> 'mock'
      and created_at >= now() - make_interval(
        days => least(greatest(coalesce(p_days, 30), 1), 365)
      )
  )
  select jsonb_build_object(
    'periodDays', least(greatest(coalesce(p_days, 30), 1), 365),
    'total', (select count(*) from scoped),
    'todayTotal', (
      select count(*) from scoped where created_at >= date_trunc('day', now())
    ),
    'succeeded', (select count(*) from scoped where status = 'succeeded'),
    'failed', (select count(*) from scoped where status = 'failed'),
    'active', (
      select count(*) from scoped
      where status in ('pending', 'queued', 'submitting', 'running', 'persisting', 'retrying')
    ),
    'stalled', (
      select count(*) from scoped
      where status in ('pending', 'queued', 'submitting', 'running', 'persisting', 'retrying')
        and updated_at < now() - interval '15 minutes'
    ),
    'successRate', coalesce((
      select round(
        100.0 * count(*) filter (where status = 'succeeded') /
        nullif(count(*) filter (where status in ('succeeded', 'failed')), 0),
        1
      )
      from scoped
    ), 0),
    'avgDurationSeconds', coalesce((
      select round(avg(extract(epoch from completed_at - coalesce(started_at, created_at)))::numeric, 1)
      from scoped
      where status = 'succeeded' and completed_at is not null
    ), 0),
    'openAlerts', (
      select count(*) from public.system_alerts where status <> 'resolved'
    ),
    'providers', coalesce((
      select jsonb_agg(to_jsonb(provider_row) order by provider_row.total desc)
      from (
        select
          provider,
          count(*) as total,
          count(*) filter (where status = 'succeeded') as succeeded,
          count(*) filter (where status = 'failed') as failed
        from scoped
        group by provider
      ) as provider_row
    ), '[]'::jsonb),
    'failureCodes', coalesce((
      select jsonb_agg(to_jsonb(failure_row) order by failure_row.total desc)
      from (
        select coalesce(nullif(error_code, ''), 'UNCLASSIFIED') as code, count(*) as total
        from scoped
        where status = 'failed'
        group by coalesce(nullif(error_code, ''), 'UNCLASSIFIED')
        order by count(*) desc
        limit 8
      ) as failure_row
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.refresh_ai_job_system_alerts(integer) from public, anon, authenticated;
grant execute on function public.refresh_ai_job_system_alerts(integer) to service_role;

revoke all on function public.get_operations_overview(integer) from public, anon, authenticated;
grant execute on function public.get_operations_overview(integer) to service_role;

revoke all on function public.sync_ai_job_system_alert() from public, anon, authenticated;

comment on table public.system_alerts is
  '后台运维告警：持久记录真实 AI 任务失败与长时间未更新状态。';

comment on function public.refresh_ai_job_system_alerts(integer) is
  '由后台 Worker 周期调用，发现并恢复长时间未更新的真实 AI 任务告警。';

comment on function public.get_operations_overview(integer) is
  '仅供服务端后台读取的 AI 任务运行指标聚合。';
