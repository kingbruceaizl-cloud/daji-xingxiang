import { demoProducts } from "@/lib/demo-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminProductItem = {
  id?: string;
  name: string;
  type: "sku" | "asset";
  categoryName: string;
  sku: string;
  price: number | null;
  purchaseUrl: string;
  imageUrl: string;
  promptText: string;
  tags: string[];
  isActive: boolean;
};

export async function getAdminProductsData(): Promise<{
  source: "supabase" | "demo";
  products: AdminProductItem[];
}> {
  const supabase = createAdminClient();
  if (!supabase) {
    return {
      source: "demo",
      products: demoProducts.map((product, index) => ({
        id: `demo-product-${index + 1}`,
        name: product.name,
        type: product.type === "真实商品" ? "sku" : "asset",
        categoryName: product.category || "其他",
        sku: "",
        price: product.price?.startsWith("¥")
          ? Number(product.price.slice(1))
          : null,
        purchaseUrl: "",
        imageUrl: product.image || "",
        promptText: `${product.name}，${product.category}形象搭配素材`,
        tags: [product.category || "其他"],
        isActive: true,
      })),
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,name,type,sku,price,purchase_url,image_url,prompt_text,tags,is_active,product_categories(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { source: "demo", products: [] };
  }

  return {
    source: "supabase",
    products: (data || []).map((product) => {
      const relation = product.product_categories;
      const category = Array.isArray(relation) ? relation[0] : relation;

      return {
        id: product.id,
        name: product.name,
        type: product.type === "sku" ? "sku" : "asset",
        categoryName: category?.name || "其他",
        sku: product.sku || "",
        price:
          product.price === null || product.price === undefined
            ? null
            : Number(product.price),
        purchaseUrl: product.purchase_url || "",
        imageUrl: product.image_url || "",
        promptText: product.prompt_text || "",
        tags: product.tags || [],
        isActive: Boolean(product.is_active),
      };
    }),
  };
}
