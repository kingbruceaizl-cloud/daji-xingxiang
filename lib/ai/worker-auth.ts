import { timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function authorizeAiWorker(request: Request) {
  const expectedSecrets = [
    process.env.AI_WORKER_SECRET,
    process.env.CRON_SECRET,
  ]
    .map((value) => value?.trim() || "")
    .filter(Boolean);
  if (!expectedSecrets.length) {
    return { ok: false as const, status: 503, message: "后台任务密钥尚未配置。" };
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const direct = request.headers.get("x-ai-worker-secret")?.trim() || "";
  const supplied = bearer || direct;

  if (!supplied || !expectedSecrets.some((expected) => safeEqual(supplied, expected))) {
    return { ok: false as const, status: 401, message: "后台任务请求未通过校验。" };
  }

  return { ok: true as const };
}
