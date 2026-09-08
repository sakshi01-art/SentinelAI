import { NextRequest } from "next/server";
import { db } from "@/db";
import { alerts, detections, networkEvents, users } from "@/db/schema";
import { desc, eq, and, gte, lte, count, like } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "20"));
  const severity = searchParams.get("severity");
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (severity) conditions.push(eq(alerts.severity, severity as "low" | "medium" | "high" | "critical"));
    if (status) conditions.push(eq(alerts.status, status as "new" | "investigating" | "confirmed" | "false_positive" | "resolved"));
    if (category) conditions.push(eq(alerts.category, category as "brute_force" | "dos_ddos" | "port_scan" | "data_exfiltration" | "malware" | "insider_threat" | "unauthorized_access" | "anomaly" | "normal"));
    if (from) conditions.push(gte(alerts.createdAt, new Date(from)));
    if (to) conditions.push(lte(alerts.createdAt, new Date(to)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(alerts)
      .where(whereClause);

    const alertList = await db
      .select()
      .from(alerts)
      .where(whereClause)
      .orderBy(desc(alerts.createdAt))
      .limit(pageSize)
      .offset(offset);

    return apiSuccess({
      alerts: alertList,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        pages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error("Alerts fetch error:", error);
    return apiError("Failed to fetch alerts", 500);
  }
}
