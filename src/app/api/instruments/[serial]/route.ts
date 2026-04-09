import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { serial: string } }
) {
  try {
    const { serial } = params;

    const instrument = await prisma.instrument.findUniqueOrThrow({
      where: { serial },
      include: {
        model: true,
        customer: true,
        order: {
          include: {
            customer: true,
          },
        },
        shipment: true,
        productionOrder: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(instrument, { status: 200 });
  } catch (error) {
    console.error('GET /api/instruments/[serial] error:', error);
    return NextResponse.json(
      { error: 'Instrument not found' },
      { status: 404 }
    );
  }
}
