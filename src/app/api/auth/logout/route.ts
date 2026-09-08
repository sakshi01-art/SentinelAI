import { NextRequest } from "next/server";
import { getCurrentUserFromRequest, invalidateSession, logAudit } from "@/lib/auth";
import { apiSuccess } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (user) {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = cookieHeader.split(";").reduce(
      (acc, c) => {
        const [k, v] = c.trim().split("=");
        if (k && v) acc[k] = v;
        return acc;
      },
      {} as Record<string, string>
    );

    const token = cookies["sentinel_token"];
    if (token) {
      await invalidateSession(token);
    }

    await logAudit("user_logout", {
      userId: user.id,
      details: { username: user.username },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });
  }

  const response = apiSuccess({ message: "Logged out successfully" });
  const headers = new Headers(response.headers);
  headers.set(
    "Set-Cookie",
    "sentinel_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict"
  );

  return new Response(response.body, { status: response.status, headers });
}
