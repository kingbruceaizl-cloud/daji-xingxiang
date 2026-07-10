"use client";

import {
  getUploadAccept,
  validateUploadFileInput,
  type UploadBucket,
} from "@/lib/upload-rules";
import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

type UploadButtonProps = {
  bucket?: UploadBucket;
  projectId?: string;
  onUploaded?: (asset: UploadedAsset) => void;
};

export type UploadedAsset = {
  id?: string;
  title?: string;
  kind?: string;
  public_url?: string | null;
  preview_url?: string | null;
  metadata?: {
    type?: string;
    size?: number;
  };
};

export function UploadButton({
  bucket = "customer-assets",
  projectId,
  onUploaded,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const accept = getUploadAccept(bucket);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setMessage(null);

    const validation = validateUploadFileInput(file, bucket);
    if (!validation.ok) {
      setMessage(validation.message);
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("bucket", bucket);
    if (projectId) {
      formData.set("projectId", projectId);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setMessage(data.message || (data.ok ? "上传成功" : "上传失败"));

      if (data.ok && data.asset) {
        onUploaded?.(data.asset);
        window.dispatchEvent(
          new CustomEvent("daji:asset-uploaded", {
            detail: {
              asset: data.asset,
              previewUrl: data.asset.preview_url || data.asset.public_url,
            },
          }),
        );
      }
    } catch {
      setMessage("上传请求失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {isUploading ? "上传中" : "上传素材"}
      </button>
      {message && (
        <p className="max-w-xs text-xs text-stone-500" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
