const providerLabels: Record<string, string> = {
  mock: "演示通道",
  volcengine: "火山方舟（豆包）",
  openai: "OpenAI 通道",
  jimeng: "即梦通道",
  kling: "可灵通道",
  tongyi: "通义通道",
};

const modelLabels: Record<string, string> = {
  "mock-image-v1": "演示生图模型",
  "mock-video-v1": "演示视频模型",
  "doubao-seed-2-1-pro-260628": "Doubao-Seed-2.1-Pro",
  "doubao-seedream-5-0-260128": "Seedream 5.0 完整版",
  "doubao-seedance-2-0-260128": "Doubao-Seedance-2.0",
};

const jobTypeLabels: Record<string, string> = {
  text_generation: "文字与方案生成",
  image_understanding: "客户图片分析",
  text_to_image: "文生图",
  image_to_image: "图生图",
  image_to_video: "图生视频",
  video_generation: "视频生成",
  video_render: "视频渲染",
  copywriting: "文案生成",
};

const jobStatusLabels: Record<string, string> = {
  queued: "排队中",
  pending: "待处理",
  submitting: "正在提交",
  running: "生成中",
  persisting: "正在保存",
  retrying: "正在重试",
  succeeded: "已完成",
  failed: "失败",
  canceled: "已取消",
};

function hasChinese(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

export function formatProviderLabel(provider?: string | null) {
  if (!provider) {
    return "默认通道";
  }

  const normalized = provider.trim().toLowerCase();
  return (
    providerLabels[normalized] ||
    (hasChinese(provider) ? provider : "自定义模型通道")
  );
}

export function formatModelLabel(model?: string | null, provider?: string | null) {
  if (!model) {
    return "默认模型";
  }

  const normalized = model.trim().toLowerCase();
  if (modelLabels[normalized]) {
    return modelLabels[normalized];
  }

  if (hasChinese(model)) {
    return model;
  }

  const providerLabel = formatProviderLabel(provider);
  if (providerLabel === "自定义模型通道" || providerLabel === "默认通道") {
    return "自定义模型";
  }

  return `${providerLabel}模型`;
}

export function formatJobTypeLabel(type?: string | null) {
  if (!type) {
    return "生成任务";
  }

  return jobTypeLabels[type] || (hasChinese(type) ? type : "生成任务");
}

export function formatJobStatusLabel(status?: string | null) {
  if (!status) {
    return "未知状态";
  }

  return jobStatusLabels[status] || (hasChinese(status) ? status : "未知状态");
}
