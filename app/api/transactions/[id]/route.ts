import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type SaleItemInput = {
  productId: string;
  quantity: number;
  price: number;
};

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
  for (const rawItem of value) {
    if (!isRecord(rawItem)) return null;
    const productId = typeof rawItem.productId === 'string' ? rawItem.productId.trim() : '';
    const quantity = Number(rawItem.quantity);
    const price = Number(rawItem.price);
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body: unknown = await request.json();
    const items = isRecord(body) ? parseSaleItems(body.items) : null;
    if (!items) {
      return NextResponse.json({ error: 'Provide sale lines with product, positive whole-number quantity, and non-negative selling price.' }, { status: 400 });
    }

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({ where: { id, userId: user.id } });
      if (!existing) throw new RequestError('Sale not found.', 404);
      if (existing.type !== 'out' || existing.status !== 'completed') {
        throw new RequestError('Only completed sales can be edited.', 409);
      }

      let existingItems: unknown;
      try {
        existingItems = JSON.parse(existing.items);
      } catch {
        throw new RequestError('Sale items could not be read, so this sale was not changed.', 409);
      }
      if (!Array.isArray(existingItems) || existingItems.length === 0) {
        throw new RequestError('Sale items could not be read, so this sale was not changed.', 409);
      }

      const previousQuantities = new Map<string, number>();
      const previousCosts = new Map<string, number | null>();
      const previousNames = new Map<string, string>();
      for (const rawItem of existingItems) {
        if (
          !isRecord(rawItem) ||
          typeof rawItem.productId !== 'string' ||
          typeof rawItem.quantity !== 'number' ||
          !Number.isInteger(rawItem.quantity) ||
          rawItem.quantity <= 0
        ) {
          throw new RequestError('Sale item history is incomplete, so this sale was not changed.', 409);
        }
        previousQuantities.set(
          rawItem.productId,
          (previousQuantities.get(rawItem.productId) ?? 0) + rawItem.quantity
        );
        if (!previousCosts.has(rawItem.productId)) {
          const historicalCost = rawItem.costPrice == null ? null : Number(rawItem.costPrice);
          previousCosts.set(
            rawItem.productId,
            historicalCost != null && Number.isFinite(historicalCost) && historicalCost >= 0
              ? historicalCost
              : null
          );
        }
        if (!previousNames.has(rawItem.productId) && typeof rawItem.name === 'string') {
          previousNames.set(rawItem.productId, rawItem.name);
        }
      }

      const productIds = [...new Set([...previousQuantities.keys(), ...items.map((item) => item.productId)])];
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, userId: user.id },
      });
      const productsById = new Map(products.map((product) => [product.id, product]));
      if (productsById.size !== productIds.length) {
        throw new RequestError('A product from this sale is no longer in inventory, so the sale was not changed.', 409);
      }

      for (const [productId, quantity] of previousQuantities) {
        const restored = await tx.product.updateMany({
          where: { id: productId, userId: user.id },
          data: { quantity: { increment: quantity } },
        });
        if (restored.count !== 1) {
          throw new RequestError('Inventory could not be restored, so the sale was not changed.', 409);
        }
      }

      const newQuantities = new Map<string, number>();
      for (const item of items) {
        newQuantities.set(item.productId, (newQuantities.get(item.productId) ?? 0) + item.quantity);
      }
      for (const [productId, quantity] of newQuantities) {
        const product = productsById.get(productId)!;
        const deducted = await tx.product.updateMany({
          where: { id: productId, userId: user.id, quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (deducted.count !== 1) {
          throw new RequestError(`Insufficient stock for ${product.name}.`, 409);
        }
      }

      let totalAmount = 0;
      let totalCogs = 0;
      let costsComplete = true;
      const snapshots = items.map((item) => {
        const product = productsById.get(item.productId)!;
        const costPrice = previousCosts.has(product.id)
          ? previousCosts.get(product.id)!
          : product.costPrice == null ? null : roundMoney(product.costPrice);
        const lineTotal = roundMoney(item.price * item.quantity);
        const lineCogs = costPrice == null ? null : roundMoney(costPrice * item.quantity);
        totalAmount = roundMoney(totalAmount + lineTotal);
        if (lineCogs == null) costsComplete = false;
        else totalCogs = roundMoney(totalCogs + lineCogs);
        return {
          productId: product.id,
          name: previousNames.get(product.id) ?? product.name,
          quantity: item.quantity,
          price: item.price,
          total: lineTotal,
          costPrice,
          costOfGoodsSold: lineCogs,
          grossProfit: lineCogs == null ? null : roundMoney(lineTotal - lineCogs),
        };
      });
      const costOfGoodsSold = costsComplete ? totalCogs : null;

      const changed = await tx.transaction.updateMany({
        where: { id, userId: user.id, status: 'completed' },
        data: {
          items: JSON.stringify(snapshots),
          totalAmount,
          costOfGoodsSold,
        },
      });
      if (changed.count !== 1) {
        throw new RequestError('This sale changed while it was being edited. Refresh and try again.', 409);
      }

      return {
        ...existing,
        items: snapshots,
        totalAmount,
        costOfGoodsSold,
        grossProfit: costOfGoodsSold == null ? null : roundMoney(totalAmount - costOfGoodsSold),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json(updatedTransaction, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof RequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'Inventory changed while editing the sale. Please try again.' }, { status: 409 });
    }
    console.error('Edit transaction error:', error);
    return NextResponse.json({ error: 'Failed to edit sale' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body: unknown = await request.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('action' in body) ||
      (body.action !== 'cancel' && body.action !== 'refund')
    ) {
      return NextResponse.json({ error: 'Choose cancel or refund for the sale.' }, { status: 400 });
    }
    const status = body.action === 'refund' ? 'refunded' : 'cancelled';

    const transaction = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) throw new RequestError('Sale not found.', 404);
      if (existing.type !== 'out') throw new RequestError('Only sales can be cancelled or refunded.', 400);
      if (existing.status !== 'completed') throw new RequestError('This sale has already been cancelled or refunded.', 409);

      const changed = await tx.transaction.updateMany({
        where: { id, userId: user.id, status: 'completed' },
        data: { status },
      });
      if (changed.count !== 1) {
        throw new RequestError('This sale has already been changed. Refresh and try again.', 409);
      }

      let items: unknown;
      try {
        items = JSON.parse(existing.items);
      } catch {
        throw new RequestError('Sale items could not be read, so inventory was not changed.', 409);
      }
      if (!Array.isArray(items) || items.length === 0) {
        throw new RequestError('Sale items could not be read, so inventory was not changed.', 409);
      }

      const quantities = new Map<string, number>();
      for (const item of items) {
        if (
          typeof item !== 'object' ||
          item === null ||
          !('productId' in item) ||
          typeof item.productId !== 'string' ||
          !('quantity' in item) ||
          typeof item.quantity !== 'number' ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        ) {
          throw new RequestError('Sale items are incomplete, so inventory was not changed.', 409);
        }
        quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      }

      for (const [productId, quantity] of quantities) {
        const restored = await tx.product.updateMany({
          where: { id: productId, userId: user.id },
          data: { quantity: { increment: quantity } },
        });
        if (restored.count === 0) {
          console.warn(`Sale ${id} references a product no longer in this user's inventory; no stock row was restored.`);
        }
      }

      return { ...existing, status, items };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json(transaction, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof RequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return NextResponse.json({ error: 'This sale changed while it was being updated. Refresh and try again.' }, { status: 409 });
    }
    console.error('Update transaction status error:', error);
    return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
  }
}
