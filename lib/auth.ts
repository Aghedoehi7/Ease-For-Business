
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


// 🔐 Secret (must exist in .env.local)
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

// ======================
// PASSWORD HELPERS
// ======================

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ======================
// JWT HELPERS
// ======================

export async function signToken(payload: { userId: string; email: string }) {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(
      payload,
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "7d" },
      (err, token) => {
        if (err || !token) {
          reject(err || new Error("Failed to create token"));
          return;
        }
        resolve(token);
      }
    );
  });
}

export async function verifyToken(token: string) {
  return new Promise<{ id: string; email: string }>((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err);
        return;
      }
      const payload = decoded as { userId: string; email: string };
      resolve({ id: payload.userId, email: payload.email });
    });
  });
}

function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (!name) return;
    cookies[name.trim()] = rest.join("=").trim();
  });

  return cookies;
}

export async function requireAuth(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.replace("Bearer ", "").trim();
  const cookieHeader = req.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = bearerToken || cookies["auth-token"];

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    return await verifyToken(token);
  } catch (err) {
    throw new Error("Unauthorized");
  }
}