import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createOrderFromInvoice } from '@/lib/actions';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search')?.toLowerCase();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        where.date.lte = new Date(to);
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const total = await prisma.order.count({ where });
    const totalPages = Math.ceil(total / limit);

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        instruments: {
          select: { serial: true, modelType: true, color: true, strings: true },
        },
        shipments: {
          select: { id: true, trackingNumber: true, carrier: true, status: true },
        },
      },
      orderBy: { date: 'desc' },
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
    console.error('GET /api/orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      customer,
      source,
      instrumentSerials,
      subtotal,
      shippingCharge,
      discount,
      feeShopify,
      feePaypal,
      feeStripe,
      feeAffirm,
      extraHandling,
      notes,
    } = body;

    if (!source || !instrumentSerials || !subtotal) {
      return NextResponse.json(
        { error: 'source, instrumentSerials, and subtotal are required' },
        { status: 400 }
      );
    }

    let cId = customerId;

    // Create customer if not provided
    if (!cId && customer) {
      const newCustomer = await prisma.customer.create({
        data: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          country: customer.country,
        },
      });
      cId = newCustomer.id;
    }

    if (!cId) {
      return NextResponse.json(
        { error: 'customerId or customer data is required' },
        { status: 400 }
      );
    }

    const order = await createOrderFromInvoice(prisma, {
      customerId: cId,
      instrumentSerials,
      source,
      subtotal: new Decimal(subtotal),
      shippingCharge: shippingCharge ? new Decimal(shippingCharge) : undefined,
      discount: discount ? new Decimal(discount) : undefined,
      fees: {
        shopify: feeShopify ? new Decimal(feeShopify) : undefined,
        paypal: feePaypal ? new Decimal(feePaypal) : undefined,
        stripe: feeStripe ? new Decimal(feeStripe) : undefined,
        affirm: feeAffirm ? new Decimal(feeAffirm) : undefined,
        extraHandling: extraHandling ? new Decimal(extraHandling) : undefined,
      },
      notes,
    });

    const full = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        customer: true,
        instruments: true,
        shipments: true,
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
