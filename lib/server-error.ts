export function createSafeServerErrorMessage(action: string) {
  return `${action}失败，请稍后重试。`;
}

export function createSafeStorageErrorMessage(action: string) {
  return `${action}失败，请检查存储配置后重试。`;
}
