import { NextResponse } from "next/server";
import { fetchShopifyProducts, isShopifyConfigured } from "@/lib/shopify";

/**
 * GET /api/shopify/products — List Shopify products
 */
export async function GET() {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json({ error: "Shopify não configurado" }, { status: 400 });
    }

    const products = await fetchShopifyProducts(250);

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        variants: p.variants.map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          price: v.price,
          inventoryItemId: v.inventory_item_id,
          inventoryQuantity: v.inventory_quantity,
        })),
      })),
      total: products.length,
    });
  } catch (err) {
    console.error("Shopify products error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
