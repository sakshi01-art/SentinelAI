import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { hashPassword, logAudit } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, role } = body;

    // Input validation
    if (!username || !email || !password) {
      return apiError("Username, email, and password are required", 400);
    }

    if (username.length < 3 || username.length > 64) {
      return apiError("Username must be 3-64 characters", 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("Invalid email format", 400);
    }

    if (password.length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return apiError(
        "Password must contain uppercase, lowercase, and a number",
        400
      );
    }

    // Check for existing user
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .limit(1);

    if (existing.length > 0) {
      return apiError("User with this email or username already exists", 409);
    }

    // Validate role (only admin can create admin users — default to analyst for self-registration)
    const assignedRole =
      role === "admin" || role === "analyst" || role === "viewer"
        ? role
        : "analyst";

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        role: assignedRole,
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    await logAudit("user_registered", {
      userId: newUser.id,
      details: { username, email, role: assignedRole },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    return apiSuccess(
      {
        user: newUser,
        message: "Registration successful",
      },
      201
    );
  } catch (error) {
    console.error("Registration error:", error);
    return apiError("Registration failed. Please try again.", 500);
  }
}
