import { requireAdminAccess, parsePrice, parseTags } from "@/lib/admin-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { supabase, response } = await requireAdminAccess();
  if (!supabase) {
    return response;
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "商品名称不能为空。" },
      { status: 400 },
    );
  }

  let categoryId = body.categoryId || null;

  if (!categoryId && body.categoryName) {
    const slug = String(body.categoryName)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    const { data: category, error: categoryError } = await supabase
      .from("product_categories")
      .upsert(
        {
          name: String(body.categoryName).trim(),
          slug,
          is_active: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (categoryError) {
      return NextResponse.json(
        { ok: false, message: `商品分类保存失败：${categoryError.message}` },
        { status: 400 },
      );
    }

    categoryId = category.id;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      category_id: categoryId,
      name,
      type: body.type === "sku" ? "sku" : "asset",
      sku: body.sku || null,
      price: parsePrice(body.price),
      purchase_url: body.purchaseUrl || null,
      image_url: body.imageUrl || null,
      prompt_text: body.promptText || "",
      tags: parseTags(body.tags),
      is_active: body.isActive ?? true,
    })
    .select("id,name,type,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: `商品保存失败：${error.message}` },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, product: data, message: "商品已保存。" });
}
