import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type DailyRecord = {
  date: string;
  salesTotal: number;
  cogs: number | null;
  grossProfit: number | null;
  expenseTotal: number;
  netProfit: number | null;
  cogsComplete: boolean;
};

type SoldItemRecord = {
  date: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number | null;
  total: number;
  cogs: number | null;
  grossProfit: number | null;
};

function parseRange(range: string | null) {
  const now = new Date();
  if (!range) return undefined;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case 'today':
      return start;
    case 'week':
      start.setDate(start.getDate() - 6);
      return start;
    case 'month':
      start.setDate(1);
      return start;
    default:
      return undefined;
  }
}

function roundMoney(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(rounded) || !Number.isSafeInteger(Math.round(rounded * 100))) {
    throw new Error('Financial total exceeds supported currency precision');
  }
  return rounded;
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const startDate = parseRange(req.nextUrl.searchParams.get('range'));

    const [transactions, expenses] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: 'out',
          status: 'completed',
          createdAt: startDate ? { gte: startDate } : undefined,
        },
        select: {
          id: true,
          createdAt: true,
          items: true,
          totalAmount: true,
          costOfGoodsSold: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expense.findMany({
        where: {
          userId: user.id,
          createdAt: startDate ? { gte: startDate } : undefined,
        },
        select: { amount: true, createdAt: true },
      }),
    ]);

    let totalSales = 0;
    let knownCogs = 0;
    let incompleteSales = 0;
    const daily = new Map<string, {
      salesTotal: number;
      knownCogs: number;
      expenseTotal: number;
      cogsComplete: boolean;
    }>();

    const getDay = (date: Date) => {
      const key = dateKey(date);
      let record = daily.get(key);
      if (!record) {
        record = { salesTotal: 0, knownCogs: 0, expenseTotal: 0, cogsComplete: true };
        daily.set(key, record);
      }
      return record;
    };

    const soldItems: SoldItemRecord[] = [];
    for (const transaction of transactions) {
      const amount = Number(transaction.totalAmount);
      totalSales = roundMoney(totalSales + amount);
      const day = getDay(transaction.createdAt);
      day.salesTotal = roundMoney(day.salesTotal + amount);

      const cogs = transaction.costOfGoodsSold == null
        ? null
        : Number(transaction.costOfGoodsSold);
      if (cogs == null || !Number.isFinite(cogs)) {
        incompleteSales += 1;
        day.cogsComplete = false;
      } else {
        knownCogs = roundMoney(knownCogs + cogs);
        day.knownCogs = roundMoney(day.knownCogs + cogs);
      }

      let items: unknown;
      try {
        items = JSON.parse(transaction.items);
      } catch (error) {
        console.error(`Unable to parse items for transaction ${transaction.id}:`, error);
        continue;
      }
      if (!Array.isArray(items)) continue;

      for (const rawItem of items) {
        const item = asRecord(rawItem);
        if (!item) continue;
        const name = typeof item.name === 'string' ? item.name : '';
        const unitPrice = Number(item.price);
        const quantity = Number(item.quantity);
        if (!name || !Number.isFinite(unitPrice) || !Number.isFinite(quantity) || quantity <= 0) continue;

        const unitCost = item.costPrice == null ? null : Number(item.costPrice);
        const lineCogs = item.costOfGoodsSold == null ? null : Number(item.costOfGoodsSold);
        const lineTotal = Number.isFinite(Number(item.total))
          ? Number(item.total)
          : roundMoney(unitPrice * quantity);
        soldItems.push({
          date: transaction.createdAt.toISOString(),
          name,
          quantity,
          unitPrice,
          costPrice: unitCost != null && Number.isFinite(unitCost) ? unitCost : null,
          total: lineTotal,
          cogs: lineCogs != null && Number.isFinite(lineCogs) ? lineCogs : null,
          grossProfit: lineCogs != null && Number.isFinite(lineCogs)
            ? roundMoney(lineTotal - lineCogs)
            : null,
        });
      }
    }

    let totalExpenses = 0;
    for (const expense of expenses) {
      const amount = Number(expense.amount);
      totalExpenses = roundMoney(totalExpenses + amount);
      const day = getDay(expense.createdAt);
      day.expenseTotal = roundMoney(day.expenseTotal + amount);
    }

    const cogsComplete = incompleteSales === 0;
    const totalCogs = cogsComplete ? knownCogs : null;
    const grossProfit = cogsComplete ? roundMoney(totalSales - knownCogs) : null;
    const netProfit = grossProfit == null ? null : roundMoney(grossProfit - totalExpenses);

    const dailyRecords: DailyRecord[] = [...daily.entries()]
      .map(([date, values]) => {
        const cogs = values.cogsComplete ? values.knownCogs : null;
        const gross = cogs == null ? null : roundMoney(values.salesTotal - cogs);
        return {
          date,
          salesTotal: values.salesTotal,
          cogs,
          grossProfit: gross,
          expenseTotal: values.expenseTotal,
          netProfit: gross == null ? null : roundMoney(gross - values.expenseTotal),
          cogsComplete: values.cogsComplete,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalSales,
      totalCogs,
      cogsComplete,
      incompleteSales,
      grossProfit,
      totalExpenses,
      netProfit,
      dailyRecords,
      soldItems,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get profit report error:', error);
    return NextResponse.json({ error: 'Failed to fetch profit report' }, { status: 500 });
  }
}
