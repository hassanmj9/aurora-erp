import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ProductionStatus, FinancialType, FinancialCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

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
      numberOfInstallments,
      firstDueDate,
      notes,
    } = body;

    if (!code || !items || !totalCostBRL) {
      return NextResponse.json(
        { error: 'code, items, and totalCostBRL are required' },
        { status: 400 }
      );
    }

    const numInstallments = numberOfInstallments || 1;
    const dueDate = firstDueDate ? new Date(firstDueDate) : new Date();

    const productionOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.productionOrder.create({
        data: {
          code,
          description,
          totalCostBRL: new Decimal(totalCostBRL),
          status: ProductionStatus.ORCAMENTO,
          notes,
        },
      });

      // Create items
      for (const item of items) {
        await tx.productionItem.create({
          data: {
            productionOrderId: created.id,
            modelType: item.modelType,
            strings: item.strings,
            color: item.color,
            quantity: item.quantity,
            unitCost: item.unitCost ? new Decimal(item.unitCost) : undefined,
            totalCost: item.unitCost
              ? new Decimal(item.unitCost).times(item.quantity)
              : undefined,
          },
        });
      }

      // Create payment installments
      const installmentAmount = new Decimal(totalCostBRL).dividedBy(numInstallments);

      for (let i = 0; i < numInstallments; i++) {
        const paymentDueDate = new Date(dueDate);
        paymentDueDate.setDate(paymentDueDate.getDate() + i * 30);

        await tx.productionPayment.create({
          data: {
            productionOrderId: created.id,
            installment: i + 1,
            description: `Parcela ${i + 1}/${numInstallments}`,
            amountBRL: installmentAmount.toDecimalPlaces(2),
            dueDate: paymentDueDate,
          },
        });
      }

      return created;
    });

    const full = await prisma.productionOrder.findUniqueOrThrow({
      where: { id: productionOrder.id },
      include: {
        items: true,
        payments: { orderBy: { installment: 'asc' } },
        instruments: true,
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
