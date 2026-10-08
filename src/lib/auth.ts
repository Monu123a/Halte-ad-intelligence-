import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export type SessionUser = {
  id: string;
  email: string;
  role: "ADMIN" | "ANALYST";
};

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get("session")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    // Optional: Validate user still exists in DB
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return null;
    return decoded;
  } catch (e) {
    return null;
  }
}

export function setSessionToken(user: SessionUser) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  
  cookies().set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export function clearSession() {
  cookies().delete("session");
}
