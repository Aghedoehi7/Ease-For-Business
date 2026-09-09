import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const products = await prisma.product.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const { name, description, price, quantity, sku, category } = body;

    if (!name || !sku || !price || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if SKU already exists for this user
    const existing = await prisma.product.findFirst({
      where: { sku, userId: user.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 409 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        userId: user.id,
        name,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        sku,
        category,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        // Foreign key constraint failed
        console.error('FK constraint error creating product:', error.meta);
        return NextResponse.json(
          { error: 'User not found. Please re-login.' },
          { status: 400 }
        );
      }
      if (error.code === 'P2002') {
        // Unique constraint (SKU already exists)
        console.error('Unique constraint error creating product:', error.meta);
        return NextResponse.json(
          { error: 'SKU already exists for this user' },
          { status: 409 }
        );
      }
    }
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
