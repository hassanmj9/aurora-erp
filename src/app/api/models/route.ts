import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    const where: any = {
      active: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const models = await prisma.model.findMany({
      where,
      select: {
        id: true,
        type: true,
        name: true,
        strings: true,
        color: true,
        colorCode: true,
        modelCode: true,
        basePrice: true,
        costPrice: true,
        imageUrl: true,
        active: true,
        shopifyProductId: true,
        shopifyVariantId: true,
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({ models }, { status: 200 });
  } catch (error) {
    console.error('GET /api/models error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
