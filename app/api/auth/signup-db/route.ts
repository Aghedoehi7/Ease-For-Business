
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, businessName } = body;

    // 1. Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // 2. Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // 3. Hash password
    const hashedPassword = await hashPassword(password);

    // 4. Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        businessName,
      },
    });

    // 5. Create JWT and set auth cookie
    const token = await signToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json(
      {
        message: "User created successfully",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          businessName: user.businessName,
        },
      },
      { status: 201 }
    );

    response.cookies.set({
      name: 'auth-token',
      value: token,
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("SIGNUP_ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}