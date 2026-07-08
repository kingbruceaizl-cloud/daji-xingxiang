create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'owner'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  (
    'customer-assets',
    'customer-assets',
    false,
    104857600,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
  ),
  (
    'generated-assets',
    'generated-assets',
    false,
    524288000,
    array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
  ),
  (
    'product-assets',
    'product-assets',
    true,
    52428800,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'music-assets',
    'music-assets',
    false,
    52428800,
    array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "用户可读取自己的客户素材"
on storage.objects for select
to authenticated
using (
  bucket_id in ('customer-assets', 'generated-assets', 'music-assets')
  and owner = auth.uid()
);

create policy "用户可上传自己的客户素材"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('customer-assets', 'generated-assets', 'music-assets')
  and owner = auth.uid()
);

create policy "用户可更新自己的客户素材"
on storage.objects for update
to authenticated
using (
  bucket_id in ('customer-assets', 'generated-assets', 'music-assets')
  and owner = auth.uid()
)
with check (
  bucket_id in ('customer-assets', 'generated-assets', 'music-assets')
  and owner = auth.uid()
);

create policy "用户可删除自己的客户素材"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('customer-assets', 'generated-assets', 'music-assets')
  and owner = auth.uid()
);

create policy "公开读取商品素材"
on storage.objects for select
using (bucket_id = 'product-assets');

create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_asset_files_owner_project on public.asset_files(owner_id, project_id);
create index if not exists idx_products_category_active on public.products(category_id, is_active);
create index if not exists idx_ai_jobs_owner_status on public.ai_jobs(owner_id, status);
create index if not exists idx_ai_jobs_provider_job_id on public.ai_jobs(provider_job_id);
