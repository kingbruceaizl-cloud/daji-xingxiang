"use client";

import { Button } from "@/components/ui/button";
import {
  Check,
  ClipboardCheck,
  Loader2,
  ScanFace,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StructuredJob = {
  jobId: string;
  status: string;
  message?: string;
  structuredOutput?: Record<string, unknown>;
};

export type PromptPackage = {
  imagePrompt: string;
  negativePrompt: string;
  videoPrompt: string;
  shotPlan: Array<{
    order: number;
    durationSeconds: number;
    description: string;
  }>;
  reviewNotes: string[];
};

type AppearanceWorkflowPanelProps = {
  projectId?: string;
  initialAssetId?: string;
  initialImageUrl: string;
  styleName: string;
  selectedProducts: string[];
  initialAnalysis?: Record<string, unknown>;
  initialPlan?: Record<string, unknown>;
  initialPromptPackage?: PromptPackage;
  onPromptPackage: (value: PromptPackage | null) => void;
};

function isTerminal(status: string) {
  return ["succeeded", "failed", "canceled"].includes(status);
}

async function submitStructuredJob(
  endpoint: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, idempotencyKey: crypto.randomUUID() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok || !payload.job) {
    throw new Error(payload.message || "AI 任务提交失败。");
  }

  let job = payload.job as StructuredJob;
  if (job.structuredOutput || isTerminal(job.status)) {
    return job;
  }

  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    const lookupResponse = await fetch(`/api/jobs/${encodeURIComponent(job.jobId)}`);
    const lookupPayload = await lookupResponse.json().catch(() => ({}));
    if (!lookupResponse.ok || !lookupPayload.ok || !lookupPayload.job) {
      continue;
    }

    job = {
      jobId: lookupPayload.job.id || job.jobId,
      status: lookupPayload.job.status,
      message: lookupPayload.job.message,
      structuredOutput: lookupPayload.job.response?.structuredOutput,
    };
    if (job.structuredOutput || isTerminal(job.status)) {
      return job;
    }
  }

  throw new Error("任务仍在后台执行，可稍后重新打开项目继续查看。");
}

function stringValue(value: unknown, fallback = "待确认") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function AppearanceWorkflowPanel({
  projectId,
  initialAssetId,
  initialImageUrl,
  styleName,
  selectedProducts,
  initialAnalysis,
  initialPlan,
  initialPromptPackage,
  onPromptPackage,
}: AppearanceWorkflowPanelProps) {
  const [assetId, setAssetId] = useState(initialAssetId || "");
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const initialContextKey = `${styleName}:${selectedProducts.join("|")}`;
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(
    initialAnalysis || null,
  );
  const [plan, setPlan] = useState<Record<string, unknown> | null>(
    initialPlan || null,
  );
  const [planContextKey, setPlanContextKey] = useState(
    initialPlan ? initialContextKey : "",
  );
  const [promptPackage, setPromptPackage] = useState<PromptPackage | null>(
    initialPromptPackage || null,
  );
  const [promptContextKey, setPromptContextKey] = useState(
    initialPromptPackage ? initialContextKey : "",
  );
  const [activeAction, setActiveAction] = useState<
    "analysis" | "plan" | "prompts" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const productKey = useMemo(
    () => selectedProducts.join("|"),
    [selectedProducts],
  );
  const contextKey = `${styleName}:${productKey}`;
  const currentPlan = planContextKey === contextKey ? plan : null;
  const currentPromptPackage =
    promptContextKey === contextKey ? promptPackage : null;

  useEffect(() => {
    function handleUploaded(event: Event) {
      const detail = (
        event as CustomEvent<{
          previewUrl?: string | null;
          asset?: { id?: string };
        }>
      ).detail;
      setAssetId(detail?.asset?.id || "");
      if (detail?.previewUrl) {
        setImageUrl(detail.previewUrl);
      }
      setAnalysis(null);
      setPlan(null);
      setPlanContextKey("");
      setPromptPackage(null);
      setPromptContextKey("");
      onPromptPackage(null);
    }

    window.addEventListener("daji:asset-uploaded", handleUploaded);
    return () => window.removeEventListener("daji:asset-uploaded", handleUploaded);
  }, [onPromptPackage]);

  async function runAnalysis() {
    setError(null);
    setActiveAction("analysis");
    try {
      const job = await submitStructuredJob("/api/ai/analyze-image", {
        projectId,
        inputAssetIds: assetId ? [assetId] : [],
        inputImageUrls: imageUrl ? [imageUrl] : [],
      });
      if (!job.structuredOutput) {
        throw new Error(job.message || "客户素材分析失败。");
      }
      setAnalysis(job.structuredOutput);
      setPlan(null);
      setPlanContextKey("");
      setPromptPackage(null);
      setPromptContextKey("");
      onPromptPackage(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "客户素材分析失败。");
    } finally {
      setActiveAction(null);
    }
  }

  async function runPlan() {
    if (!analysis) {
      return;
    }
    setError(null);
    setActiveAction("plan");
    try {
      const job = await submitStructuredJob("/api/ai/appearance-plan", {
        projectId,
        analysis,
        styleName,
        selectedProducts,
      });
      if (!job.structuredOutput) {
        throw new Error(job.message || "形象方案生成失败。");
      }
      setPlan(job.structuredOutput);
      setPlanContextKey(contextKey);
      setPromptPackage(null);
      setPromptContextKey("");
      onPromptPackage(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "形象方案生成失败。");
    } finally {
      setActiveAction(null);
    }
  }

  async function runPrompts() {
    if (!currentPlan) {
      return;
    }
    setError(null);
    setActiveAction("prompts");
    try {
      const job = await submitStructuredJob("/api/ai/prompts", {
        projectId,
        plan: currentPlan,
        aspectRatio: "9:16",
        durationSeconds: 13,
      });
      if (!job.structuredOutput) {
        throw new Error(job.message || "提示词生成失败。");
      }
      const nextPackage = job.structuredOutput as PromptPackage;
      setPromptPackage(nextPackage);
      setPromptContextKey(contextKey);
      onPromptPackage(nextPackage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提示词生成失败。");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-red-700">AI 形象方案</p>
          <h2 className="mt-1 text-xl font-semibold">分析、确认，再进入生成。</h2>
        </div>
        <ScanFace className="h-5 w-5 text-stone-400" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          { label: "客户分析", ready: Boolean(analysis), icon: ScanFace },
          { label: "形象方案", ready: Boolean(currentPlan), icon: ClipboardCheck },
          { label: "生成提示词", ready: Boolean(currentPromptPackage), icon: Sparkles },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`rounded-md border p-3 ${
                item.ready ? "border-red-200 bg-red-50" : "border-stone-200 bg-stone-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-red-700" />
                  {item.label}
                </span>
                {item.ready ? (
                  <Check className="h-4 w-4 text-red-700" />
                ) : (
                  <span className="text-xs text-stone-400">{index + 1}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={runAnalysis} disabled={activeAction !== null}>
          {activeAction === "analysis" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
          分析客户素材
        </Button>
        <Button variant="outline" onClick={runPlan} disabled={!analysis || activeAction !== null}>
          {activeAction === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          确认并生成方案
        </Button>
        <Button variant="outline" onClick={runPrompts} disabled={!currentPlan || activeAction !== null}>
          {activeAction === "prompts" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          生成提示词
        </Button>
      </div>

      {analysis ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-md bg-stone-50 p-4">
            <p className="text-xs font-medium text-stone-400">客户特征</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              {stringValue(analysis.faceShape)}；{stringValue(analysis.hair)}；
              {stringValue(analysis.skinTone)}
            </p>
          </div>
          <div className="rounded-md bg-stone-50 p-4">
            <p className="text-xs font-medium text-stone-400">建议保留</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              {stringList(analysis.preservedFeatures).join("、") || "待确认"}
            </p>
          </div>
        </div>
      ) : null}

      {currentPlan ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">已生成形象方案</p>
          <p className="mt-2 text-sm font-semibold text-stone-900">
            {stringValue(currentPlan.styleDirection)}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {stringValue(currentPlan.summary)}
          </p>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            商品：{stringList(currentPlan.productMatches).join("、") || selectedProducts.join("、") || "待确认"}
          </p>
        </div>
      ) : null}

      {currentPromptPackage ? (
        <div className="mt-4 rounded-md bg-stone-950 p-4 text-stone-100">
          <p className="text-xs font-medium text-red-300">已确认生图提示词</p>
          <p className="mt-2 text-sm leading-6">{currentPromptPackage.imagePrompt}</p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
