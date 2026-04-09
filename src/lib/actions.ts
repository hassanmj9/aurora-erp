import {
  PrismaClient,
  InstrumentStatus,
  OrderStatus,
  ShipmentStatus,
  ModelType,
  OrderSource,
  ShipmentCarrier,
  ShipmentOrigin,
  FinancialType,
  FinancialCategory,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { generateSerialForInstrument } from "./serial";
import { getExchangeRate } from "./exchange-rate";
import { calculateOrderFinancials, generateOrderNumber } from "./utils";

/**
 * Create a new instrument with auto-generated serial
 * Initializes with status EM_PRODUCAO and creates corresponding InstrumentEvent
 */
export async function createInstrument(
  prisma: PrismaClient,
  data: {
    modelId: string;
    series?: string;
    year?: number;
    month?: number;
    productionOrderId?: string;
    notes?: string;
  }
) {
  // Fetch the model to get type, strings, color code
  const model = await prisma.model.findUniqueOrThrow({
    where: { id: data.modelId },
  });

  // Generate serial number
  const serial = await generateSerialForInstrument(prisma, {
    modelType: model.type,
    strings: model.strings,
    color: model.colorCode,
    series: data.series,
    year: data.year,
    month: data.month,
  });

  // Create instrument with transaction
  const instrument = await prisma.$transaction(async (tx) => {
    const created = await tx.instrument.create({
      data: {
        serial,
        modelId: data.modelId,
        modelType: model.type,
        strings: model.strings,
        color: model.color,
        series: data.series || "01",
        year: data.year || new Date().getFullYear() % 100,
        month: data.month || new Date().getMonth() + 1,
        productionOrderId: data.productionOrderId,
        notes: data.notes,
        status: InstrumentStatus.EM_PRODUCAO,
      },
    });

    // Create initial event
    await tx.instrumentEvent.create({
      data: {
        instrumentId: created.id,
        toStatus: InstrumentStatus.EM_PRODUCAO,
        description: "Instrumento criado - Produção iniciada",
        metadata: {
          createdAt: new Date().toISOString(),
        },
      },
    });

    return created;
  });

  return instrument;
}

/**
 * Move instrument to a different status and log the transition
 * Handles special logic for certain status transitions
 */
export async function moveInstrument(
  prisma: PrismaClient,
  instrumentId: string,
  toStatus: InstrumentStatus,
  description: string,
  metadata?: any
) {
  const instrument = await prisma.instrument.findUniqueOrThrow({
    where: { id: instrumentId },
  });

  const fromStatus = instrument.status;

  // Validate status transitions
  if (toStatus === InstrumentStatus.RESERVADO && !metadata?.orderId) {
    throw new Error("RESERVADO status requires orderId in metadata");
  }

  return await prisma.$transaction(async (tx) => {
    let locationUpdate = {};

    // Set location based on target status
    if (toStatus === InstrumentStatus.EM_ESTOQUE) {
      locationUpdate = { location: "CASA_EUA" }; // Default location for in-stock
    } else if (toStatus === InstrumentStatus.EM_TRANSITO_CLIENTE) {
      locationUpdate = { location: "EM_TRANSITO" };
    } else if (toStatus === InstrumentStatus.ENTREGUE) {
      locationUpdate = { location: "OUTRO" };
    }

    // Update instrument status
    const updated = await tx.instrument.update({
      where: { id: instrumentId },
      data: {
        status: toStatus,
        ...locationUpdate,
        orderId:
          toStatus === InstrumentStatus.RESERVADO
            ? metadata?.orderId
            : instrument.orderId,
      },
    });

    // Create event log
    await tx.instrumentEvent.create({
      data: {
        instrumentId,
        fromStatus,
        toStatus,
        description,
        metadata: metadata || {},
      },
    });

    return updated;
  });
}

/**
 * Create an order from invoice data
 * Links instruments, calculates financials, creates Financial records
 * Moves instruments to RESERVADO status
 */
export async function createOrderFromInvoice(
  prisma: PrismaClient,
  data: {
    customerId: string;
    instrumentSerials: string[];
    source: OrderSource;
    subtotal: number | Decimal;
    shippingCharge?: number | Decimal;
    discount?: number | Decimal;
    fees?: {
      shopify?: number | Decimal;
      paypal?: number | Decimal;
      stripe?: number | Decimal;
      affirm?: number | Decimal;
      extraHandling?: number | Decimal;
    };
    notes?: string;
  }
) {
  const subtotal = new Decimal(data.subtotal);
  const shippingCharge = new Decimal(data.shippingCharge || 0);
  const discount = new Decimal(data.discount || 0);

  const fees = {
    feeShopify: new Decimal(data.fees?.shopify || 0),
    feePaypal: new Decimal(data.fees?.paypal || 0),
    feeStripe: new Decimal(data.fees?.stripe || 0),
    feeAffirm: new Decimal(data.fees?.affirm || 0),
    extraHandling: new Decimal(data.fees?.extraHandling || 0),
  };

  // Calculate totals
  const financials = calculateOrderFinancials({
    subtotal,
    shipping: shippingCharge,
    discount,
    feeShopify: fees.feeShopify,
    feePaypal: fees.feePaypal,
    feeStripe: fees.feeStripe,
    feeAffirm: fees.feeAffirm,
    extraHandling: fees.extraHandling,
    shippingCost: 0,
    productionCost: 0,
  });

  // Get exchange rate
  const exchangeRate = await getExchangeRate(prisma);

  return await prisma.$transaction(async (tx) => {
    // Verify customer exists
    const customer = await tx.customer.findUniqueOrThrow({
      where: { id: data.customerId },
    });

    // Verify instruments exist
    const instruments = await tx.instrument.findMany({
      where: { serial: { in: data.instrumentSerials } },
    });

    if (instruments.length !== data.instrumentSerials.length) {
      throw new Error("One or more instruments not found");
    }

    // Create order
    const orderNumber = generateOrderNumber();
    const order = await tx.order.create({
      data: {
        orderNumber,
        source: data.source,
        customerId: data.customerId,
        subtotal,
        shippingCharge,
        discount,
        total: financials.total,
        ...fees,
        totalFees: financials.totalFees,
        income: financials.income,
        shippingCost: 0,
        productionCost: 0,
        profit: financials.profit,
        exchangeRate: new Decimal(exchangeRate),
        totalBRL: financials.totalBRL,
        profitBRL: financials.profitBRL,
        status: OrderStatus.AGUARDANDO_PAGTO,
        notes: data.notes,
      },
    });

    // Link instruments to order
    for (const serial of data.instrumentSerials) {
      const instrument = instruments.find((i) => i.serial === serial);
      if (instrument) {
        // Update instrument with order link
        await tx.instrument.update({
          where: { id: instrument.id },
          data: { orderId: order.id, customerId: data.customerId },
        });

        // Move to RESERVADO status
        await moveInstrument(
          tx as any,
          instrument.id,
          InstrumentStatus.RESERVADO,
          `Reservado para pedido ${orderNumber}`,
          { orderId: order.id }
        );
      }
    }

    // Create Financial record for sale
    await tx.financial.create({
      data: {
        type: FinancialType.ENTRADA,
        category: FinancialCategory.VENDA,
        description: `Venda - Pedido ${orderNumber}`,
        amountUSD: financials.income,
        amountBRL: financials.totalBRL || financials.income,
        exchangeRate: new Decimal(exchangeRate),
        orderId: order.id,
      },
    });

    return order;
  });
}

/**
 * Register payment for an order
 * Marks order as PAGO and logs payment event on instruments
 */
export async function registerPayment(
  prisma: PrismaClient,
  orderId: string,
  paidAt?: Date
) {
  const paidDate = paidAt || new Date();

  return await prisma.$transaction(async (tx) => {
    // Update order
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAGO,
        paidAt: paidDate,
      },
    });

    // Update all linked instruments with payment event
    const instruments = await tx.instrument.findMany({
      where: { orderId },
    });

    for (const instrument of instruments) {
      await tx.instrumentEvent.create({
        data: {
          instrumentId: instrument.id,
          fromStatus: instrument.status,
          toStatus: instrument.status,
          description: `Pagamento registrado - Pedido ${order.orderNumber}`,
          metadata: {
            orderId,
            paidAt: paidDate.toISOString(),
          },
        },
      });
    }

    return order;
  });
}

/**
 * Create shipment for an order
 * Links instruments, updates their status to EM_TRANSITO_CLIENTE
 * Creates Financial record for shipping cost
 */
export async function createShipment(
  prisma: PrismaClient,
  data: {
    orderId: string;
    carrier: ShipmentCarrier;
    origin: ShipmentOrigin;
    trackingNumber?: string;
    awb?: string;
    weight?: number | Decimal;
    shippingCost?: number | Decimal;
  }
) {
  const shippingCost = data.shippingCost ? new Decimal(data.shippingCost) : null;

  return await prisma.$transaction(async (tx) => {
    // Get order with customer and instruments
    const order = await tx.order.findUniqueOrThrow({
      where: { id: data.orderId },
      include: { customer: true, instruments: true },
    });

    // Create shipment
    const shipment = await tx.shipment.create({
      data: {
        orderId: data.orderId,
        customerId: order.customerId,
        carrier: data.carrier,
        origin: data.origin,
        trackingNumber: data.trackingNumber,
        awb: data.awb,
        weight: data.weight ? new Decimal(data.weight) : null,
        shippingCost,
        destName: order.customer.name,
        destAddress: order.customer.address || "",
        destCity: order.customer.city || "",
        destCountry: order.customer.country || "",
        status: ShipmentStatus.ETIQUETA_CRIADA,
      },
    });

    // Link and update instruments
    for (const instrument of order.instruments) {
      await tx.instrument.update({
        where: { id: instrument.id },
        data: { shipmentId: shipment.id },
      });

      // Move to EM_TRANSITO_CLIENTE
      await moveInstrument(
        tx as any,
        instrument.id,
        InstrumentStatus.EM_TRANSITO_CLIENTE,
        `Enviado via ${data.carrier} - Tracking: ${data.trackingNumber || "N/A"}`,
        { shipmentId: shipment.id, carrier: data.carrier }
      );
    }

    // Update order to ENVIADO
    await tx.order.update({
      where: { id: data.orderId },
      data: { status: OrderStatus.ENVIADO },
    });

    // Create Financial record for shipping cost if provided
    if (shippingCost && shippingCost.greaterThan(0)) {
      const exchangeRate = await getExchangeRate(tx as any);
      await tx.financial.create({
        data: {
          type: FinancialType.SAIDA,
          category: FinancialCategory.FRETE_ENVIO,
          description: `Frete - ${data.carrier} - Pedido ${order.orderNumber}`,
          amountUSD: shippingCost,
          amountBRL: shippingCost.times(exchangeRate).toDecimalPlaces(2),
          exchangeRate: new Decimal(exchangeRate),
          orderId: data.orderId,
        },
      });
    }

    return shipment;
  });
}

/**
 * Confirm delivery of shipment
 * Marks shipment as ENTREGUE, instruments as ENTREGUE
 * Updates order to ENTREGUE, updates customer stats
 */
export async function confirmDelivery(
  prisma: PrismaClient,
  shipmentId: string
) {
  return await prisma.$transaction(async (tx) => {
    // Get shipment with related data
    const shipment = await tx.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: { order: true, instruments: true },
    });

    const now = new Date();

    // Update shipment
    const updated = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: ShipmentStatus.ENTREGUE,
        deliveredAt: now,
      },
    });

    // Update all instruments to ENTREGUE
    for (const instrument of shipment.instruments) {
      await moveInstrument(
        tx as any,
        instrument.id,
        InstrumentStatus.ENTREGUE,
        `Entregue ao cliente - Tracking: ${shipment.trackingNumber || "N/A"}`,
        { shipmentId, deliveredAt: now.toISOString() }
      );
    }

    // Update order to ENTREGUE
    await tx.order.update({
      where: { id: shipment.orderId },
      data: { status: OrderStatus.ENTREGUE },
    });

    // Update customer stats
    await tx.customer.update({
      where: { id: shipment.customerId },
      data: {
        totalSpent: { increment: shipment.order.total },
        orderCount: { increment: 1 },
      },
    });

    return updated;
  });
}
