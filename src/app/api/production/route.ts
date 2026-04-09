import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ProductionStatus, InstrumentStatus, InstrumentLocation, ModelType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { generateSerialForInstrument, SERIAL_COLOR_CODES, SERIAL_MODEL_CODES } from '@/lib/serial';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const total = await prisma.productionOrder.count({ where });
    const totalPages = Math.ceil(total / limit);

    const orders = await prisma.productionOrder.findMany({
      where,
      include: {
        items: true,
        payments: {
          orderBy: { installment: 'asc' },
        },
        instruments: {
          select: {
            serial: true,
            modelType: true,
            color: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return NextResponse.json(
      {
        orders,
        total,
        page,
        totalPages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/production error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      description,
      items,
      totalCostBRL,
      estimatedDelivery,
      paymentSchedule,
      notes,
    } = body;

    if (!code || !items || !totalCostBRL) {
      return NextResponse.json(
        { error: 'code, items, and totalCostBRL are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(paymentSchedule) || paymentSchedule.length === 0) {
      return NextResponse.json(
        { error: 'paymentSchedule is required and must be non-empty' },
        { status: 400 }
      );
    }

    const productionOrder = await prisma.$transaction(async (tx) => {
      // Create production order
      const created = await tx.productionOrder.create({
        data: {
          code,
          description,
          totalCostBRL: new Decimal(totalCostBRL),
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
          status: ProductionStatus.PEDIDO_FEITO,
          notes,
        },
      });

      // Create items and generate instruments
      const instrumentsToCreate = [];

      for (const item of items) {
        // Create production item
        await tx.productionItem.create({
          data: {
            productionOrderId: created.id,
            modelType: item.modelType as ModelType,
            strings: item.strings,
            color: item.color,
            quantity: item.quantity,
            unitCost: item.unitCost ? new Decimal(item.unitCost) : undefined,
            totalCost: item.unitCost
              ? new Decimal(item.unitCost).times(item.quantity)
              : undefined,
          },
        });

        // Generate instruments for this item
        // Get color code from the color name
        const colorCode = SERIAL_COLOR_CODES[item.color] || '01';

        // Find or create model for this item
        let model = await tx.model.findFirst({
          where: {
            type: item.modelType as ModelType,
            strings: item.strings,
            color: item.color,
          },
        });

        if (!model) {
          // Create a minimal model if it doesn't exist
          const modelCode = SERIAL_MODEL_CODES[item.modelType as ModelType] || '1';
          model = await tx.model.create({
            data: {
              type: item.modelType as ModelType,
              strings: item.strings,
              color: item.color,
              name: `${item.modelType} ${item.strings}-String ${item.color}`,
              modelCode: modelCode,
              colorCode: colorCode,
              basePrice: new Decimal(item.unitCost || 1800),
            },
          });
        }

        // Get current year and month
        const now = new Date();
        const year = now.getFullYear() % 100;
        const month = now.getMonth() + 1;

        for (let i = 0; i < item.quantity; i++) {
          const serial = await generateSerialForInstrument(tx as any, {
            modelType: item.modelType as ModelType,
            strings: item.strings,
            color: colorCode,
            year,
            month,
          });

          instrumentsToCreate.push({
            serial,
            modelId: model.id,
            modelType: item.modelType as ModelType,
            strings: item.strings,
            color: item.color,
            productionOrderId: created.id,
            status: InstrumentStatus.EM_PRODUCAO,
            location: InstrumentLocation.FABRICA,
            costPrice: item.unitCost ? new Decimal(item.unitCost) : undefined,
            year,
            month,
          });
        }
      }

      // Bulk create instruments
      for (const instrument of instrumentsToCreate) {
        await tx.instrument.create({ data: instrument });
      }

      // Create payment installments from schedule
      for (const payment of paymentSchedule) {
        await tx.productionPayment.create({
          data: {
            productionOrderId: created.id,
            installment: payment.installment,
            description: payment.description,
            amountBRL: new Decimal(payment.amount).toDecimalPlaces(2),
            dueDate: new Date(payment.dueDate),
          },
        });
      }

      return created;
    });

    // Fetch complete order with all relations
    const full = await prisma.productionOrder.findUniqueOrThrow({
      where: { id: productionOrder.id },
      include: {
        items: true,
        payments: { orderBy: { installment: 'asc' } },
        instruments: {
          select: {
            id: true,
            serial: true,
            modelType: true,
            color: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('POST /api/production error:', error);
    return NextResponse.json(
      { error: 'Failed to create production order' },
      { status: 500 }
    );
  }
}
