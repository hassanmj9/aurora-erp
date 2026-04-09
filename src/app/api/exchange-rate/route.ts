import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getExchangeRate } from '@/lib/exchange-rate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rate = await getExchangeRate(prisma);

    return NextResponse.json(
      {
        rate,
        usdToBrl: rate,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/exchange-rate error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}
