import { NextRequest } from "next/server";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { desc, eq, gte, count, and } from "drizzle-orm";
import { getCurrentUserFromRequest, requireRole } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);
  if (!requireRole(user.role, "admin"))
    return apiError("Admin access required", 403);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "50"));
  const action = searchParams.get("action");
  const from = searchParams.get("from");
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (action) conditions.push(eq(auditLogs.action, action));
    if (from) conditions.push(gte(auditLogs.timestamp, new Date(from)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(whereClause);

    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(pageSize)
      .offset(offset);

    return apiSuccess({
      logs,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        pages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error("Audit logs fetch error:", error);
    return apiError("Failed to fetch audit logs", 500);
  }
}
