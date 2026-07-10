import { AiServiceError } from "./errors";

export type AiExecutionMode = "mock" | "real";

function configuredMode() {
  return process.env.AI_EXECUTION_MODE?.trim().toLowerCase();
}

export function getAiExecutionMode(): AiExecutionMode {
  const mode = configuredMode();

  if (mode === "mock" || mode === "real") {
    return mode;
  }

  if (
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_APP_ENV === "production"
  ) {
    throw new AiServiceError(
      "AI_CONFIGURATION_ERROR",
      "正式环境缺少 AI_EXECUTION_MODE=real，真实生成已停止。",
      503,
    );
  }

  return "mock";
}

export function assertProviderAllowed(provider: string) {
  const mode = getAiExecutionMode();

  if (mode === "mock" && provider !== "mock") {
    throw new AiServiceError(
      "AI_CONFIGURATION_ERROR",
      "当前处于演示模式，不能调用真实模型。请由管理员切换到真实执行模式。",
      503,
    );
  }

  if (mode === "real" && provider === "mock") {
    throw new AiServiceError(
      "AI_CONFIGURATION_ERROR",
      "正式环境禁止返回演示结果，请检查模型路由和火山方舟配置。",
      503,
    );
  }
}
