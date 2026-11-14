import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type SaleItemInput = {
  productId: string;
  quantity: number;
  price: number;
};

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function roundMoney(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(rounded) || !Number.isSafeInteger(Math.round(rounded * 100))) {
    throw new RequestError('The sale total exceeds supported currency precision.', 400);
  }
  return rounded;
}

function parseSaleItems(value: unknown): SaleItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return null;

  const parsed: SaleItemInput[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    if (
      !productId ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isSafeInteger(Math.round(price * 100)) ||
      !Number.isSafeInteger(Math.round(price * quantity * 100))
    ) {
      return null;
    }
    parsed.push({ productId, quantity, price: roundMoney(price) });
  }
  return parsed;
}

function parseStoredItems(items: string) {
  try {
    const parsed: unknown = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Unable to parse transaction items:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const limitParam = Number(req.nextUrl.searchParams.get('limit'));
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : undefined,
    });

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        ...transaction,
        items: parseStoredItems(transaction.items),
        grossProfit: transaction.type === 'out' && transaction.costOfGoodsSold != null
          ? roundMoney(transaction.totalAmount - transaction.costOfGoodsSold)
          : null,
      })),
    }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Invalid transaction data' }, { status: 400 });
    }

    const { type, reason, paymentMethod } = body;
    if (typeof type !== 'string' || !['in', 'out', 'adjustment'].includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }
    if (
      typeof reason !== 'string' ||
      !reason.trim() ||
      (paymentMethod != null && typeof paymentMethod !== 'string')
    ) {
      return NextResponse.json({ error: 'Missing or invalid transaction fields' }, { status: 400 });
    }

    if (type !== 'out') {
      const totalAmount = Number(body.totalAmount);
      if (
        !Array.isArray(body.items) ||
        !Number.isFinite(totalAmount) ||
        totalAmount < 0
      ) {
        return NextResponse.json({ error: 'Missing or invalid transaction items or amount' }, { status: 400 });
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type,
          reason: reason.trim(),
          items: JSON.stringify(body.items),
          totalAmount: roundMoney(totalAmount),
          paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : null,
        },
      });
      return NextResponse.json({ ...transaction, items: body.items }, { status: 201 });
    }

    const items = parseSaleItems(body.items);
    if (!items) {
      return NextResponse.json({ error: 'Each sale item needs a product, positive whole-number quantity, and non-negative selling price.' }, { status: 400 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, userId: user.id },
      });
      const productsById = new Map(products.map((product) => [product.id, product]));

      for (const productId of productIds) {
        if (!productsById.has(productId)) {
          throw new RequestError('One or more products were not found in your inventory.', 404);
        }
      }

      const quantities = new Map<string, number>();
      for (const item of items) {
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      }

      for (const [productId, quantity] of quantities) {
        const product = productsById.get(productId)!;
        const updated = await tx.product.updateMany({
          where: { id: productId, userId: user.id, quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (updated.count !== 1) {
          throw new RequestError(`Insufficient stock for ${product.name}.`, 409);
        }
      }

      let totalAmount = 0;
      let totalCogs = 0;
      let costsComplete = true;
      const itemSnapshots = items.map((item) => {
        const product = productsById.get(item.productId)!;
        const lineTotal = roundMoney(item.price * item.quantity);
        const costPrice = product.costPrice == null
          ? null
          : roundMoney(product.costPrice);
        const lineCogs = costPrice == null
          ? null
          : roundMoney(costPrice * item.quantity);
        totalAmount = roundMoney(totalAmount + lineTotal);
        if (lineCogs == null) {
          costsComplete = false;
        } else {
          totalCogs = roundMoney(totalCogs + lineCogs);
        }

        return {
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          price: item.price,
          total: lineTotal,
          costPrice,
          costOfGoodsSold: lineCogs,
          grossProfit: lineCogs == null ? null : roundMoney(lineTotal - lineCogs),
        };
      });

      const costOfGoodsSold = costsComplete ? totalCogs : null;
      const created = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'out',
          reason: reason.trim(),
          items: JSON.stringify(itemSnapshots),
          totalAmount,
          costOfGoodsSold,
          paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : null,
        },
      });

      return {
        ...created,
        items: itemSnapshots,
        grossProfit: costOfGoodsSold == null
          ? null
          : roundMoney(totalAmount - costOfGoodsSold),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof RequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Inventory changed while recording the sale. Please try again.' }, { status: 409 });
    }
    console.error('Create transaction error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
