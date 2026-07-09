import { getProjectDetailById } from "@/lib/projects";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getProjectDetailById(id);

  return NextResponse.json({
    ok: true,
    ...detail,
  });
}
