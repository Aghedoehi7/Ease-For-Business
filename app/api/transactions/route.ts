import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Parse items JSON for each transaction
    const transactionsWithParsedItems = transactions.map(transaction => ({
      ...transaction,
      items: JSON.parse(transaction.items),
    }));

    return NextResponse.json({ transactions: transactionsWithParsedItems }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const { type, reason, items, totalAmount, paymentMethod } = body;

    if (!type || !reason || !items || totalAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['in', 'out', 'adjustment'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // For 'out' transactions (sales), update product quantities
    if (type === 'out') {
      for (const item of items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, userId: user.id },
        });
        if (!product) {
          return NextResponse.json(
            { error: `Product ${item.productId} not found` },
            { status: 404 }
          );
        }
        if (product.quantity < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}` },
            { status: 400 }
          );
        }
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: product.quantity - item.quantity },
        });
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type,
        reason,
        items: JSON.stringify(items),
        totalAmount: parseFloat(totalAmount),
        paymentMethod,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
