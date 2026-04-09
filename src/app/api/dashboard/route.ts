import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { InstrumentStatus, OrderStatus, FinancialType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
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

    // Revenue this month (USD)
    const monthlyOrders = await prisma.order.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: { in: [OrderStatus.PAGO, OrderStatus.ENVIADO, OrderStatus.ENTREGUE] },
      },
    });

    let revenueThisMonth = new Decimal(0);
    for (const order of monthlyOrders) {
      revenueThisMonth = revenueThisMonth.plus(order.total || 0);
    }

    // Pending shipments
    const pendingShipments = await prisma.order.count({
      where: {
        status: { in: [OrderStatus.PREPARANDO, OrderStatus.PAGO] },
      },
    });

    // Action items
    const actionItems = [];

    // 1. Overdue production payments
    const overduePayments = await prisma.productionPayment.findMany({
      where: {
        status: 'PENDENTE',
        dueDate: { lt: now },
      },
      include: {
        productionOrder: { select: { code: true } },
      },
    });

    for (const payment of overduePayments) {
      actionItems.push({
        type: 'overdue_payment',
        severity: 'high',
        message: `Pagamento vencido para produção ${payment.productionOrder.code}`,
        dueDate: payment.dueDate,
      });
    }

    // 2. Orders awaiting payment for > 3 days
    const awaitingPaymentOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.AGUARDANDO_PAGTO,
        date: { lte: threeHoursAgo },
      },
      select: { id: true, orderNumber: true, date: true },
    });

    for (const order of awaitingPaymentOrders) {
      actionItems.push({
        type: 'awaiting_payment',
        severity: 'medium',
        message: `Pedido ${order.orderNumber} aguardando pagamento`,
        date: order.date,
      });
    }

    // 3. Pending shipments (orders PAGO but not ENVIADO)
    const unsentOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAGO,
        shipments: {
          none: {},
        },
      },
      select: { id: true, orderNumber: true },
    });

    for (const order of unsentOrders) {
      actionItems.push({
        type: 'pending_shipment',
        severity: 'medium',
        message: `Pedido ${order.orderNumber} pronto para envio`,
      });
    }

    // 4. Low stock alerts
    if (instrumentsInStock < 5) {
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
