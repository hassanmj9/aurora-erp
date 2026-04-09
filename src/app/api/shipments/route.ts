import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createShipment } from '@/lib/actions';
import { ShipmentCarrier, ShipmentOrigin } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const carrier = searchParams.get('carrier');
    const origin = searchParams.get('origin');
    const search = searchParams.get('search')?.toLowerCase();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (carrier) {
      where.carrier = carrier;
    }

    if (origin) {
      where.origin = origin;
    }

    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const total = await prisma.shipment.count({ where });
    const totalPages = Math.ceil(total / limit);

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        instruments: {
          select: { serial: true, modelType: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return NextResponse.json(
      {
        shipments,
        total,
        page,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/shipments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      carrier,
      origin,
      trackingNumber,
      awb,
      weight,
      shippingCost,
      destName,
      destAddress,
      destCity,
      destCountry,
      notes,
    } = body;

    if (!orderId || !carrier || !origin) {
      return NextResponse.json(
        { error: 'orderId, carrier, and origin are required' },
        { status: 400 }
      );
    }

    const shipment = await createShipment(prisma, {
      orderId,
      carrier: carrier as ShipmentCarrier,
      origin: origin as ShipmentOrigin,
      trackingNumber,
      awb,
      weight: weight ? new Decimal(weight) : undefined,
      shippingCost: shippingCost ? new Decimal(shippingCost) : undefined,
    });

    // Update destination info if provided
    if (destName || destAddress || destCity || destCountry) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          ...(destName && { destName }),
          ...(destAddress && { destAddress }),
          ...(destCity && { destCity }),
          ...(destCountry && { destCountry }),
          ...(notes && { notes }),
        },
      });
    }

    const full = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      include: {
        order: true,
        customer: true,
        instruments: true,
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('POST /api/shipments error:', error);
    return NextResponse.json(
      { error: 'Failed to create shipment' },
      { status: 500 }
    );
  }
}
