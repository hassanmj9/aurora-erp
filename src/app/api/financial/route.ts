import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { FinancialType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const dateStr = searchParams.get('date');

    let startDate: Date;
    let endDate: Date;

    const now = new Date();

    if (dateStr) {
      const [year, month] = dateStr.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (period === 'month') {
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'quarter') {
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0, 23, 59, 59);
    } else {
      endDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), 0, 23, 59, 59);
    }

    // Get financials for period
    const entries = await prisma.financial.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    // Calculate totals
    let totalIncome = new Decimal(0);
    let totalExpenses = new Decimal(0);
    const incomeByCategory: Record<string, Decimal> = {};
    const expensesByCategory: Record<string, Decimal> = {};

    const allEntries = await prisma.financial.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    for (const entry of allEntries) {
      const amount = entry.amountBRL || new Decimal(0);

      if (entry.type === FinancialType.ENTRADA) {
        totalIncome = totalIncome.plus(amount);
        incomeByCategory[entry.category] = (incomeByCategory[entry.category] || new Decimal(0)).plus(amount);
      } else {
        totalExpenses = totalExpenses.plus(amount);
        expensesByCategory[entry.category] = (expensesByCategory[entry.category] || new Decimal(0)).plus(amount);
      }
    }

    const netProfit = totalIncome.minus(totalExpenses);

    // Get pending payments
    const pendingPayments = await prisma.productionPayment.findMany({
      where: {
        status: { in: ['PENDENTE', 'VENCIDO'] },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        productionOrder: {
          select: { code: true },
        },
      },
    });

    // Get monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const trendMonth = new Date(now);
      trendMonth.setMonth(trendMonth.getMonth() - i);
      const trendStart = new Date(trendMonth.getFullYear(), trendMonth.getMonth(), 1);
      const trendEnd = new Date(trendMonth.getFullYear(), trendMonth.getMonth() + 1, 0, 23, 59, 59);

      const trendEntries = await prisma.financial.findMany({
        where: {
          date: { gte: trendStart, lte: trendEnd },
        },
      });

      let monthIncome = new Decimal(0);
      let monthExpenses = new Decimal(0);

      for (const entry of trendEntries) {
        const amount = entry.amountBRL || new Decimal(0);
        if (entry.type === FinancialType.ENTRADA) {
          monthIncome = monthIncome.plus(amount);
        } else {
          monthExpenses = monthExpenses.plus(amount);
        }
      }

      monthlyTrend.push({
        month: trendMonth.toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }),
        income: monthIncome.toNumber(),
        expenses: monthExpenses.toNumber(),
        profit: monthIncome.minus(monthExpenses).toNumber(),
      });
    }

    return NextResponse.json(
      {
        totalIncome: totalIncome.toNumber(),
        totalExpenses: totalExpenses.toNumber(),
        netProfit: netProfit.toNumber(),
        incomeByCategory: Object.entries(incomeByCategory).map(([category, total]) => ({
          category,
          total: total.toNumber(),
        })),
        expensesByCategory: Object.entries(expensesByCategory).map(([category, total]) => ({
          category,
          total: total.toNumber(),
        })),
        entries,
        monthlyTrend,
        pendingPayments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/financial error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
