import { createAiJob, buildImagePrompt } from "@/lib/ai";
import {
  createRealAiProviderLoginMessage,
  normalizeAiProvider,
  realAiProviderRequiresLogin,
} from "@/lib/ai/access";
import { resolveAiModelRoute } from "@/lib/ai/model-routing";
import { persistAiJob } from "@/lib/ai/persistence";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { NextResponse } from "next/server";

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

    const inputImageUrls: string[] = Array.isArray(body.inputImageUrls)
      ? body.inputImageUrls.map(String)
      : [];
    const jobType = inputImageUrls.length ? "image_to_image" : "text_to_image";
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

    if (provider === "kie" && inputImageUrls.some((url) => url.startsWith("data:"))) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "KIE 图生图需要线上可访问的客户素材；请配置 Supabase 后上传素材，或先使用演示通道。",
        },
        { status: 400 },
      );
    }

    const callbackUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/provider-callback/kie`,
    );

    if (process.env.KIE_CALLBACK_SECRET) {
      callbackUrl.searchParams.set("secret", process.env.KIE_CALLBACK_SECRET);
    }

    const input = {
      provider,
      model: modelRoute.model || undefined,
      jobType,
      prompt,
      projectId: body.projectId,
      inputImageUrls,
      selectedProducts: body.selectedProducts,
      styleName: body.styleName,
      ownerId,
      callbackUrl: callbackUrl.toString(),
      modelRouteKey: modelRoute.taskKey,
      modelRouteSource: modelRoute.source,
      modelRouteParams: modelRoute.defaultParams,
    } as const;

    const job = await createAiJob(input);
    const persistence = await persistAiJob(input, job);

    return NextResponse.json({ ok: true, job, persistence });
  } catch {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("创建生图任务") },
      { status: 400 },
    );
  }
}
