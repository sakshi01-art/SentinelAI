import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users, sessions, auditLogs } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";
const JWT_EXPIRES_IN = "24h";
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  sessionId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  const [session] = await db
    .insert(sessions)
    .values({ userId, token, expiresAt, ipAddress, userAgent })
    .returning();

  return session;
}

export async function invalidateSession(token: string) {
  await db
    .update(sessions)
    .set({ isActive: false })
    .where(eq(sessions.token, token));
}

export async function validateSession(token: string) {
  const [session] = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.token, token),
        eq(sessions.isActive, true),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  return session || null;
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sentinel_token")?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const session = await validateSession(token);
    if (!session) return null;

    return session.user;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies["sentinel_token"];

  if (!token) {
    // Also try Authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const bearerToken = authHeader.slice(7);
      const payload = verifyToken(bearerToken);
      if (!payload) return null;
      const session = await validateSession(bearerToken);
      return session?.user || null;
    }
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) return null;

  const session = await validateSession(token);
  return session?.user || null;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, val] = cookie.trim().split("=");
      if (key && val) acc[key.trim()] = decodeURIComponent(val.trim());
      return acc;
    },
    {} as Record<string, string>
  );
}

export async function logAudit(
  action: string,
  options: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
  } = {}
) {
  try {
    await db.insert(auditLogs).values({
      action,
      userId: options.userId,
      resourceType: options.resourceType,
      resourceId: options.resourceId as `${string}-${string}-${string}-${string}-${string}` | undefined,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}

export async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { allowed: false, remainingAttempts: 0 };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { allowed: false, remainingAttempts: 0 };
  }

  const remaining = MAX_LOGIN_ATTEMPTS - (user.loginAttempts || 0);
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
}

export async function incrementLoginAttempts(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  const attempts = (user.loginAttempts || 0) + 1;
  const lockedUntil =
    attempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
      : null;

  await db
    .update(users)
    .set({ loginAttempts: attempts, lockedUntil })
    .where(eq(users.id, userId));
}

export async function resetLoginAttempts(userId: string) {
  await db
    .update(users)
    .set({ loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}

export function requireRole(
  userRole: string,
  requiredRole: "admin" | "analyst" | "viewer"
): boolean {
  const hierarchy: Record<string, number> = {
    admin: 3,
    analyst: 2,
    viewer: 1,
  };
  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
}
