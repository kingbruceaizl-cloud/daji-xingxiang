export function formatAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "邮箱或密码不正确，请重新输入。";
  }

  if (message.includes("email not confirmed")) {
    return "请先完成邮箱验证，再登录大吉形象。";
  }

  if (message.includes("user already registered") || message.includes("already registered")) {
    return "这个邮箱已经注册，请直接登录。";
  }

  if (message.includes("password") && message.includes("at least")) {
    return "密码长度不符合要求，请设置更安全的新密码。";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "操作过于频繁，请稍后再试。";
  }

  if (message.includes("signup") && message.includes("disabled")) {
    return "当前暂未开放注册，请联系项目负责人开通账号。";
  }

  return fallback;
}
