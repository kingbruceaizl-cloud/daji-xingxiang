import { createAiErrorResponse } from "@/lib/ai/errors";
import {
  assertStructuredPayloadSize,
  submitStructuredJob,
} from "@/lib/ai/structured-job";
import { promptPackageSchema } from "@/lib/ai/structured-schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    assertStructuredPayloadSize(body, "提示词方案");
    const plan = body.plan && typeof body.plan === "object" ? body.plan : {};
    const prompt = [
      "你是大吉形象的 AI 生成提示词专家。",
      "根据顾问已确认的形象方案，输出一份生图正向提示词、负向提示词、变装视频提示词和按顺序排列的镜头方案。",
      "必须强调保持客户身份与五官一致、真实肤质、商品结构准确和画面安全。",
      `已确认形象方案：${JSON.stringify(plan)}`,
      `视频比例：${String(body.aspectRatio || "9:16")}`,
      `目标时长：${String(body.durationSeconds || 13)} 秒`,
      `顾问补充：${String(body.notes || "无")}`,
      "严格按约定的 JSON 结构返回。",
    ].join("。");
    const job = await submitStructuredJob({
      request,
      body,
      jobType: "text_generation",
      prompt,
      responseName: "generation_prompt_package",
      responseSchema: promptPackageSchema,
      structuredTask: "prompt_package",
    });

    return NextResponse.json(
      { ok: true, job },
      { status: job.status === "pending" ? 202 : 200 },
    );
  } catch (error) {
    const response = createAiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
