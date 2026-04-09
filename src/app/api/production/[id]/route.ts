import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createInstrument } from '@/lib/actions';
import { ProductionStatus, InstrumentStatus, PaymentInstallmentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const productionOrder = await prisma.productionOrder.findUniqueOrThrow({
      where: { id },
      include: {
        items: true,
        payments: { orderBy: { installment: 'asc' } },
        instruments: {
          include: { model: true },
        },
      },
    });

    return NextResponse.json(productionOrder, { status: 200 });
  } catch (error) {
    console.error('GET /api/production/[id] error:', error);
    return NextResponse.json(
      { error: 'Production order not found' },
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
    const { status, notes, paymentId, paidDate, paymentMethod, paymentReference } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    let updated = await prisma.productionOrder.findUniqueOrThrow({
      where: { id },
    });

    await prisma.$transaction(async (tx) => {
      // Handle production order status change
      if (status === ProductionStatus.RECEBIDO) {
        // Auto-create instruments for each item
        const items = await tx.productionItem.findMany({
          where: { productionOrderId: id },
        });

        for (const item of items) {
          // Find or create model
          const model = await tx.model.findFirst({
            where: {
              type: item.modelType,
              strings: item.strings,
              color: item.color,
            },
          });

          if (model) {
            for (let i = 0; i < item.quantity; i++) {
              await createInstrument(tx as any, {
                modelId: model.id,
                productionOrderId: id,
              });

              // Immediately move to EM_ESTOQUE
              const instrument = await tx.instrument.findFirst({
                where: { productionOrderId: id },
                orderBy: { createdAt: 'desc' },
              });

              if (instrument && instrument.status === InstrumentStatus.EM_PRODUCAO) {
                await tx.instrument.update({
                  where: { id: instrument.id },
                  data: {
                    status: InstrumentStatus.EM_ESTOQUE,
                    location: 'CASA_EUA',
                  },
                });

                await tx.instrumentEvent.create({
                  data: {
                    instrumentId: instrument.id,
                    fromStatus: InstrumentStatus.EM_PRODUCAO,
                    toStatus: InstrumentStatus.EM_ESTOQUE,
                    description: 'Instrumento recebido - Adicionado ao estoque',
                  },
                });
              }
            }
          }
        }
      }

      // Update production order
      updated = await tx.productionOrder.update({
        where: { id },
        data: {
          ...(status && { status: status as ProductionStatus }),
          ...(notes !== undefined && { notes }),
          ...(status === ProductionStatus.RECEBIDO && {
            receivedAt: new Date(),
          }),
        },
      });

      // Handle payment update
      if (paymentId) {
        await tx.productionPayment.update({
          where: { id: paymentId },
          data: {
            status: PaymentInstallmentStatus.PAGO,
            paidDate: paidDate ? new Date(paidDate) : new Date(),
            ...(paymentMethod && { paymentMethod }),
            ...(paymentReference && { paymentReference }),
          },
        });
      }
    });

    const full = await prisma.productionOrder.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        items: true,
        payments: { orderBy: { installment: 'asc' } },
        instruments: true,
      },
    });

    return NextResponse.json(full, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/production/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update production order' },
      { status: 500 }
    );
  }
}
