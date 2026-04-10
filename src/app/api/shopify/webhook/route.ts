import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  mapShopifyFulfillmentStatus,
  generateOrderNumber,
  type ShopifyOrder,
} from "@/lib/shopify";

/**
 * POST /api/shopify/webhook — Receives Shopify webhook events
 *
 * Supported topics:
 * - orders/create
 * - orders/updated
 * - orders/paid
 * - orders/cancelled
 */
export async function POST(request: Request) {
  try {
    const topic = request.headers.get("x-shopify-topic");
    const body: ShopifyOrder = await request.json();

    console.log(`[Shopify Webhook] Topic: ${topic}, Order: ${body.name || body.id}`);

    switch (topic) {
      case "orders/create":
      case "orders/paid":
        await handleOrderCreateOrPaid(body);
        break;
      case "orders/updated":
        await handleOrderUpdated(body);
        break;
      case "orders/cancelled":
        await handleOrderCancelled(body);
        break;
      default:
        console.log(`[Shopify Webhook] Unhandled topic: ${topic}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Shopify Webhook] Error:", err);
    // Always return 200 to prevent Shopify from retrying
    return NextResponse.json({ success: false, error: String(err) });
  }
}

async function handleOrderCreateOrPaid(so: ShopifyOrder) {
  const shopifyOrderId = String(so.id);

  // Check if already exists
  const existing = await prisma.order.findUnique({
    where: { shopifyOrderId },
  });

  if (existing) {
    // Update status if order already exists
    const orderStatus = mapShopifyFulfillmentStatus(
      so.fulfillment_status,
      so.financial_status
    );
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        status: orderStatus,
        paidAt: so.financial_status === "paid" ? new Date(so.created_at) : undefined,
      },
    });
    return;
  }

  // Find or create customer
  const customer = await findOrCreateCustomer(so);

  const subtotal = parseFloat(so.subtotal_price) || 0;
  const shipping = parseFloat(so.total_shipping_price_set?.shop_money?.amount || "0") || 0;
  const discount = parseFloat(so.total_discounts) || 0;
  const total = parseFloat(so.total_price) || 0;
  const feeShopify = total > 0 ? parseFloat((total * 0.029 + 0.3).toFixed(2)) : 0;
  const income = total - feeShopify;

  const orderStatus = mapShopifyFulfillmentStatus(
    so.fulfillment_status,
    so.financial_status
  );

  const orderNumber = generateOrderNumber(so.name, new Date(so.created_at));
  const numberExists = await prisma.order.findUnique({ where: { orderNumber } });
  const finalOrderNumber = numberExists
    ? `${orderNumber}-S${shopifyOrderId.slice(-4)}`
    : orderNumber;

  await prisma.order.create({
    data: {
      orderNumber: finalOrderNumber,
      source: "SHOPIFY",
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
      paidAt: so.financial_status === "paid" ? new Date(so.created_at) : null,
      date: new Date(so.created_at),
      notes: so.note || undefined,
    },
  });

  console.log(`[Shopify Webhook] Created order ${finalOrderNumber} from ${so.name}`);
}

async function handleOrderUpdated(so: ShopifyOrder) {
  const shopifyOrderId = String(so.id);
  const existing = await prisma.order.findUnique({
    where: { shopifyOrderId },
  });

  if (!existing) {
    // Order doesn't exist yet — create it
    await handleOrderCreateOrPaid(so);
    return;
  }

  const orderStatus = mapShopifyFulfillmentStatus(
    so.fulfillment_status,
    so.financial_status
  );

  await prisma.order.update({
    where: { id: existing.id },
    data: {
      status: orderStatus,
      paidAt: so.financial_status === "paid" && !existing.paidAt
        ? new Date()
        : undefined,
    },
  });
}

async function handleOrderCancelled(so: ShopifyOrder) {
  const shopifyOrderId = String(so.id);
  const existing = await prisma.order.findUnique({
    where: { shopifyOrderId },
  });

  if (existing) {
    await prisma.order.update({
      where: { id: existing.id },
      data: { status: "CANCELADO" },
    });
  }
}

async function findOrCreateCustomer(so: ShopifyOrder) {
  const sc = so.customer;
  const email = sc?.email || so.email;
  const addr = so.shipping_address || so.billing_address || sc?.default_address;

  if (email) {
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) return existing;
  }

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
