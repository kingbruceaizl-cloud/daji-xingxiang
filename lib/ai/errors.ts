export type AiErrorCode =
  | "AI_CONFIGURATION_ERROR"
  | "AI_PROVIDER_NOT_SUPPORTED"
  | "AI_PROVIDER_REQUEST_FAILED"
  | "AI_PROVIDER_RESPONSE_INVALID"
  | "AI_PERSISTENCE_REQUIRED"
  | "AI_RESULT_PERSISTENCE_FAILED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_ACCESS_DENIED";

export class AiServiceError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;

  constructor(code: AiErrorCode, message: string, status = 500) {
    super(message);
    this.name = "AiServiceError";
    this.code = code;
    this.status = status;
  }
}

export function createAiErrorResponse(error: unknown) {
  if (error instanceof AiServiceError) {
    return {
      status: error.status,
      body: { ok: false, code: error.code, message: error.message },
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      code: "AI_PROVIDER_REQUEST_FAILED" as const,
      message: "生成服务暂时不可用，请稍后重试。",
    },
  };
}
