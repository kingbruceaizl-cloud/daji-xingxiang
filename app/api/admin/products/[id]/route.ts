import { parsePrice, parseTags, requireAdminAccess } from "@/lib/admin-api";
import { createSafeServerErrorMessage } from "@/lib/server-error";
import { NextResponse } from "next/server";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, response } = await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, message: "商品编号无效。" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.isActive === "boolean") {
    updates.is_active = body.isActive;
  }

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { ok: false, message: "商品名称不能为空。" },
        { status: 400 },
      );
    }

    updates.name = name;
    updates.type = body.type === "sku" ? "sku" : "asset";
    updates.sku = body.sku || null;
    updates.price = parsePrice(body.price);
    updates.purchase_url = body.purchaseUrl || null;
    updates.image_url = body.imageUrl || null;
    updates.prompt_text = body.promptText || "";
    updates.tags = parseTags(body.tags);

    if (body.categoryName) {
      const categoryName = String(body.categoryName).trim();
      const slug = categoryName.toLowerCase().replace(/\s+/g, "-");
      const { data: category, error: categoryError } = await supabase
        .from("product_categories")
        .upsert(
          { name: categoryName, slug, is_active: true },
          { onConflict: "slug" },
        )
        .select("id")
        .single();

      if (categoryError) {
        return NextResponse.json(
          { ok: false, message: createSafeServerErrorMessage("商品分类保存") },
          { status: 400 },
        );
      }
      updates.category_id = category.id;
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json(
      { ok: false, message: "没有需要更新的商品内容。" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select("id,name,type,is_active,updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: createSafeServerErrorMessage("商品更新") },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, product: data, message: "商品已更新。" });
}
