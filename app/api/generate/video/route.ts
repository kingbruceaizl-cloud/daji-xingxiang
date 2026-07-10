import { createAiJob } from "@/lib/ai";
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

    const inputImageUrls: string[] = Array.isArray(body.inputImageUrls)
      ? body.inputImageUrls.map(String)
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

    if (provider === "kie" && inputImageUrls.some((url) => url.startsWith("data:"))) {
      return NextResponse.json(
        {
          ok: false,
          message: "KIE 视频任务需要线上可访问的形象图；请先使用已转存的生成结果。",
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
      model: modelRoute.model || (provider === "mock" ? "mock-video-v1" : undefined),
      jobType: "image_to_video",
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
      { ok: false, message: createSafeServerErrorMessage("创建视频任务") },
      { status: 400 },
    );
  }
}
