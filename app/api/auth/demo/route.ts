import { NextRequest, NextResponse } from 'next/server';

// This endpoint creates demo data for testing
export async function POST() {
  try {
    return NextResponse.json(
      {
        message: 'Demo account created',
        user: {
          id: 'demo123',
          email: 'demo@ease.com',
          password: 'demo123',
          name: 'Demo User',
          businessName: 'Demo Business',
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to create demo data' },
      { status: 500 }
    );
  }
}
