export const uploadBucketRules = {
  "customer-assets": {
    label: "客户素材",
    maxSize: 104857600,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"],
  },
  "generated-assets": {
    label: "生成结果",
    maxSize: 524288000,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
  },
  "product-assets": {
    label: "商品素材",
    maxSize: 52428800,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  "music-assets": {
    label: "音乐素材",
    maxSize: 52428800,
    mimeTypes: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"],
  },
} as const;

export type UploadBucket = keyof typeof uploadBucketRules;

export const allowedUploadBuckets = Object.keys(uploadBucketRules) as UploadBucket[];

export function isUploadBucket(value: string): value is UploadBucket {
  return Object.prototype.hasOwnProperty.call(uploadBucketRules, value);
}

export function getUploadAccept(bucket: UploadBucket) {
  return uploadBucketRules[bucket].mimeTypes.join(",");
}

export function formatFileSizeForMessage(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  return `${bytes}B`;
}

export function validateUploadFileInput(
  input: { type?: string; size: number },
  bucket: UploadBucket,
) {
  const rules = uploadBucketRules[bucket];
  const mimeType = input.type || "application/octet-stream";

  if (!rules.mimeTypes.some((allowedMimeType) => allowedMimeType === mimeType)) {
    return {
      ok: false as const,
      status: 400,
      message: `${rules.label}不支持该文件类型，请重新选择文件。`,
    };
  }

  if (input.size > rules.maxSize) {
    return {
      ok: false as const,
      status: 413,
      message: `${rules.label}文件过大，最大支持 ${formatFileSizeForMessage(rules.maxSize)}。`,
    };
  }

  return {
    ok: true as const,
  };
}
