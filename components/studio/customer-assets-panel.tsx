"use client";

import { UploadButton, type UploadedAsset } from "@/components/upload/upload-button";
import { Check, Film, ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type CustomerAssetsPanelProps = {
  initialPreviewUrl: string;
  projectId?: string;
};

function formatSize(value?: number) {
  if (!value) {
    return "本地素材";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function CustomerAssetsPanel({
  initialPreviewUrl,
  projectId,
}: CustomerAssetsPanelProps) {
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);
  const [asset, setAsset] = useState<UploadedAsset | null>(null);

  function handleUploaded(nextAsset: UploadedAsset) {
    setAsset(nextAsset);

    const nextPreviewUrl = nextAsset.preview_url || nextAsset.public_url;
    if (nextPreviewUrl) {
      setPreviewUrl(nextPreviewUrl);
    }
  }

  function handleRemoveAsset() {
    setAsset(null);
    setPreviewUrl(initialPreviewUrl);
    window.dispatchEvent(
      new CustomEvent("daji:asset-removed", {
        detail: {
          previewUrl: initialPreviewUrl,
        },
      }),
    );
  }

  const isVideo = asset?.metadata?.type?.startsWith("video/");

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-red-700">客户素材</p>
          <h1 className="mt-2 text-2xl font-semibold">
            上传客户图片后，选择风格和商品即可生成。
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UploadButton projectId={projectId} onUploaded={handleUploaded} />
          <button
            type="button"
            onClick={handleRemoveAsset}
            disabled={!asset}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Trash2 className="h-4 w-4" />
            移除素材
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-50">
          <Image
            src={previewUrl}
            alt={asset?.title || "客户素材预览"}
            width={900}
            height={1125}
            unoptimized={previewUrl.startsWith("data:")}
            className="aspect-[4/5] w-full object-cover"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              label: "正面照",
              active: !isVideo,
              icon: ImageIcon,
              detail: asset
                ? `${asset.title || "已上传图片"}｜${formatSize(asset.metadata?.size)}`
                : "已准备演示素材，生成时保留客户五官特征。",
            },
            {
              label: "半身照",
              active: false,
              icon: ImageIcon,
              detail: "可补充更多角度，用于提升商品搭配稳定性。",
            },
            {
              label: "短视频",
              active: Boolean(isVideo),
              icon: Film,
              detail: isVideo
                ? `${asset?.title || "已上传视频"}｜${formatSize(asset?.metadata?.size)}`
                : "可补充视频，用于后续生成更自然的变装短片。",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={`rounded-md border border-dashed p-4 ${
                  item.active
                    ? "border-red-200 bg-red-50"
                    : "border-stone-300 bg-stone-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-red-700" />
                    {item.label}
                  </span>
                  {item.active ? (
                    <Check className="h-4 w-4 text-red-700" />
                  ) : (
                    <span className="text-xs text-stone-400">可选</span>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-stone-500">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
