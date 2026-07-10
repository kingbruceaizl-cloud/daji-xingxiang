import { createAiErrorResponse } from "@/lib/ai/errors";
import {
  assertStructuredPayloadSize,
  submitStructuredJob,
} from "@/lib/ai/structured-job";
import { appearancePlanSchema } from "@/lib/ai/structured-schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    assertStructuredPayloadSize(body, "形象方案");
    const analysis = body.analysis && typeof body.analysis === "object"
      ? body.analysis
      : {};
    const selectedProducts = Array.isArray(body.selectedProducts)
      ? body.selectedProducts.map(String)
      : [];
    const prompt = [
      "你是大吉形象的专业形象方案助手。",
      "根据已经确认的客户分析、使用场合、风格与商品，生成可由形象顾问编辑的结构化方案。",
      "不要改变客户身份特征，不要作医学判断，商品信息不足时标记待确认。",
      `客户分析：${JSON.stringify(analysis)}`,
      `目标场合：${String(body.occasion || "通勤与日常社交")}`,
      `目标风格：${String(body.styleName || "高级通勤")}`,
      `候选商品：${selectedProducts.join("、") || "由系统推荐"}`,
      `顾问补充：${String(body.notes || "无")}`,
      "严格按约定的 JSON 结构返回。",
    ].join("。");
    const job = await submitStructuredJob({
      request,
      body,
      jobType: "text_generation",
      prompt,
      responseName: "appearance_plan",
      responseSchema: appearancePlanSchema,
      structuredTask: "appearance_plan",
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
