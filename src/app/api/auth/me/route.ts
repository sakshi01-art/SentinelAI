import { NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return apiError("Not authenticated", 401);
  }

  return apiSuccess({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  });
}
