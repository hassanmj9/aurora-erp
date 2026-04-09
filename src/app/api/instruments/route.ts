import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createInstrument, moveInstrument } from '@/lib/actions';
import { InstrumentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase();
    const status = searchParams.get('status') as InstrumentStatus | null;
    const modelType = searchParams.get('modelType');
    const location = searchParams.get('location');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { serial: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (modelType) {
      where.modelType = modelType;
    }

    if (location) {
      where.location = location;
    }

    // Get total count
    const total = await prisma.instrument.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Get instruments
    const instruments = await prisma.instrument.findMany({
      where,
      include: {
        model: {
          select: { id: true, type: true, name: true, color: true, strings: true },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        order: {
          select: { id: true, orderNumber: true, status: true },
        },
        shipment: {
          select: { id: true, trackingNumber: true, carrier: true, status: true },
        },
      },
      orderBy: { [orderBy]: order },
      skip,
      take: limit,
    });

    return NextResponse.json(
      {
        instruments,
        total,
        page,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/instruments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instruments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, series, year, month, productionOrderId, notes } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      );
    }

    const instrument = await createInstrument(prisma, {
      modelId,
      series,
      year,
      month,
      productionOrderId,
      notes,
    });

    const full = await prisma.instrument.findUniqueOrThrow({
      where: { id: instrument.id },
      include: {
        model: true,
        customer: true,
        order: true,
        shipment: true,
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('POST /api/instruments error:', error);
    return NextResponse.json(
      { error: 'Failed to create instrument' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, location, locationNote, notes, customerId } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const instrument = await prisma.instrument.findUniqueOrThrow({
      where: { id },
    });

    let updated = instrument;

    if (status && status !== instrument.status) {
      updated = await moveInstrument(
        prisma,
        id,
        status,
        `Status changed to ${status}`,
        {}
      );
    } else {
      updated = await prisma.instrument.update({
        where: { id },
        data: {
          ...(location && { location }),
          ...(locationNote !== undefined && { locationNote }),
          ...(notes !== undefined && { notes }),
          ...(customerId && { customerId }),
        },
      });
    }

    const full = await prisma.instrument.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        model: true,
        customer: true,
        order: true,
        shipment: true,
      },
    });

    return NextResponse.json(full, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/instruments error:', error);
    return NextResponse.json(
      { error: 'Failed to update instrument' },
      { status: 500 }
    );
  }
}
