import { getLaunchReadiness } from "@/lib/launch-readiness";
import { NextResponse } from "next/server";

export async function GET() {
  const readiness = await getLaunchReadiness();

  return NextResponse.json({
    ok: true,
    ...readiness,
  });
}
