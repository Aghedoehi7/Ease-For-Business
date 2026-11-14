import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { validateExpenseInput } from '@/lib/expenseInput';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const { ok, errors, parsed } = validateExpenseInput(await request.json());
    if (!ok) {
      return NextResponse.json({ error: 'Invalid input', details: errors }, { status: 400 });
    }

    const updated = await prisma.expense.updateMany({
      where: { id, userId: user.id },
      data: {
        amount: parsed.amount,
        category: parsed.category,
        note: parsed.note,
      },
    });
    if (updated.count !== 1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expense = await prisma.expense.findFirst({
      where: { id, userId: user.id },
      select: { id: true, amount: true, category: true, note: true, createdAt: true },
    });
    if (!expense) {
      return NextResponse.json({ error: 'Updated expense could not be found' }, { status: 500 });
    }

    return NextResponse.json({
      ...expense,
      createdAt: expense.createdAt.toISOString(),
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error updating expense:', error.code, error.message);
    } else {
      console.error('Update expense error:', error);
    }
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const deleted = await prisma.expense.deleteMany({ where: { id, userId: user.id } });
    if (deleted.count !== 1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Expense deleted' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
