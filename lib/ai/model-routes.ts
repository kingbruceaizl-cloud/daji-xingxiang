export type AiTaskRouteKey =
  | "text_generation"
  | "image_understanding"
  | "text_to_image"
  | "image_to_image"
  | "image_to_video"
  | "video_generation"
  | "long_video_generation";

export type AiTaskRouteDefinition = {
  key: AiTaskRouteKey;
  label: string;
  description: string;
  fallbackProvider: string;
  fallbackModel: string;
};

export const aiTaskRouteDefinitions: AiTaskRouteDefinition[] = [
  {
    key: "text_generation",
    label: "文字生成",
    description: "用于形象方案、提示词、脚本文案和商品描述。",
    fallbackProvider: "mock",
    fallbackModel: "mock-text-v1",
  },
  {
    key: "image_understanding",
    label: "图片理解",
    description: "用于识别客户照片、商品图和风格参考图。",
    fallbackProvider: "mock",
    fallbackModel: "mock-vision-v1",
  },
  {
    key: "text_to_image",
    label: "文生图",
    description: "用于没有客户参考图时，根据提示词生成形象图。",
    fallbackProvider: "mock",
    fallbackModel: "mock-image-v1",
  },
  {
    key: "image_to_image",
    label: "图生图",
    description: "用于基于客户照片生成换装图、风格写真和商品搭配图。",
    fallbackProvider: "mock",
    fallbackModel: "mock-image-v1",
  },
  {
    key: "image_to_video",
    label: "图生视频",
    description: "用于把生成形象图或客户素材生成变装短视频。",
    fallbackProvider: "mock",
    fallbackModel: "mock-video-v1",
  },
  {
    key: "video_generation",
    label: "视频生成",
    description: "用于直接根据脚本和镜头方案生成视频。",
    fallbackProvider: "mock",
    fallbackModel: "mock-video-v1",
  },
  {
    key: "long_video_generation",
    label: "长视频生成",
    description: "用于后续扩展长视频脚本、镜头和成片生成。",
    fallbackProvider: "mock",
    fallbackModel: "mock-long-video-v1",
  },
];

export function isAiTaskRouteKey(value: unknown): value is AiTaskRouteKey {
  return aiTaskRouteDefinitions.some((item) => item.key === value);
}

export function getAiTaskRouteDefinition(taskKey: AiTaskRouteKey) {
  return (
    aiTaskRouteDefinitions.find((item) => item.key === taskKey) ||
    aiTaskRouteDefinitions[0]
  );
}

export function formatAiTaskRouteLabel(taskKey: string) {
  return (
    aiTaskRouteDefinitions.find((item) => item.key === taskKey)?.label ||
    "自定义任务能力"
  );
}
