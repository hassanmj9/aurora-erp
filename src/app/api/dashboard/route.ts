import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { InstrumentStatus, OrderStatus, FinancialType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Count instruments in stock
    const instrumentsInStock = await prisma.instrument.count({
      where: { status: InstrumentStatus.EM_ESTOQUE },
    });

    // Count orders this month
    const ordersThisMonth = await prisma.order.count({
      where: {
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    // Revenue: Show last 30 days or all-time if current month is empty
    let revenueThisMonth = new Decimal(0);

    // First try current month
    const monthlyOrders = await prisma.order.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: { in: [OrderStatus.PAGO, OrderStatus.ENVIADO, OrderStatus.ENTREGUE] },
      },
    });

    for (const order of monthlyOrders) {
      revenueThisMonth = revenueThisMonth.plus(order.total || 0);
    }

    // If current month has no revenue, show last 30 days
    if (revenueThisMonth.isZero()) {
      const last30DaysOrders = await prisma.order.findMany({
        where: {
          date: { gte: last30Days },
          status: { in: [OrderStatus.PAGO, OrderStatus.ENVIADO, OrderStatus.ENTREGUE] },
        },
      });

      for (const order of last30DaysOrders) {
        revenueThisMonth = revenueThisMonth.plus(order.total || 0);
      }
    }

    // Pending shipments: Only PREPARANDO and ENVIADO (not PAGO)
    const pendingShipments = await prisma.order.count({
      where: {
        status: { in: [OrderStatus.PREPARANDO, OrderStatus.ENVIADO] },
      },
    });

    // Action items
    const actionItems = [];

    // 1. Overdue production payments (grouped by order, excluding old orders from 2024)
    const overduePayments = await prisma.productionPayment.findMany({
      where: {
        status: 'PENDENTE',
        dueDate: { lt: now },
        productionOrder: {
          createdAt: {
            gte: new Date('2024-01-01'), // Only 2024 and later
          },
        },
      },
      include: {
        productionOrder: { select: { code: true, createdAt: true } },
      },
      orderBy: { dueDate: 'desc' },
    });

    // Group by production order and count
    const groupedOverduePayments = new Map<string, { code: string; count: number; dueDate: Date }>();
    for (const payment of overduePayments) {
      if (!groupedOverduePayments.has(payment.productionOrderId)) {
        groupedOverduePayments.set(payment.productionOrderId, {
          code: payment.productionOrder.code,
          count: 0,
          dueDate: payment.dueDate,
        });
      }
      const entry = groupedOverduePayments.get(payment.productionOrderId)!;
      entry.count++;
    }

    // Add to action items (max 10)
    let overdueCount = 0;
    for (const [, entry] of groupedOverduePayments) {
      if (overdueCount >= 10) break;
      const message = entry.count === 1
        ? `Pagamento vencido para produção ${entry.code}`
        : `${entry.count} pagamentos vencidos para produção ${entry.code}`;
      actionItems.push({
        type: 'overdue_payment',
        severity: 'high',
        message,
        dueDate: entry.dueDate,
      });
      overdueCount++;
    }

    // 2. Orders awaiting payment for > 3 days (limit to 5 most recent)
    const awaitingPaymentOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.AGUARDANDO_PAGTO,
        date: { lte: threeHoursAgo },
      },
      select: { id: true, orderNumber: true, date: true },
      orderBy: { date: 'desc' },
      take: 5,
    });

    for (const order of awaitingPaymentOrders) {
      if (actionItems.length >= 10) break;
      actionItems.push({
        type: 'awaiting_payment',
        severity: 'medium',
        message: `Pedido ${order.orderNumber} aguardando pagamento`,
        date: order.date,
      });
    }

    // 3. Orders ready for shipment (PREPARANDO status, not yet ENVIADO)
    const readyForShipment = await prisma.order.findMany({
      where: {
        status: OrderStatus.PREPARANDO,
      },
      select: { id: true, orderNumber: true },
      orderBy: { date: 'desc' },
      take: 5,
    });

    for (const order of readyForShipment) {
      if (actionItems.length >= 10) break;
      actionItems.push({
        type: 'pending_shipment',
        severity: 'medium',
        message: `Pedido ${order.orderNumber} pronto para envio`,
      });
    }

    // 4. Low stock alerts (only if very low)
    if (instrumentsInStock < 5 && actionItems.length < 10) {
      actionItems.push({
        type: 'low_stock',
        severity: 'medium',
        message: `Estoque baixo: apenas ${instrumentsInStock} instrumentos disponíveis`,
      });
    }

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        instruments: { select: { serial: true, modelType: true, color: true } },
      },
    });

    // Recent instrument events
    const recentEvents = await prisma.instrumentEvent.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        instrument: { select: { serial: true } },
      },
    });

    return NextResponse.json(
      {
        instrumentsInStock,
        ordersThisMonth,
        revenueThisMonth: revenueThisMonth.toNumber(),
        pendingShipments,
        actionItems,
        recentOrders,
        recentEvents,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
