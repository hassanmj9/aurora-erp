import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  fetchShopifyOrders,
  countShopifyOrders,
  isShopifyConfigured,
  mapShopifyFinancialStatus,
  mapShopifyFulfillmentStatus,
  generateOrderNumber,
  type ShopifyOrder,
} from "@/lib/shopify";

/**
 * GET /api/shopify/sync — Returns sync status (counts, last sync, etc.)
 */
export async function GET() {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json({ error: "Shopify não configurado" }, { status: 400 });
    }

    // Count orders in Shopify
    const shopifyCount = await countShopifyOrders();

    // Count synced orders in Aurora
    const auroraCount = await prisma.order.count({
      where: { source: "SHOPIFY", shopifyOrderId: { not: null } },
    });

    // Last synced order
    const lastSynced = await prisma.order.findFirst({
      where: { source: "SHOPIFY" },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true, shopifyOrderNumber: true, createdAt: true },
    });

    return NextResponse.json({
      shopifyTotal: shopifyCount,
      auroraSynced: auroraCount,
      pending: shopifyCount - auroraCount,
      lastSynced: lastSynced
        ? {
            orderNumber: lastSynced.orderNumber,
            shopifyNumber: lastSynced.shopifyOrderNumber,
            syncedAt: lastSynced.createdAt,
          }
        : null,
    });
  } catch (err) {
    console.error("Shopify sync status error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shopify/sync — Import/sync orders from Shopify into Aurora ERP
 */
export async function POST(request: Request) {
  try {
    if (!isShopifyConfigured()) {
      return NextResponse.json({ error: "Shopify não configurado" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const sinceDate = body.since || null; // Optional: "2024-01-01"

    // Fetch orders from Shopify
    const params: Record<string, unknown> = {
      status: "any",
      limit: 250,
    };
    if (sinceDate) {
      params.created_at_min = sinceDate;
    }

    const shopifyOrders = await fetchShopifyOrders(params as Parameters<typeof fetchShopifyOrders>[0]);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const so of shopifyOrders) {
      try {
        const result = await syncSingleOrder(so);
        if (result === "created") created++;
        else if (result === "updated") updated++;
        else skipped++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro";
        errors.push(`Order ${so.name}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: shopifyOrders.length,
      created,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Shopify sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}

/**
 * Sync a single Shopify order into Aurora
 */
async function syncSingleOrder(
  so: ShopifyOrder
): Promise<"created" | "updated" | "skipped"> {
  const shopifyOrderId = String(so.id);

  // Check if already exists
  const existing = await prisma.order.findUnique({
    where: { shopifyOrderId },
  });

  // Find or create customer
  const customer = await findOrCreateCustomer(so);

  const orderStatus = mapShopifyFulfillmentStatus(
    so.fulfillment_status,
    so.financial_status
  );

  const subtotal = parseFloat(so.subtotal_price) || 0;
  const shipping =
    parseFloat(so.total_shipping_price_set?.shop_money?.amount || "0") || 0;
  const discount = parseFloat(so.total_discounts) || 0;
  const total = parseFloat(so.total_price) || 0;

  // Estimate Shopify fees (~2.9% + $0.30 per transaction)
  const feeShopify = total > 0 ? parseFloat((total * 0.029 + 0.3).toFixed(2)) : 0;
  const income = total - feeShopify;

  const orderData = {
    source: "SHOPIFY" as const,
    shopifyOrderId,
    shopifyOrderNumber: so.name,
    customerId: customer.id,
    subtotal,
    shippingCharge: shipping,
    discount,
    total,
    feeShopify,
    totalFees: feeShopify,
    income,
    status: orderStatus,
    paidAt:
      so.financial_status === "paid" ? new Date(so.created_at) : null,
    date: new Date(so.created_at),
    notes: so.note || undefined,
  };

  if (existing) {
    // Update existing order
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        status: orderStatus,
        paidAt: orderData.paidAt,
        notes: orderData.notes,
        shopifyOrderNumber: so.name,
      },
    });
    return "updated";
  }

  // Generate order number
  const orderNumber = generateOrderNumber(so.name, new Date(so.created_at));

  // Check if orderNumber already exists (avoid collision)
  const numberExists = await prisma.order.findUnique({
    where: { orderNumber },
  });

  const finalOrderNumber = numberExists
    ? `${orderNumber}-S${shopifyOrderId.slice(-4)}`
    : orderNumber;

  // Create new order
  await prisma.order.create({
    data: {
      orderNumber: finalOrderNumber,
      ...orderData,
    },
  });

  return "created";
}

/**
 * Find existing customer by email or create a new one from Shopify data
 */
async function findOrCreateCustomer(so: ShopifyOrder) {
  const sc = so.customer;
  const email = sc?.email || so.email;
  const addr = so.shipping_address || so.billing_address || sc?.default_address;

  // Try to find by email first
  if (email) {
    const existing = await prisma.customer.findUnique({
      where: { email },
    });
    if (existing) return existing;
  }

  // Create new customer
  const name = sc
    ? `${sc.first_name || ""} ${sc.last_name || ""}`.trim()
    : addr
    ? `${addr.first_name || ""} ${addr.last_name || ""}`.trim()
    : "Shopify Customer";

  return prisma.customer.create({
    data: {
      name: name || "Shopify Customer",
      email: email || undefined,
      phone: sc?.phone || addr?.phone || undefined,
      address: addr ? `${addr.address1}${addr.address2 ? `, ${addr.address2}` : ""}` : undefined,
      city: addr?.city || undefined,
      state: addr?.province || undefined,
      country: addr?.country || undefined,
      zipCode: addr?.zip || undefined,
      source: "shopify",
    },
  });
}
