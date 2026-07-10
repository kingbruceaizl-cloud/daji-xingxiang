import {
  createRealAiProviderLoginMessage,
  normalizeAiProvider,
  realAiProviderRequiresLogin,
} from "@/lib/ai/access";
import { resolveAiModelRoute } from "@/lib/ai/model-routing";
import { createAiErrorResponse } from "@/lib/ai/errors";
import {
  createAndDispatchAiJob,
  runAiWorkerBatch,
} from "@/lib/ai/job-orchestrator";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { resolveAiInputAssets } from "@/lib/assets/resolve-ai-input";
import { after, NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const videoConfigText = [
      body.videoTemplateName ? `短视频模板：${body.videoTemplateName}。` : "",
      body.scriptTemplateName ? `脚本文案：${body.scriptTemplateName}。` : "",
      body.musicTrackName ? `音乐选择：${body.musicTrackName}。` : "",
    ]
      .filter(Boolean)
      .join("");
    const prompt =
      body.prompt ||
      `基于选中的形象图生成 9:16 变装短视频，纯白棚拍背景，快速旋转换装，商品清单卡片叠加。${videoConfigText}`;

    const requestedInputImageUrls: string[] = Array.isArray(body.inputImageUrls)
      ? body.inputImageUrls.map(String)
      : [];
    const inputAssetIds: string[] = Array.isArray(body.inputAssetIds)
      ? body.inputAssetIds.map(String)
      : [];
    const ownerId = await getCurrentUserId();
    const modelRoute = await resolveAiModelRoute("image_to_video", {
      provider: body.provider,
      model: body.model,
    });
    const provider = normalizeAiProvider(modelRoute.provider);
    if (realAiProviderRequiresLogin(provider) && !ownerId) {
      return NextResponse.json(
        { ok: false, message: createRealAiProviderLoginMessage(provider) },
        { status: 401 },
      );
    }

    const inputImageUrls =
      provider === "mock"
        ? requestedInputImageUrls
        : await resolveAiInputAssets({
            assetIds: inputAssetIds,
            ownerId,
            projectId: body.projectId,
          });

    if (provider !== "mock" && requestedInputImageUrls.length && !inputAssetIds.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "真实视频任务需要使用已经保存到素材库的形象图。",
        },
        { status: 400 },
      );
    }

    const input = {
      provider,
      model: modelRoute.model || (provider === "mock" ? "mock-video-v1" : undefined),
      jobType: "image_to_video",
      prompt,
      projectId: body.projectId,
      inputImageUrls,
      inputAssetIds,
      selectedProducts: body.selectedProducts,
      styleName: body.styleName,
      ownerId,
      idempotencyKey:
        request.headers.get("idempotency-key") || body.idempotencyKey || undefined,
      modelRouteKey: modelRoute.taskKey,
      modelRouteSource: modelRoute.source,
      modelRouteParams: modelRoute.defaultParams,
    } as const;

    const job = await createAndDispatchAiJob(input);

    if (job.provider !== "mock" && job.status === "pending") {
      after(async () => {
        try {
          await runAiWorkerBatch({ limit: 1 });
        } catch {
          // The scheduled worker remains the durable fallback.
        }
      });
    }

    return NextResponse.json(
      { ok: true, job },
      { status: job.status === "pending" ? 202 : 200 },
    );
  } catch (error) {
    const response = createAiErrorResponse(error);
    return NextResponse.json(
      response.body,
      { status: response.status },
    );
  }
}
