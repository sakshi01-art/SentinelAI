import { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  getCurrentUserFromRequest,
  requireRole,
  hashPassword,
  logAudit,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);
  if (!requireRole(user.role, "admin"))
    return apiError("Admin access required", 403);

  try {
    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        loginAttempts: users.loginAttempts,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return apiSuccess({ users: userList });
  } catch (error) {
    console.error("Users fetch error:", error);
    return apiError("Failed to fetch users", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);
  if (!requireRole(user.role, "admin"))
    return apiError("Admin access required", 403);

  try {
    const body = await request.json();
    const { username, email, password, role } = body;

    if (!username || !email || !password || !role) {
      return apiError("All fields required", 400);
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({ username, email, passwordHash, role })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    await logAudit("user_created_by_admin", {
      userId: user.id,
      resourceType: "user",
      resourceId: newUser.id,
      details: { username, email, role },
    });

    return apiSuccess({ user: newUser }, 201);
  } catch (error) {
    console.error("User creation error:", error);
    return apiError("Failed to create user", 500);
  }
}
