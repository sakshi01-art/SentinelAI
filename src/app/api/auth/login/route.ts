import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  verifyPassword,
  generateToken,
  createSession,
  resetLoginAttempts,
  incrementLoginAttempts,
  logAudit,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      await logAudit("login_failed", {
        details: { email, reason: "user_not_found" },
        ipAddress: ip,
        userAgent,
        success: false,
      });
      return apiError("Invalid credentials", 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const lockRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      await logAudit("login_failed", {
        userId: user.id,
        details: { reason: "account_locked", lockRemaining },
        ipAddress: ip,
        success: false,
      });
      return apiError(
        `Account locked. Try again in ${lockRemaining} minutes.`,
        429
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return apiError("Account is disabled. Contact administrator.", 403);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await incrementLoginAttempts(user.id);
      await logAudit("login_failed", {
        userId: user.id,
        details: { reason: "invalid_password" },
        ipAddress: ip,
        userAgent,
        success: false,
      });
      return apiError("Invalid credentials", 401);
    }

    // Reset login attempts on success
    await resetLoginAttempts(user.id);

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      sessionId: crypto.randomUUID(),
    });

    // Create session
    const session = await createSession(user.id, token, ip, userAgent);

    await logAudit("user_login", {
      userId: user.id,
      details: { username: user.username, role: user.role },
      ipAddress: ip,
      userAgent,
      success: true,
    });

    const response = apiSuccess({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      sessionId: session.id,
      expiresAt: session.expiresAt,
    });

    // Set HTTP-only cookie
    const headers = new Headers(response.headers);
    headers.set(
      "Set-Cookie",
      `sentinel_token=${token}; HttpOnly; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Strict`
    );

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Login error:", error);
    return apiError("Login failed. Please try again.", 500);
  }
}
