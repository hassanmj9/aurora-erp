import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { confirmDelivery } from '@/lib/actions';
import { ShipmentStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, trackingNumber, deliveredAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    let updated = await prisma.shipment.findUniqueOrThrow({
      where: { id },
    });

    if (status === ShipmentStatus.ENTREGUE) {
      updated = await confirmDelivery(prisma, id);
    } else {
      updated = await prisma.shipment.update({
        where: { id },
        data: {
          ...(status && { status: status as ShipmentStatus }),
          ...(trackingNumber && { trackingNumber }),
          ...(deliveredAt && { deliveredAt: new Date(deliveredAt) }),
        },
      });
    }

    const full = await prisma.shipment.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        order: true,
        customer: true,
        instruments: true,
      },
    });

    return NextResponse.json(full, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/shipments/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update shipment' },
      { status: 500 }
    );
  }
}
