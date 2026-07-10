import { createAiErrorResponse } from "@/lib/ai/errors";
import {
  assertStructuredPayloadSize,
  submitStructuredJob,
} from "@/lib/ai/structured-job";
import { appearanceAnalysisSchema } from "@/lib/ai/structured-schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    assertStructuredPayloadSize(body, "客户分析");
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const prompt = [
      "你是专业形象顾问，请只根据客户图片中可见且可合理判断的信息进行分析。",
      "不要推断年龄、身份、健康、民族、宗教、性取向等敏感属性。",
      "给出可由形象顾问人工复核的客观描述、保留特征、搭配建议、可见文字和风险提示。",
      "无法确定的内容明确写为需要补充素材，不要编造。",
      notes ? `顾问补充说明：${notes}` : "",
      "严格按约定的 JSON 结构返回。",
    ]
      .filter(Boolean)
      .join("。");
    const job = await submitStructuredJob({
      request,
      body,
      jobType: "image_understanding",
      prompt,
      responseName: "appearance_analysis",
      responseSchema: appearanceAnalysisSchema,
      structuredTask: "appearance_analysis",
      requireImage: true,
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
