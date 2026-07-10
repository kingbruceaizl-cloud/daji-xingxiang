alter type public.job_status add value if not exists 'pending' before 'queued';
alter type public.job_status add value if not exists 'submitting' after 'queued';
alter type public.job_status add value if not exists 'persisting' after 'running';
alter type public.job_status add value if not exists 'retrying' after 'persisting';

alter type public.job_type add value if not exists 'text_generation';
alter type public.job_type add value if not exists 'image_understanding';
alter type public.job_type add value if not exists 'video_generation';
alter type public.job_type add value if not exists 'long_video_generation';

alter type public.model_capability add value if not exists 'text_generation';
alter type public.model_capability add value if not exists 'image_understanding';
alter type public.model_capability add value if not exists 'long_video_generation';
