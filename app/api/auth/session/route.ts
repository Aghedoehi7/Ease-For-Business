import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    return NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
