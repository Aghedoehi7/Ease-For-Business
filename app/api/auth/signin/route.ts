import { NextRequest, NextResponse } from 'next/server';

interface SignInRequest {
  email: string;
  password: string;
}

// Mock database - in production, use a real database
interface MockUser {
  email: string;
  password: string;
  [key: string]: unknown;
}

const usersDB: MockUser[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignInRequest;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user (in production, use proper database and hashed passwords)
    const user = usersDB.find((u) => u.email === email && u.password === password);

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as { password?: unknown }).password;

    return NextResponse.json(
      {
        message: 'Login successful',
        user: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
