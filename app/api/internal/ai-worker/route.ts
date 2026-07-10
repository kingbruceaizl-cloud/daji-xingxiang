import { createAiErrorResponse } from "@/lib/ai/errors";
import { runAiWorkerBatch } from "@/lib/ai/job-orchestrator";
import { authorizeAiWorker } from "@/lib/ai/worker-auth";
import { NextResponse } from "next/server";

export const maxDuration = 300;

async function handle(request: Request) {
  const authorization = authorizeAiWorker(request);
  if (!authorization.ok) {
    return NextResponse.json(
      { ok: false, message: authorization.message },
      { status: authorization.status },
    );
  }

  try {
    const result = await runAiWorkerBatch({
      limit: Number(process.env.AI_WORKER_BATCH_SIZE || 1),
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const response = createAiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
