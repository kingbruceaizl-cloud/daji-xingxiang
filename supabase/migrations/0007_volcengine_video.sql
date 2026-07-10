insert into public.ai_models
  (provider_id, name, display_name, capabilities, default_params, is_active)
select
  id,
  'doubao-seedance-2-0-260128',
  'Doubao-Seedance-2.0',
  array['image_to_video', 'video_generation']::public.model_capability[],
  '{"resolution":"720p","ratio":"9:16","duration":13,"generateAudio":true,"returnLastFrame":true,"cameraFixed":false,"watermark":false,"imageRole":"first_frame"}'::jsonb,
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
  model = 'doubao-seedance-2-0-260128',
  default_params = '{"resolution":"720p","ratio":"9:16","duration":13,"generateAudio":true,"returnLastFrame":true,"cameraFixed":false,"watermark":false,"imageRole":"first_frame"}'::jsonb,
  is_active = true
where task_key in ('image_to_video', 'video_generation');
