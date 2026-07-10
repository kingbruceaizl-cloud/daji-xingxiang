import {
  Activity,
  Boxes,
  Brush,
  Camera,
  CheckCircle2,
  Clapperboard,
  Database,
  ListVideo,
  Music2,
  Footprints,
  ImagePlus,
  Layers3,
  Palette,
  Rocket,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  WandSparkles,
  UsersRound,
} from "lucide-react";

export const publicImages = {
  portrait: "/brand/image-consultation.jpg",
  hair: "/brand/makeup-and-styling.jpg",
  flatlay: "/brand/body-measurements.jpg",
  rack: "/brand/occasion-wear.jpg",
  makeup: "/brand/makeup-and-styling.jpg",
  pants: "/brand/occasion-wear.jpg",
  shoes: "/brand/team-service.jpg",
  bag: "/brand/image-consultation.jpg",
  cameraProp: "/brand/team-service.jpg",
};

export const stats = [
  { label: "MVP 流程", value: "6 步" },
  { label: "商品分类", value: "8 类" },
  { label: "模型预留", value: "5 家" },
  { label: "上线状态", value: "可部署" },
];

export const workflowSteps = [
  {
    title: "上传客户素材",
    description: "正面照、半身照、全身照和短视频先统一入库。",
    icon: ImagePlus,
  },
  {
    title: "选择风格方向",
    description: "通勤、约会、国风、轻奢、婚礼和短视频种草。",
    icon: Palette,
  },
  {
    title: "挑选商品搭配",
    description: "发型、妆造、衣服、裤子、鞋子、包和饰品。",
    icon: Shirt,
  },
  {
    title: "生成形象图片",
    description: "系统自动拼接客户素材、商品描述和风格提示词。",
    icon: WandSparkles,
  },
  {
    title: "生成变装视频",
    description: "用短视频模板完成换装、运镜、字幕和音乐配置。",
    icon: Clapperboard,
  },
  {
    title: "保存交付素材",
    description: "结果统一回写项目素材库，方便下载和复用。",
    icon: CheckCircle2,
  },
];

export const stylePresets = [
  {
    name: "新中式轻礼服",
    tag: "国风",
    prompt: "温润东方美学，缎面材质，低饱和红金点缀，适合宴会与婚礼。",
  },
  {
    name: "高级通勤",
    tag: "职场",
    prompt: "利落西装廓形，干净棚拍光，稳重又有亲和力。",
  },
  {
    name: "韩系松弛感",
    tag: "生活",
    prompt: "柔和妆面、针织层次、自然发丝，适合社媒头像和种草图。",
  },
  {
    name: "短视频变装",
    tag: "视频",
    prompt: "白底单镜头、快速旋转换装、左侧商品清单卡片。",
  },
];

export const productCategories = [
  {
    name: "发型",
    count: 18,
    icon: Scissors,
    items: ["空气感锁骨发", "低盘发", "复古卷发"],
  },
  {
    name: "妆造",
    count: 24,
    icon: Brush,
    items: ["清透底妆", "红棕唇妆", "中式眉眼"],
  },
  {
    name: "服装",
    count: 42,
    icon: Shirt,
    items: ["新中式上衣", "通勤西装", "缎面半裙"],
  },
  {
    name: "裤子",
    count: 16,
    icon: Shirt,
    items: ["高腰直筒裤", "垂感西裤", "浅色牛仔裤"],
  },
  {
    name: "鞋子",
    count: 22,
    icon: Footprints,
    items: ["通勤乐福鞋", "休闲帆布鞋", "细跟浅口鞋"],
  },
  {
    name: "包袋",
    count: 15,
    icon: ShoppingBag,
    items: ["通勤手袋", "小号手包", "链条包"],
  },
  {
    name: "饰品",
    count: 31,
    icon: Sparkles,
    items: ["珍珠耳饰", "金属发簪", "小号手包"],
  },
  {
    name: "视频道具",
    count: 9,
    icon: Camera,
    items: ["补光灯", "手持相机", "商品清单卡"],
  },
];

export const demoProducts = [
  {
    name: "云纹缎面上衣",
    type: "真实商品",
    category: "服装",
    price: "¥399",
    image: publicImages.rack,
  },
  {
    name: "珍珠耳饰素材",
    type: "搭配素材",
    category: "饰品",
    price: "素材",
    image: publicImages.flatlay,
  },
  {
    name: "柔雾底妆盘",
    type: "搭配素材",
    category: "妆造",
    price: "素材",
    image: publicImages.makeup,
  },
  {
    name: "空气感卷发",
    type: "搭配素材",
    category: "发型",
    price: "素材",
    image: publicImages.hair,
  },
  {
    name: "高腰直筒牛仔裤",
    type: "真实商品",
    category: "裤子",
    price: "¥269",
    image: publicImages.pants,
  },
  {
    name: "黑白休闲帆布鞋",
    type: "真实商品",
    category: "鞋子",
    price: "¥199",
    image: publicImages.shoes,
  },
  {
    name: "简约通勤手袋",
    type: "真实商品",
    category: "包袋",
    price: "¥329",
    image: publicImages.bag,
  },
  {
    name: "手持相机道具",
    type: "搭配素材",
    category: "视频道具",
    price: "素材",
    image: publicImages.cameraProp,
  },
];

export const projects = [
  {
    id: "demo-xinzhongshi",
    name: "张女士｜新中式宴会形象",
    status: "图片已生成",
    updatedAt: "今天 21:10",
    cover: publicImages.portrait,
  },
  {
    id: "demo-tongqin",
    name: "直播间｜通勤套装试穿",
    status: "等待视频",
    updatedAt: "今天 18:42",
    cover: publicImages.rack,
  },
  {
    id: "demo-dinengliang",
    name: "短视频｜低能量变装模板",
    status: "脚本配置中",
    updatedAt: "昨天 23:08",
    cover: publicImages.flatlay,
  },
];

export const providerCards = [
  {
    name: "火山方舟（豆包）",
    status: "正式通道",
    ability: "文字理解、Seedream 生图、Seedance 视频",
    icon: Camera,
  },
  {
    name: "OpenAI",
    status: "预留",
    ability: "提示词、文案、多模态生成",
    icon: Sparkles,
  },
  {
    name: "即梦",
    status: "预留",
    ability: "图像和视频生成",
    icon: Layers3,
  },
  {
    name: "可灵",
    status: "预留",
    ability: "图生视频、视频生成",
    icon: Clapperboard,
  },
  {
    name: "通义",
    status: "预留",
    ability: "文案、图像和视频能力",
    icon: Database,
  },
];

export const videoTemplates = [
  {
    name: "白底旋转换装",
    aspectRatio: "9:16",
    durationSeconds: 13,
    cameraDirection: "固定机位，全身构图，第一段轻微推进。",
    transitionStyle: "快速单次 360 度原地旋转完成换装。",
    promptTemplate:
      "纯白无缝棚拍背景，模特通过快速旋转换装，左侧出现商品清单卡片，整体干净高级。",
  },
  {
    name: "低能量穿搭变装",
    aspectRatio: "9:16",
    durationSeconds: 13,
    cameraDirection: "固定机位，完整全身构图，避免剪辑。",
    transitionStyle: "每套造型之间用快速原地旋转换装。",
    promptTemplate:
      "低能量生活方式美学，白底棚拍，商品卡片叠层，模特从精致出门逐步切换到慵懒舒适造型。",
  },
];

export const scriptTemplates = [
  {
    name: "通勤改造脚本",
    content:
      "开场展示客户原始形象，随后通过旋转换装进入高级通勤造型，字幕突出发型、上衣、裤装和鞋包搭配。",
    tags: ["通勤", "改造", "商品种草"],
  },
  {
    name: "低能量穿搭脚本",
    content:
      "用电量下降作为情绪线索，每次旋转切换一套更松弛的造型，结尾保留夸张疲惫表情和商品清单卡片。",
    tags: ["短视频", "低能量", "变装"],
  },
  {
    name: "新中式宴会脚本",
    content:
      "从素净底图进入新中式轻礼服造型，镜头保持稳定，重点展示妆面、耳饰、上衣材质和整体气质。",
    tags: ["国风", "宴会", "形象照"],
  },
];

export const musicTracks = [
  {
    name: "轻快通勤节奏",
    moodTags: ["通勤", "轻快", "干净"],
    usage: "适合通勤改造、门店种草和商品展示。",
  },
  {
    name: "松弛低能量节拍",
    moodTags: ["松弛", "低能量", "幽默"],
    usage: "适合低能量穿搭、白底变装和生活方式短片。",
  },
  {
    name: "东方轻礼服氛围",
    moodTags: ["国风", "优雅", "宴会"],
    usage: "适合新中式、婚礼和高级形象照视频。",
  },
];

export const generationJobs = [
  {
    id: "demo-image-001",
    provider: "演示通道",
    model: "mock-image-v1",
    type: "形象图片",
    status: "已完成",
    prompt: "高级通勤造型，保留客户五官特征，清透棚拍光。",
    updatedAt: "今天 21:10",
  },
  {
    id: "demo-video-001",
    provider: "演示通道",
    model: "mock-video-v1",
    type: "变装短视频",
    status: "等待生成",
    prompt: "白底旋转换装，左侧商品清单卡片，13 秒竖屏。",
    updatedAt: "今天 18:42",
  },
  {
    id: "demo-image-002",
    provider: "火山方舟（豆包）",
    model: "Seedream 5.0 完整版",
    type: "图生图",
    status: "配置中",
    prompt: "新中式轻礼服，缎面材质，低饱和红金点缀。",
    updatedAt: "昨天 23:08",
  },
];

export const adminModules = [
  { name: "团队权限", detail: "员工角色与模型用量", icon: UsersRound },
  { name: "商品库", detail: "真实商品与搭配素材", icon: Boxes },
  { name: "风格模板", detail: "提示词、封面、标签", icon: Palette },
  { name: "视频脚本", detail: "转场、运镜、字幕、时长", icon: Clapperboard },
  { name: "音乐库", detail: "情绪标签、节奏、授权备注", icon: Music2 },
  { name: "模型配置", detail: "模型通道、能力、参数", icon: Database },
  { name: "生成任务", detail: "状态、模型、失败原因", icon: ListVideo },
  { name: "运行监控", detail: "成功率、耗时与系统告警", icon: Activity },
  { name: "上线体检", detail: "环境、数据库、存储和模型", icon: Rocket },
];
