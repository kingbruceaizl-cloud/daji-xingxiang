import { getProjectsData } from "@/lib/projects";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export async function GET() {
  const data = await getProjectsData();
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "未命名形象项目").trim();
  const customerName = body.customerName ? String(body.customerName).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;
  const supabase = createAdminClient();
  const ownerId = await getCurrentUserId();

  if (!supabase || !ownerId) {
    const now = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      source: "local",
      project: {
        id: `local-${randomUUID()}`,
        name,
        status: "本地草稿",
        customer_name: customerName,
        notes,
        created_at: now,
        updated_at: now,
      },
      message: "已创建本地项目。",
    });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: ownerId,
      name,
      customer_name: customerName,
      status: "草稿",
      notes,
    })
    .select("id,name,status,customer_name,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("创建项目") },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    source: "supabase",
    project: data,
    message: "项目已创建。",
  });
}
