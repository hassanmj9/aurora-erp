import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { createOrderFromInvoice, registerPayment } from '@/lib/actions';
import { OrderSource, OrderStatus, InstrumentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

/**
 * Shopify Webhook Handler for Aurora Violins ERP
 *
 * Handles: orders/create, orders/paid, orders/fulfilled, orders/cancelled
 *
 * Flow for orders/create:
 * 1. Verify HMAC signature
 * 2. Find or create customer by email
 * 3. Match Shopify variant IDs → Model → find available instruments in stock
 * 4. Create order via createOrderFromInvoice (links serials, calculates financials)
 */

// ─── HMAC Verification ───

function verifyHmac(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('SHOPIFY_WEBHOOK_SECRET not set');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}

// ─── Customer lookup/create ───

async function getOrCreateCustomer(shopifyCustomer: any, email: string) {
  // Try to find by email first
  if (email) {
    const existing = await prisma.customer.findUnique({
      where: { email },
    });
    if (existing) return existing;
  }

  // Create new customer
  const name = [
    shopifyCustomer?.first_name || '',
    shopifyCustomer?.last_name || '',
  ]
    .filter(Boolean)
    .join(' ') || 'Cliente Shopify';

  const address = shopifyCustomer?.default_address;

  return prisma.customer.create({
    data: {
      name,
      email: email || null,
      phone: shopifyCustomer?.phone || address?.phone || null,
      address: address
        ? [address.address1, address.address2].filter(Boolean).join(', ')
        : null,
      city: address?.city || null,
      state: address?.province || null,
      country: address?.country || null,
      zipCode: address?.zip || null,
      source: 'shopify',
    },
  });
}

// ─── Orders/Create ───

async function handleOrderCreate(payload: any) {
  const {
    id: shopifyOrderId,
    order_number: shopifyOrderNumber,
    email,
    customer: shopifyCustomer,
    line_items,
    subtotal_price,
    total_shipping_price_set,
    total_discounts,
  } = payload;

  // Check for duplicate
  const existing = await prisma.order.findUnique({
    where: { shopifyOrderId: String(shopifyOrderId) },
  });
  if (existing) {
    console.log(`Shopify order ${shopifyOrderId} already exists, skipping`);
    return;
  }

  // Get or create customer
  const customer = await getOrCreateCustomer(shopifyCustomer, email);

  // Find available instruments for each line item
  const instrumentSerials: string[] = [];

  for (const item of line_items) {
    const variantId = String(item.variant_id);

    // Find model by Shopify variant ID
    const model = await prisma.model.findFirst({
      where: { shopifyVariantId: variantId },
    });

    if (!model) {
      console.warn(`No model found for Shopify variant ${variantId} (${item.title})`);
      continue;
    }

    // Find available instruments in stock for this model
    for (let i = 0; i < item.quantity; i++) {
      const instrument = await prisma.instrument.findFirst({
        where: {
          modelId: model.id,
          status: InstrumentStatus.EM_ESTOQUE,
          orderId: null,
        },
        orderBy: { createdAt: 'asc' }, // FIFO
      });

      if (instrument) {
        instrumentSerials.push(instrument.serial);
      } else {
        console.warn(`No available instrument in stock for model ${model.name} (variant ${variantId})`);
      }
    }
  }

  if (instrumentSerials.length === 0) {
    console.error(`No instruments available for Shopify order ${shopifyOrderId}`);
    // Still create the order but log the issue
  }

  // Calculate Shopify fees (~2.9% + $0.30 for Shopify Payments)
  const subtotal = new Decimal(subtotal_price || 0);
  const shippingCharge = new Decimal(
    total_shipping_price_set?.shop_money?.amount || 0
  );
  const discount = new Decimal(total_discounts || 0);
  const total = subtotal.plus(shippingCharge).minus(discount);
  const estimatedShopifyFee = total.times(0.029).plus(0.30).toDecimalPlaces(2);

  // Create order via business logic
  const order = await createOrderFromInvoice(prisma, {
    customerId: customer.id,
    instrumentSerials,
    source: OrderSource.SHOPIFY,
    subtotal,
    shippingCharge,
    discount,
    fees: {
      shopify: estimatedShopifyFee,
    },
    notes: `Shopify Order #${shopifyOrderNumber}`,
  });

  // Update with Shopify IDs
  await prisma.order.update({
    where: { id: order.id },
    data: {
      shopifyOrderId: String(shopifyOrderId),
      shopifyOrderNumber: String(shopifyOrderNumber),
    },
  });

  console.log(`Created order ${order.orderNumber} from Shopify #${shopifyOrderNumber}`);
}

// ─── Orders/Paid ───

async function handleOrderPaid(payload: any) {
  const order = await prisma.order.findFirst({
    where: { shopifyOrderId: String(payload.id) },
  });

  if (!order) {
    console.warn(`Order not found for Shopify ID ${payload.id}`);
    return;
  }

  if (order.status === OrderStatus.PAGO || order.paidAt) {
    console.log(`Order ${order.orderNumber} already paid, skipping`);
    return;
  }

  await registerPayment(prisma, order.id);
  console.log(`Payment registered for order ${order.orderNumber}`);
}

// ─── Orders/Fulfilled ───

async function handleOrderFulfilled(payload: any) {
  const order = await prisma.order.findFirst({
    where: { shopifyOrderId: String(payload.id) },
  });

  if (!order) {
    console.warn(`Order not found for Shopify ID ${payload.id}`);
    return;
  }

  // Note: Actual shipment creation is done manually in the ERP
  // because we need to select the carrier, enter tracking, etc.
  // Here we just mark the order as ENVIADO if it's not already
  if (order.status === OrderStatus.PAGO || order.status === OrderStatus.PREPARANDO) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.ENVIADO },
    });
    console.log(`Order ${order.orderNumber} marked as ENVIADO from Shopify fulfillment`);
  }
}

// ─── Orders/Cancelled ───

async function handleOrderCancelled(payload: any) {
  const order = await prisma.order.findFirst({
    where: { shopifyOrderId: String(payload.id) },
  });

  if (!order) {
    console.warn(`Order not found for Shopify ID ${payload.id}`);
    return;
  }

  // Release instruments back to stock
  const instruments = await prisma.instrument.findMany({
    where: { orderId: order.id },
  });

  for (const instrument of instruments) {
    await prisma.instrument.update({
      where: { id: instrument.id },
      data: {
        status: InstrumentStatus.EM_ESTOQUE,
        location: 'CASA_EUA',
        orderId: null,
        customerId: null,
      },
    });

    await prisma.instrumentEvent.create({
      data: {
        instrumentId: instrument.id,
        fromStatus: instrument.status,
        toStatus: InstrumentStatus.EM_ESTOQUE,
        description: `Pedido cancelado - Retornado ao estoque`,
        metadata: { orderId: order.id },
      },
    });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.CANCELADO },
  });

  console.log(`Order ${order.orderNumber} cancelled from Shopify`);
}

// ─── Main Handler ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');

    if (!hmac || !topic) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    if (!verifyHmac(body, hmac)) {
      console.warn('Invalid Shopify webhook HMAC');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);

    switch (topic) {
      case 'orders/create':
        await handleOrderCreate(payload);
        break;
      case 'orders/paid':
        await handleOrderPaid(payload);
        break;
      case 'orders/fulfilled':
        await handleOrderFulfilled(payload);
        break;
      case 'orders/cancelled':
        await handleOrderCancelled(payload);
        break;
      default:
        console.warn(`Unhandled Shopify topic: ${topic}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    // Still return 200 to prevent Shopify retries for app errors
    return NextResponse.json({ ok: true, error: 'Internal error logged' });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'Shopify webhook handler ready' });
}
