import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

type DailyRecord = {
  date: string;
  salesTotal: number;
  expenseTotal: number;
  profit: number;
};

type SoldItemRecord = {
  date: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type ReportSummary = {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  dailyRecords: DailyRecord[];
  soldItems: SoldItemRecord[];
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

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const range = req.nextUrl.searchParams.get('range');
    const startDate = parseRange(range);

    const transactionWhere = Prisma.sql`
      WHERE "type" = 'out'
      AND "userId" = ${user.id}
      ${startDate ? Prisma.sql`AND "createdAt" >= ${startDate}` : Prisma.sql``}
    `;

    const expenseWhere = Prisma.sql`
      WHERE "userId" = ${user.id}
      ${startDate ? Prisma.sql`AND "createdAt" >= ${startDate}` : Prisma.sql``}
    `;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'out',
        createdAt: startDate ? { gte: startDate } : undefined,
      },
      select: { createdAt: true, items: true },
      orderBy: { createdAt: 'desc' },
    });

    const soldItems = transactions.flatMap((transaction) => {
      let items: any[];
      try {
        const parsedItems: unknown = JSON.parse(transaction.items);
        if (!Array.isArray(parsedItems)) return [];
        items = parsedItems;
      } catch {
        return [];
      }

      return items.flatMap((item) => {
        const name = item?.name ?? item?.product?.name;
        const unitPrice = Number(item?.price ?? item?.product?.price);
        const quantity = Number(item?.quantity);
        if (typeof name !== 'string' || !name || !Number.isFinite(unitPrice) || !Number.isFinite(quantity)) {
          return [];
        }

        return [{
          date: transaction.createdAt.toISOString(),
          name,
          quantity,
          unitPrice,
          total: unitPrice * quantity,
        }];
      });
    });

    const salesTotalResult = await prisma.$queryRaw<
      { salesTotal: number }[]
    >`
      SELECT COALESCE(SUM("totalAmount"), 0) AS "salesTotal"
      FROM "Transaction"
      ${transactionWhere}
    `;

    const expensesTotalResult = await prisma.$queryRaw<
      { expensesTotal: number }[]
    >`
      SELECT COALESCE(SUM("amount"), 0) AS "expensesTotal"
      FROM "Expense"
      ${expenseWhere}
    `;

    const salesByDay = await prisma.$queryRaw<
      { date: string; total: number }[]
    >`
      SELECT ("createdAt"::date)::text AS date, COALESCE(SUM("totalAmount"), 0) AS total
      FROM "Transaction"
      ${transactionWhere}
      GROUP BY "createdAt"::date
      ORDER BY "createdAt"::date ASC
    `;

    const expensesByDay = await prisma.$queryRaw<
      { date: string; total: number }[]
    >`
      SELECT ("createdAt"::date)::text AS date, COALESCE(SUM("amount"), 0) AS total
      FROM "Expense"
      ${expenseWhere}
      GROUP BY "createdAt"::date
      ORDER BY "createdAt"::date ASC
    `;

    const totalSales = Number(salesTotalResult[0]?.salesTotal ?? 0);
    const totalExpenses = Number(expensesTotalResult[0]?.expensesTotal ?? 0);
    const dailyMap = new Map<string, { salesTotal: number; expenseTotal: number }>();

    for (const sale of salesByDay) {
      dailyMap.set(sale.date, {
        salesTotal: Number(sale.total ?? 0),
        expenseTotal: 0,
      });
    }

    for (const expense of expensesByDay) {
      const current = dailyMap.get(expense.date) ?? {
        salesTotal: 0,
        expenseTotal: 0,
      };
      dailyMap.set(expense.date, {
        salesTotal: current.salesTotal,
        expenseTotal: Number(expense.total ?? 0),
      });
    }

    const dailyRecords = [...dailyMap.entries()]
      .map(([date, values]) => ({
        date,
        salesTotal: values.salesTotal,
        expenseTotal: values.expenseTotal,
        profit: values.salesTotal - values.expenseTotal,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary: ReportSummary = {
      totalSales,
      totalExpenses,
      profit: totalSales - totalExpenses,
      dailyRecords,
      soldItems,
    };

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get profit report error:', error);
    return NextResponse.json({ error: 'Failed to fetch profit report' }, { status: 500 });
  }
}
