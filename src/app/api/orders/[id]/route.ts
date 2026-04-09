import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { registerPayment } from '@/lib/actions';
import { OrderStatus } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
        instruments: {
          include: { model: true },
        },
        shipments: true,
        financials: true,
      },
    });

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json(
      { error: 'Order not found' },
      { status: 404 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, paidAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    let updated = await prisma.order.findUniqueOrThrow({
      where: { id },
    });

    if (status === OrderStatus.PAGO) {
      updated = await registerPayment(prisma, id, paidAt ? new Date(paidAt) : undefined);
    } else if (status) {
      updated = await prisma.order.update({
        where: { id },
        data: {
          status: status as OrderStatus,
          ...(paidAt && { paidAt: new Date(paidAt) }),
        },
      });
    } else if (paidAt) {
      updated = await prisma.order.update({
        where: { id },
        data: { paidAt: new Date(paidAt) },
      });
    }

    const full = await prisma.order.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        customer: true,
        instruments: true,
        shipments: true,
      },
    });

    return NextResponse.json(full, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
