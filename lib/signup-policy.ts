export function isPublicSignupEnabled() {
  return process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === "true";
}
