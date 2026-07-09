export function normalizeAiProvider(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : "mock";
}

export function realAiProviderRequiresLogin(provider: string) {
  return provider !== "mock";
}

export function createRealAiProviderLoginMessage(provider: string) {
  return `真实模型通道 ${provider} 需要先登录后再生成，演示体验请使用 mock 通道。`;
}
