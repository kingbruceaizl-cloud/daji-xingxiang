"use client";

import { Button } from "@/components/ui/button";
import { Clapperboard, Download, Loader2, Send, Sparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type JobStatus = "queued" | "running" | "succeeded" | "failed";

type OutputAsset = {
  id: string;
  kind: string;
  title?: string | null;
  url?: string | null;
};

type JobResult = {
  jobId: string;
  provider: string;
  model: string;
  status: JobStatus;
  message: string;
  previewUrl?: string;
  providerJobId?: string;
  resultUrls?: string[];
  outputAssets?: OutputAsset[];
};

type GeneratePanelProps = {
  prompt: string;
  projectId?: string;
  initialInputImageUrl?: string;
  selectedProducts: string[];
  styleName: string;
};

async function createJob(endpoint: string, payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || "生成任务创建失败");
  }
  return data.job as JobResult;
}

async function lookupJob(job: JobResult) {
  const lookupId = job.providerJobId || job.jobId;
  const query = job.provider ? `?provider=${encodeURIComponent(job.provider)}` : "";
  const response = await fetch(`/api/jobs/${encodeURIComponent(lookupId)}${query}`);
  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "查询任务状态失败");
  }

  return normalizeLookupJob(data.job, job);
}

function statusText(status: JobStatus) {
  if (status === "succeeded") {
    return "已完成";
  }
  if (status === "failed") {
    return "失败";
  }
  if (status === "running") {
    return "生成中";
  }
  return "排队中";
}

function bestPreviewUrl(job: Partial<JobResult>) {
  return (
    job.previewUrl ||
    job.outputAssets?.find((asset) => asset.url)?.url ||
    job.resultUrls?.[0]
  );
}

function normalizeLookupJob(rawJob: Partial<JobResult> & {
  id?: string;
  jobType?: string;
  response?: {
    resultUrls?: string[];
    previewUrl?: string;
    message?: string;
  };
}, current: JobResult): JobResult {
  const resultUrls = rawJob.resultUrls || rawJob.response?.resultUrls || current.resultUrls;
  const nextJob = {
    ...current,
    jobId: rawJob.jobId || rawJob.id || current.jobId,
    provider: rawJob.provider || current.provider,
    model: rawJob.model || current.model,
    status: rawJob.status || current.status,
    message:
      rawJob.message ||
      rawJob.response?.message ||
      current.message ||
      "任务状态已更新。",
    previewUrl:
      rawJob.previewUrl ||
      rawJob.response?.previewUrl ||
      rawJob.outputAssets?.find((asset) => asset.url)?.url ||
      resultUrls?.[0] ||
      current.previewUrl,
    providerJobId: rawJob.providerJobId || current.providerJobId,
    resultUrls,
    outputAssets: rawJob.outputAssets || current.outputAssets,
  };

  return nextJob as JobResult;
}

const imageProviders = [
  {
    id: "mock",
    label: "演示通道",
    detail: "本地预览",
    provider: "mock",
    model: undefined,
  },
  {
    id: "kie",
    label: "KIE 图像",
    detail: "真实任务",
    provider: "kie",
    model: undefined,
  },
] as const;

const videoProviders = [
  {
    id: "mock",
    label: "演示通道",
    detail: "短视频预览",
    provider: "mock",
    model: "mock-video-v1",
  },
  {
    id: "kie",
    label: "KIE 视频",
    detail: "待接入",
    provider: "kie",
    model: undefined,
  },
] as const;

export function StudioGeneratePanel({
  prompt,
  projectId,
  initialInputImageUrl,
  selectedProducts,
  styleName,
}: GeneratePanelProps) {
  const [job, setJob] = useState<JobResult | null>(null);
  const [inputImageUrl, setInputImageUrl] = useState(initialInputImageUrl || "");
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [imageProviderId, setImageProviderId] = useState<(typeof imageProviders)[number]["id"]>("mock");
  const [videoProviderId, setVideoProviderId] = useState<(typeof videoProviders)[number]["id"]>("mock");
  const [isPolling, setIsPolling] = useState(false);
  const latestJobRef = useRef<JobResult | null>(null);

  useEffect(() => {
    function handleUploaded(event: Event) {
      const detail = (event as CustomEvent<{ previewUrl?: string | null }>).detail;

      if (detail?.previewUrl) {
        setInputImageUrl(detail.previewUrl);
        setJob(null);
        setSaveMessage(null);
      }
    }

    window.addEventListener("daji:asset-uploaded", handleUploaded);
    return () => window.removeEventListener("daji:asset-uploaded", handleUploaded);
  }, []);

  useEffect(() => {
    latestJobRef.current = job;
  }, [job]);

  const pollingJobKey =
    job && job.status !== "succeeded" && job.status !== "failed"
      ? `${job.provider}:${job.providerJobId || job.jobId}`
      : "";

  useEffect(() => {
    if (!pollingJobKey) {
      return;
    }

    let attempts = 0;
    let isActive = true;
    let isRequesting = false;

    async function poll() {
      const activeJob = latestJobRef.current;

      if (
        !activeJob ||
        activeJob.status === "succeeded" ||
        activeJob.status === "failed" ||
        isRequesting
      ) {
        return;
      }

      attempts += 1;
      isRequesting = true;
      setIsPolling(true);

      try {
        const nextJob = await lookupJob(activeJob);
        if (isActive) {
          setJob(nextJob);
        }
      } catch {
        if (attempts >= 3 && isActive) {
          setError("任务已提交，但暂时无法查询最新状态。");
        }
      } finally {
        isRequesting = false;
        if (isActive) {
          setIsPolling(false);
        }
      }
    }

    const timer = window.setInterval(() => {
      if (attempts >= 24) {
        window.clearInterval(timer);
        setIsPolling(false);
        return;
      }

      void poll();
    }, 5000);

    const firstPoll = window.setTimeout(() => void poll(), 1200);

    return () => {
      isActive = false;
      window.clearInterval(timer);
      window.clearTimeout(firstPoll);
    };
  }, [pollingJobKey]);

  const imageProvider = imageProviders.find((item) => item.id === imageProviderId) || imageProviders[0];
  const videoProvider = videoProviders.find((item) => item.id === videoProviderId) || videoProviders[0];
  const payload = {
    provider: imageProvider.provider,
    model: imageProvider.model,
    projectId,
    styleName,
    inputImageUrls: inputImageUrl ? [inputImageUrl] : [],
    selectedProducts,
    prompt,
  };

  async function handleImageGenerate() {
    setError(null);
    setIsImageLoading(true);
    try {
      if (imageProvider.provider === "kie" && inputImageUrl.startsWith("data:")) {
        throw new Error("KIE 图生图需要线上可访问的客户素材；请配置 Supabase 后上传素材，或先使用演示通道。");
      }

      const result = await createJob("/api/generate/image", payload);
      setJob(result);
      setSaveMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成形象图失败");
    } finally {
      setIsImageLoading(false);
    }
  }

  async function handleVideoGenerate() {
    setError(null);
    setIsVideoLoading(true);
    try {
      const videoInputUrl = bestPreviewUrl(job || {}) || inputImageUrl;
      if (videoProvider.provider === "kie" && videoInputUrl.startsWith("data:")) {
        throw new Error("KIE 视频任务需要线上可访问的形象图；请先使用已转存的生成结果。");
      }

      const result = await createJob("/api/generate/video", {
        provider: videoProvider.provider,
        model: videoProvider.model,
        projectId,
        styleName,
        selectedProducts,
        prompt,
        inputImageUrls: videoInputUrl ? [videoInputUrl] : [],
      });
      setJob(result);
      setSaveMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成变装视频失败");
    } finally {
      setIsVideoLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-red-700">
          <Sparkles className="h-4 w-4" />
          生成提示词
        </div>
        <p className="mt-4 text-sm leading-7 text-stone-600">{prompt}</p>
        <p className="mt-3 text-xs leading-5 text-stone-400">
          当前客户素材：{inputImageUrl ? "已载入，可用于图生图演示" : "未上传，将使用纯提示词生成"}
        </p>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold">模型选择</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <p className="text-xs text-stone-400">形象图通道</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {imageProviders.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setImageProviderId(item.id)}
                  className={`rounded-md border px-3 py-3 text-left text-sm ${
                    imageProviderId === item.id
                      ? "border-red-700 bg-red-50 text-red-800"
                      : "border-stone-200 text-stone-600"
                  }`}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-1 block text-xs">{item.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-stone-400">变装视频通道</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {videoProviders.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVideoProviderId(item.id)}
                  className={`rounded-md border px-3 py-3 text-left text-sm ${
                    videoProviderId === item.id
                      ? "border-red-700 bg-red-50 text-red-800"
                      : "border-stone-200 text-stone-600"
                  }`}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-1 block text-xs">{item.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-stone-950 p-5 text-white">
        <h2 className="text-sm font-semibold">生成结果预览</h2>
        <div className="mt-4 grid aspect-[4/5] place-items-center overflow-hidden rounded-md border border-dashed border-white/20 bg-white/5 text-center text-sm leading-6 text-stone-300">
          {bestPreviewUrl(job || {}) ? (
            <Image
              src={bestPreviewUrl(job || {}) || ""}
              alt="生成结果预览"
              width={900}
              height={1125}
              unoptimized={Boolean(bestPreviewUrl(job || {})?.startsWith("data:"))}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-6">
              点击生成后，这里会显示形象图或视频任务封面。
            </span>
          )}
        </div>

        {job && (
          <div className="mt-4 rounded-md bg-white/10 p-3 text-sm leading-6 text-stone-100">
            <div>任务：{job.jobId}</div>
            <div>状态：{statusText(job.status)}{isPolling ? "，正在自动查询" : ""}</div>
            <div>模型：{job.provider} / {job.model}</div>
            <div>{job.message}</div>
            {job.outputAssets?.length ? (
              <div>结果素材：{job.outputAssets.length} 个</div>
            ) : null}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-500/15 p-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {saveMessage && (
          <div className="mt-4 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-100">
            {saveMessage}
          </div>
        )}

        <div className="mt-4 grid gap-2">
          <Button
            type="button"
            onClick={handleImageGenerate}
            disabled={isImageLoading || isVideoLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-3 text-sm font-medium hover:bg-red-800"
          >
            {isImageLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            生成形象图
          </Button>
          <Button
            type="button"
            onClick={handleVideoGenerate}
            disabled={isImageLoading || isVideoLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-transparent px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
          >
            {isVideoLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clapperboard className="h-4 w-4" />
            )}
            生成变装视频
          </Button>
          <Button
            type="button"
            disabled={!job}
            onClick={async () => {
              if (!job) {
                return;
              }

              if (job.status !== "succeeded") {
                setSaveMessage("任务还在处理中，完成后会自动关联到项目素材库。");
                return;
              }

              try {
                const nextJob = await lookupJob(job);
                setJob(nextJob);
                setSaveMessage(
                  nextJob.outputAssets?.length
                    ? "已确认生成结果在项目素材库中。"
                    : "当前任务暂无可读取的生成素材。",
                );
              } catch {
                setSaveMessage("任务已完成，但暂时无法确认素材库状态。");
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-transparent px-4 py-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            保存到项目
          </Button>
        </div>
      </div>
    </div>
  );
}
