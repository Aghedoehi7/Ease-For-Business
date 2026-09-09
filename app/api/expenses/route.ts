import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

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

type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
};

function validateExpenseInput(body: any) {
  const errors: string[] = [];
  const amount = Number(body?.amount);
  const category = typeof body?.category === 'string' ? body.category.trim() : '';
  const note = typeof body?.note === 'string' ? body.note.trim() : null;

  if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (!category) {
    errors.push('Category is required');
  } else if (category.length > 100) {
    errors.push('Category must be 100 characters or fewer');
  }

  if (note && note.length > 1000) {
    errors.push('Note must be 1000 characters or fewer');
  }

  return {
    ok: errors.length === 0,
    errors,
    parsed: { amount, category, note },
  } as const;
}

function sanitizeExpenseRow(row: any): ExpenseRow | null {
  if (!row || typeof row !== 'object') return null;
  const id = typeof row.id === 'string' ? row.id : String(row.id ?? '');
  const amount = Number(row.amount);
  const category = typeof row.category === 'string' ? row.category : String(row.category ?? '');
  const note = row.note == null ? null : String(row.note);
  const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt ?? '');

  if (!id || !Number.isFinite(amount) || !category || !createdAt) return null;

  return { id, amount, category, note, createdAt };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const range = req.nextUrl.searchParams.get('range');
    const startDate = parseRange(range);

    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        createdAt: startDate ? { gte: startDate } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        category: true,
        note: true,
        createdAt: true,
      },
    });

    const sanitized = expenses.map(sanitizeExpenseRow).filter(Boolean) as ExpenseRow[];

    return NextResponse.json(sanitized, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error fetching expenses:', error.message);
      return NextResponse.json({ error: 'Database error fetching expenses' }, { status: 500 });
    }
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { ok, errors, parsed } = validateExpenseInput(body);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid input', details: errors }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        amount: parsed.amount,
        category: parsed.category,
        note: parsed.note,
      },
      select: {
        id: true,
        amount: true,
        category: true,
        note: true,
        createdAt: true,
      },
    });

    const sanitized = sanitizeExpenseRow(expense);
    if (!sanitized) {
      console.error('Created expense has invalid shape', expense);
      return NextResponse.json({ error: 'Created expense has invalid shape' }, { status: 500 });
    }

    return NextResponse.json(sanitized, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error creating expense:', error.code, error.message);
      return NextResponse.json({ error: 'Database error creating expense' }, { status: 500 });
    }
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
