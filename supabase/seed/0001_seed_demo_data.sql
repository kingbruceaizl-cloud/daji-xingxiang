insert into public.product_categories (name, slug, sort_order) values
  ('发型', 'hair', 10),
  ('妆造', 'makeup', 20),
  ('服装', 'clothing', 30),
  ('裤子', 'pants', 40),
  ('鞋子', 'shoes', 50),
  ('包袋', 'bags', 60),
  ('饰品', 'accessories', 70),
  ('视频道具', 'video-props', 80)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '云纹缎面上衣', 'sku', 'DJ-CL-001', 399,
  'https://images.pexels.com/photos/1884584/pexels-photo-1884584.jpeg?auto=compress&cs=tinysrgb&w=900',
  '新中式云纹缎面上衣，低饱和红金点缀，适合宴会形象',
  array['新中式', '宴会', '真实商品']
from public.product_categories where slug = 'clothing'
on conflict do nothing;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '珍珠耳饰素材', 'asset', null, null,
  'https://images.pexels.com/photos/934063/pexels-photo-934063.jpeg?auto=compress&cs=tinysrgb&w=900',
  '精致珍珠耳饰，提升温柔高级感',
  array['珍珠', '饰品', '搭配素材']
from public.product_categories where slug = 'accessories'
on conflict do nothing;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '柔雾底妆盘', 'asset', null, null,
  'https://images.pexels.com/photos/37356602/pexels-photo-37356602.jpeg?auto=compress&cs=tinysrgb&w=900',
  '柔雾底妆与低饱和眼影，适合清透自然妆造',
  array['妆造', '底妆', '搭配素材']
from public.product_categories where slug = 'makeup'
on conflict do nothing;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '空气感卷发', 'asset', null, null,
  'https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg?auto=compress&cs=tinysrgb&w=900',
  '空气感自然卷发，发丝蓬松，柔和修饰脸型',
  array['发型', '空气感', '搭配素材']
from public.product_categories where slug = 'hair'
on conflict do nothing;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '高腰直筒牛仔裤', 'sku', 'DJ-PT-001', 269,
  'https://images.pexels.com/photos/3927390/pexels-photo-3927390.jpeg?auto=compress&cs=tinysrgb&w=900',
  '高腰直筒牛仔裤，修饰腿型，适合通勤与松弛感穿搭',
  array['裤子', '通勤', '真实商品']
from public.product_categories where slug = 'pants'
on conflict do nothing;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '黑白休闲帆布鞋', 'sku', 'DJ-SH-001', 199,
  'https://images.pexels.com/photos/336372/pexels-photo-336372.jpeg?auto=compress&cs=tinysrgb&w=900',
  '黑白休闲帆布鞋，干净百搭，适合生活方式形象图',
  array['鞋子', '休闲', '真实商品']
from public.product_categories where slug = 'shoes'
on conflict do nothing;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '简约通勤手袋', 'sku', 'DJ-BG-001', 329,
  'https://images.pexels.com/photos/28973056/pexels-photo-28973056.jpeg?auto=compress&cs=tinysrgb&w=900',
  '简约通勤手袋，适合商务、约会和日常造型',
  array['包袋', '通勤', '真实商品']
from public.product_categories where slug = 'bags'
on conflict do nothing;

insert into public.products (category_id, name, type, sku, price, image_url, prompt_text, tags)
select id, '手持相机道具', 'asset', null, null,
  'https://images.pexels.com/photos/18530979/pexels-photo-18530979.jpeg?auto=compress&cs=tinysrgb&w=900',
  '手持相机与拍摄道具，用于短视频变装和种草画面',
  array['视频道具', '拍摄', '搭配素材']
from public.product_categories where slug = 'video-props'
on conflict do nothing;

insert into public.style_presets (name, description, positive_prompt, negative_prompt, tags) values
  (
    '新中式轻礼服',
    '适合宴会、婚礼、节日和品牌形象照。',
    '温润东方美学，缎面材质，低饱和红金点缀，清透妆面，高级棚拍，保留人物五官特征',
    '低清晰度，变形五官，过度磨皮，夸张滤镜，多余手指',
    array['国风', '宴会', '婚礼']
  ),
  (
    '高级通勤',
    '适合职场头像、商务社交和门店形象。',
    '利落西装廓形，干净棚拍光，稳重有亲和力，真实商业摄影',
    '杂乱背景，廉价质感，过度锐化',
    array['职场', '通勤', '商务']
  ),
  (
    '短视频变装',
    '适合短视频账号的单镜头变装模板。',
    '白色无缝棚拍背景，快速旋转换装，商品清单卡片，干净高调光',
    '镜头切换，杂乱环境，低质量压缩',
    array['视频', '变装', '种草']
  )
on conflict do nothing;

insert into public.video_templates (name, aspect_ratio, duration_seconds, camera_direction, transition_style, prompt_template) values
  (
    '白底旋转换装',
    '9:16',
    13,
    '固定机位，全身构图，第一段可轻微推进',
    '快速单次 360 度原地旋转',
    '纯白无缝棚拍背景，模特通过快速旋转换装，左侧出现商品清单卡片，整体干净高级。'
  )
on conflict do nothing;

insert into public.video_templates (name, aspect_ratio, duration_seconds, camera_direction, transition_style, prompt_template) values
  (
    '低能量穿搭变装',
    '9:16',
    13,
    '固定机位，完整全身构图，避免剪辑',
    '每套造型之间用快速原地旋转换装',
    '低能量生活方式美学，白底棚拍，商品卡片叠层，模特从精致出门逐步切换到慵懒舒适造型。'
  )
on conflict do nothing;

insert into public.script_templates (name, content, tags) values
  (
    '通勤改造脚本',
    '开场展示客户原始形象，随后通过旋转换装进入高级通勤造型，字幕突出发型、上衣、裤装和鞋包搭配。',
    array['通勤', '改造', '商品种草']
  ),
  (
    '低能量穿搭脚本',
    '用电量下降作为情绪线索，每次旋转切换一套更松弛的造型，结尾保留夸张疲惫表情和商品清单卡片。',
    array['短视频', '低能量', '变装']
  ),
  (
    '新中式宴会脚本',
    '从素净底图进入新中式轻礼服造型，镜头保持稳定，重点展示妆面、耳饰、上衣材质和整体气质。',
    array['国风', '宴会', '形象照']
  )
on conflict do nothing;

insert into public.music_tracks (name, usage_note, mood_tags) values
  (
    '轻快通勤节奏',
    '适合通勤改造、门店种草和商品展示。',
    array['通勤', '轻快', '干净']
  ),
  (
    '松弛低能量节拍',
    '适合低能量穿搭、白底变装和生活方式短片。',
    array['松弛', '低能量', '幽默']
  ),
  (
    '东方轻礼服氛围',
    '适合新中式、婚礼和高级形象照视频。',
    array['国风', '优雅', '宴会']
  )
on conflict do nothing;

insert into public.ai_providers (name, display_name) values
  ('kie', 'KIE'),
  ('openai', 'OpenAI'),
  ('jimeng', '即梦'),
  ('kling', '可灵'),
  ('tongyi', '通义')
on conflict (name) do update set display_name = excluded.display_name;

insert into public.ai_models (provider_id, name, display_name, capabilities, default_params)
select id, 'gpt-image-2-image-to-image', 'GPT Image 2 图生图',
  array['image_to_image']::public.model_capability[],
  '{"aspectRatio":"3:4","quality":"high"}'::jsonb
from public.ai_providers where name = 'kie'
on conflict (provider_id, name) do update set
  display_name = excluded.display_name,
  capabilities = excluded.capabilities,
  default_params = excluded.default_params;
