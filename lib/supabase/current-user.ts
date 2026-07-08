import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export async function getCurrentUserId() {
  if (!hasEnvVars) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;
    return typeof subject === "string" ? subject : null;
  } catch {
    return null;
  }
}
