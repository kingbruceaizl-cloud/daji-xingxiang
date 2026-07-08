import { getCatalogData } from "@/lib/catalog";
import { NextResponse } from "next/server";

export async function GET() {
  const data = await getCatalogData();

  return NextResponse.json({
    ok: true,
    data,
  });
}
