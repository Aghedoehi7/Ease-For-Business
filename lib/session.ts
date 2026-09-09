import { cookies } from "next/headers";
import { verifyToken } from "./auth";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) return null;

    const user = await verifyToken(token);
    return { userId: user.id, email: user.email };
  } catch (err) {
    return null;
  }
}