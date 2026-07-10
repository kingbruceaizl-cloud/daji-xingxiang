export const appearanceAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    faceShape: { type: "string" },
    hair: { type: "string" },
    skinTone: { type: "string" },
    bodyProportion: { type: "string" },
    currentStyle: { type: "string" },
    preservedFeatures: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    visibleText: { type: "array", items: { type: "string" } },
    riskNotes: { type: "array", items: { type: "string" } },
  },
  required: [
    "faceShape",
    "hair",
    "skinTone",
    "bodyProportion",
    "currentStyle",
    "preservedFeatures",
    "recommendations",
    "visibleText",
    "riskNotes",
  ],
} as const;

export const appearancePlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    occasion: { type: "string" },
    styleDirection: { type: "string" },
    hair: { type: "string" },
    makeup: { type: "string" },
    outfit: { type: "array", items: { type: "string" } },
    accessories: { type: "array", items: { type: "string" } },
    colorPalette: { type: "array", items: { type: "string" } },
    productMatches: { type: "array", items: { type: "string" } },
    cautions: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "occasion",
    "styleDirection",
    "hair",
    "makeup",
    "outfit",
    "accessories",
    "colorPalette",
    "productMatches",
    "cautions",
  ],
} as const;

export const promptPackageSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    imagePrompt: { type: "string" },
    negativePrompt: { type: "string" },
    videoPrompt: { type: "string" },
    shotPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          order: { type: "integer" },
          durationSeconds: { type: "number" },
          description: { type: "string" },
        },
        required: ["order", "durationSeconds", "description"],
      },
    },
    reviewNotes: { type: "array", items: { type: "string" } },
  },
  required: [
    "imagePrompt",
    "negativePrompt",
    "videoPrompt",
    "shotPlan",
    "reviewNotes",
  ],
} as const;

export const mockAppearanceAnalysis = {
  faceShape: "柔和椭圆脸，面部轮廓均衡",
  hair: "深色中长发，可增加顶部蓬松度与侧区层次",
  skinTone: "中性偏暖，适合低饱和暖色与柔和红棕色",
  bodyProportion: "当前素材以半身为主，建议补充自然站姿全身照后再判断",
  currentStyle: "干净自然，具备向通勤与新中式轻礼服延展的基础",
  preservedFeatures: ["自然五官比例", "原始发色", "真实肤质", "个人辨识度"],
  recommendations: ["使用清透底妆", "强化肩颈线条", "配饰保持轻量", "优先选择低饱和主色"],
  visibleText: [],
  riskNotes: ["单张照片可能受光线与拍摄角度影响", "最终方案需由形象顾问人工确认"],
};

export const mockAppearancePlan = {
  summary: "以保留客户辨识度为前提，建立温和、专业且便于日常复用的形象方案。",
  occasion: "通勤、商务社交与轻正式活动",
  styleDirection: "高级通勤融合轻新中式细节",
  hair: "空气感层次中长发，顶部轻微蓬松，面部两侧自然修饰",
  makeup: "柔雾清透底妆、低饱和红棕眼妆、自然豆沙唇色",
  outfit: ["低饱和缎面上衣", "高腰直筒裤", "线条简洁的轻结构外套"],
  accessories: ["小体量珍珠耳饰", "简约通勤手袋"],
  colorPalette: ["暖白", "灰粉", "深炭灰", "低饱和红"],
  productMatches: ["云纹缎面上衣", "珍珠耳饰素材", "简约通勤手袋"],
  cautions: ["避免过度磨皮", "避免夸张改变脸型", "商品颜色以实物为准"],
};

export const mockPromptPackage = {
  imagePrompt:
    "保留客户自然五官、原始发色与真实肤质，高级通勤融合轻新中式细节，清透柔雾妆面，低饱和缎面上衣，高腰直筒裤，小体量珍珠耳饰，干净商业棚拍光，真实摄影质感。",
  negativePrompt:
    "夸张变形，改变身份特征，过度磨皮，塑料皮肤，多余手指，错误肢体，商品结构错误，杂乱背景，低清晰度。",
  videoPrompt:
    "9:16 固定机位全身构图，客户在纯白无缝棚拍背景中完成自然原地旋转换装，保持人物身份与五官一致，依次展示发型、妆面、上衣、裤装、鞋包和饰品，动作稳定，商品卡片简洁出现。",
  shotPlan: [
    { order: 1, durationSeconds: 3, description: "展示原始形象与自然站姿" },
    { order: 2, durationSeconds: 5, description: "旋转换装并展示完整造型" },
    { order: 3, durationSeconds: 5, description: "近景展示妆发、配饰与商品细节" },
  ],
  reviewNotes: ["生成前确认客户身份特征", "确认商品与颜色", "确认视频模型真人素材规则"],
};
