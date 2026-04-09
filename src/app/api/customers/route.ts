import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 20;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

    const where = search.trim()
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const total = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        city: true,
        country: true,
        totalSpent: true,
        orderCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    });

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    return NextResponse.json({
      customers,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('GET /api/customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, whatsapp, address, city, state, country, zipCode, source, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    if (email) {
      const existing = await prisma.customer.findUnique({
        where: { email },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Customer with this email already exists', existingId: existing.id },
          { status: 409 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email?.toLowerCase().trim() || null,
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        zipCode: zipCode?.trim() || null,
        source: source || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('POST /api/customers error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
