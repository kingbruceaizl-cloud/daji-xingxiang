import { buildImagePrompt } from "@/lib/ai";
import {
  createRealAiProviderLoginMessage,
  normalizeAiProvider,
  realAiProviderRequiresLogin,
} from "@/lib/ai/access";
import { resolveAiModelRoute } from "@/lib/ai/model-routing";
import { createAiErrorResponse } from "@/lib/ai/errors";
import { createAndDispatchAiJob } from "@/lib/ai/job-orchestrator";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { resolveAiInputAssets } from "@/lib/assets/resolve-ai-input";
import { after, NextResponse } from "next/server";
import { runAiWorkerBatch } from "@/lib/ai/job-orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt =
      body.prompt ||
      buildImagePrompt({
        styleName: body.styleName,
        selectedProducts: body.selectedProducts,
        extraPrompt: body.extraPrompt,
      });

    const requestedInputImageUrls: string[] = Array.isArray(body.inputImageUrls)
      ? body.inputImageUrls.map(String)
      : [];
    const inputAssetIds: string[] = Array.isArray(body.inputAssetIds)
      ? body.inputAssetIds.map(String)
      : [];
    const hasInput = inputAssetIds.length || requestedInputImageUrls.length;
    const jobType = hasInput ? "image_to_image" : "text_to_image";
    const ownerId = await getCurrentUserId();
    const modelRoute = await resolveAiModelRoute(jobType, {
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
          message: "真实生成只接受已上传素材的编号，请重新上传客户图片。",
        },
        { status: 400 },
      );
    }

    const input = {
      provider,
      model: modelRoute.model || undefined,
      jobType,
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
        await runAiWorkerBatch({ limit: 1 });
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
