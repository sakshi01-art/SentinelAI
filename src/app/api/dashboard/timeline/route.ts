import { NextRequest } from "next/server";
import { db } from "@/db";
import { networkEvents, detections, alerts } from "@/db/schema";
import { gte, eq, and, sql, count, avg } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  const { searchParams } = new URL(request.url);
  const hours = Math.min(168, parseInt(searchParams.get("hours") || "24"));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    const granularity = hours <= 24 ? "hour" : hours <= 72 ? "3 hours" : "day";

    const eventTimeline = await db
      .select({
        bucket: sql<string>`date_trunc('${sql.raw(granularity)}', ${networkEvents.timestamp})`,
        events: count(),
      })
      .from(networkEvents)
      .where(gte(networkEvents.timestamp, since))
      .groupBy(sql`date_trunc('${sql.raw(granularity)}', ${networkEvents.timestamp})`)
      .orderBy(sql`date_trunc('${sql.raw(granularity)}', ${networkEvents.timestamp})`);

    const threatTimeline = await db
      .select({
        bucket: sql<string>`date_trunc('${sql.raw(granularity)}', ${detections.detectedAt})`,
        threats: count(),
        avgRisk: avg(detections.finalRiskScore),
      })
      .from(detections)
      .where(
        and(
          eq(detections.isThreat, true),
          gte(detections.detectedAt, since)
        )
      )
      .groupBy(sql`date_trunc('${sql.raw(granularity)}', ${detections.detectedAt})`)
      .orderBy(sql`date_trunc('${sql.raw(granularity)}', ${detections.detectedAt})`);

    const alertTimeline = await db
      .select({
        bucket: sql<string>`date_trunc('${sql.raw(granularity)}', ${alerts.createdAt})`,
        alerts: count(),
      })
      .from(alerts)
      .where(gte(alerts.createdAt, since))
      .groupBy(sql`date_trunc('${sql.raw(granularity)}', ${alerts.createdAt})`)
      .orderBy(sql`date_trunc('${sql.raw(granularity)}', ${alerts.createdAt})`);

    return apiSuccess({
      granularity,
      hours,
      eventTimeline,
      threatTimeline,
      alertTimeline,
    });
  } catch (error) {
    console.error("Timeline error:", error);
    return apiError("Failed to fetch timeline", 500);
  }
}
