import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  fetchShopifyProducts,
  fetchLocations,
  setInventoryLevel,
  isShopifyConfigured,
} from "@/lib/shopify";

/**
 * GET /api/shopify/inventory — Get inventory comparison (Aurora vs Shopify)
 */
export async function GET() {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json({ error: "Shopify não configurado" }, { status: 400 });
    }

    // Get Aurora stock counts by model
    const auroraStock = await prisma.instrument.groupBy({
      by: ["modelType", "color", "strings"],
      where: { status: "EM_ESTOQUE" },
      _count: true,
    });

    // Get Shopify products with inventory
    const products = await fetchShopifyProducts(250);

    // Get models with shopify IDs
    const models = await prisma.model.findMany({
      where: { shopifyProductId: { not: null } },
      select: {
        id: true,
        type: true,
        strings: true,
        color: true,
        shopifyProductId: true,
        shopifyVariantId: true,
      },
    });

    return NextResponse.json({
      auroraStock: auroraStock.map((s) => ({
        modelType: s.modelType,
        color: s.color,
        strings: s.strings,
        count: s._count,
      })),
      shopifyProducts: products.map((p) => ({
        id: p.id,
        title: p.title,
        variants: p.variants.map((v) => ({
          id: v.id,
          title: v.title,
          sku: v.sku,
          inventory: v.inventory_quantity,
        })),
      })),
      linkedModels: models.length,
    });
  } catch (err) {
    console.error("Shopify inventory error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shopify/inventory — Push Aurora stock levels to Shopify
 */
export async function POST() {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json({ error: "Shopify não configurado" }, { status: 400 });
    }

    // Get models linked to Shopify
    const models = await prisma.model.findMany({
      where: {
        shopifyProductId: { not: null },
        shopifyVariantId: { not: null },
      },
    });

    if (models.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum modelo vinculado ao Shopify. Vincule modelos primeiro.",
        updated: 0,
      });
    }

    // Get locations
    const locations = await fetchLocations();
    if (locations.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma location encontrada no Shopify" },
        { status: 400 }
      );
    }
    const locationId = locations[0].id;

    // Get all Shopify products to find inventory_item_ids
    const products = await fetchShopifyProducts(250);
    const variantMap = new Map<string, number>(); // variantId → inventoryItemId
    for (const p of products) {
      for (const v of p.variants) {
        variantMap.set(String(v.id), v.inventory_item_id);
      }
    }

    let updated = 0;
    const errors: string[] = [];

    for (const model of models) {
      try {
        // Count available instruments for this model
        const count = await prisma.instrument.count({
          where: {
            modelId: model.id,
            status: "EM_ESTOQUE",
          },
        });

        const inventoryItemId = variantMap.get(model.shopifyVariantId!);
        if (!inventoryItemId) {
          errors.push(`${model.name}: variant não encontrada no Shopify`);
          continue;
        }

        await setInventoryLevel(inventoryItemId, locationId, count);
        updated++;
      } catch (err) {
        errors.push(
          `${model.name}: ${err instanceof Error ? err.message : "Erro"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      total: models.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Shopify inventory sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
