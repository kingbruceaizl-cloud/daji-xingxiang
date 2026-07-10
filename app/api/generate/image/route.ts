import { createAiJob, buildImagePrompt } from "@/lib/ai";
import {
  createRealAiProviderLoginMessage,
  normalizeAiProvider,
  realAiProviderRequiresLogin,
} from "@/lib/ai/access";
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

    const ownerId = await getCurrentUserId();
    const provider = normalizeAiProvider(body.provider);
    if (realAiProviderRequiresLogin(provider) && !ownerId) {
      return NextResponse.json(
        { ok: false, message: createRealAiProviderLoginMessage(provider) },
        { status: 401 },
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
      model: body.model,
      jobType: body.inputImageUrls?.length ? "image_to_image" : "text_to_image",
      prompt,
      projectId: body.projectId,
      inputImageUrls: body.inputImageUrls,
      selectedProducts: body.selectedProducts,
      styleName: body.styleName,
      ownerId,
      callbackUrl: callbackUrl.toString(),
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
