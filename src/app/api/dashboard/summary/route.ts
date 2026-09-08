import { NextRequest } from "next/server";
import { db } from "@/db";
import { networkEvents, alerts, incidents, detections } from "@/db/schema";
import { eq, and, gte, sql, count, desc, avg } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total events
    const [{ totalEvents }] = await db
      .select({ totalEvents: count() })
      .from(networkEvents);

    // Events last 24h
    const [{ events24h }] = await db
      .select({ events24h: count() })
      .from(networkEvents)
      .where(gte(networkEvents.timestamp, last24h));

    // Threats detected
    const [{ totalThreats }] = await db
      .select({ totalThreats: count() })
      .from(detections)
      .where(eq(detections.isThreat, true));

    // Threats last 24h
    const [{ threats24h }] = await db
      .select({ threats24h: count() })
      .from(detections)
      .where(
        and(
          eq(detections.isThreat, true),
          gte(detections.detectedAt, last24h)
        )
      );

    // Critical alerts
    const [{ criticalAlerts }] = await db
      .select({ criticalAlerts: count() })
      .from(alerts)
      .where(
        and(
          eq(alerts.severity, "critical"),
          eq(alerts.status, "new")
        )
      );

    // All open alerts
    const [{ openAlerts }] = await db
      .select({ openAlerts: count() })
      .from(alerts)
      .where(eq(alerts.status, "new"));

    // Active incidents
    const [{ activeIncidents }] = await db
      .select({ activeIncidents: count() })
      .from(incidents)
      .where(
        and(
          sql`${incidents.status} NOT IN ('resolved', 'closed')`
        )
      );

    // False positives
    const [{ falsePositives }] = await db
      .select({ falsePositives: count() })
      .from(alerts)
      .where(eq(alerts.status, "false_positive"));

    // Anomalies detected
    const [{ anomalies }] = await db
      .select({ anomalies: count() })
      .from(detections)
      .where(
        and(
          gte(detections.normalizedAnomalyScore, 0.55),
          gte(detections.detectedAt, last24h)
        )
      );

    // Average risk score
    const [{ avgRisk }] = await db
      .select({ avgRisk: avg(detections.finalRiskScore) })
      .from(detections)
      .where(gte(detections.detectedAt, last24h));

    // Severity distribution
    const severityDist = await db
      .select({
        severity: alerts.severity,
        count: count(),
      })
      .from(alerts)
      .where(gte(alerts.createdAt, last7d))
      .groupBy(alerts.severity);

    // Category distribution
    const categoryDist = await db
      .select({
        category: alerts.category,
        count: count(),
      })
      .from(alerts)
      .where(gte(alerts.createdAt, last7d))
      .groupBy(alerts.category);

    // Detection method distribution
    const detectionDist = await db
      .select({
        methods: detections.detectionMethods,
        count: count(),
      })
      .from(detections)
      .where(gte(detections.detectedAt, last7d))
      .groupBy(detections.detectionMethods);

    // Recent alerts (top 5)
    const recentAlerts = await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt))
      .limit(5);

    // Timeline — events per hour for last 24h
    const timeline = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${networkEvents.timestamp})`,
        eventCount: count(),
      })
      .from(networkEvents)
      .where(gte(networkEvents.timestamp, last24h))
      .groupBy(sql`date_trunc('hour', ${networkEvents.timestamp})`)
      .orderBy(sql`date_trunc('hour', ${networkEvents.timestamp})`);

    const threatTimeline = await db
      .select({
        hour: sql<string>`date_trunc('hour', ${detections.detectedAt})`,
        threatCount: count(),
      })
      .from(detections)
      .where(
        and(
          eq(detections.isThreat, true),
          gte(detections.detectedAt, last24h)
        )
      )
      .groupBy(sql`date_trunc('hour', ${detections.detectedAt})`)
      .orderBy(sql`date_trunc('hour', ${detections.detectedAt})`);

    return apiSuccess({
      summary: {
        totalEvents: Number(totalEvents),
        events24h: Number(events24h),
        totalThreats: Number(totalThreats),
        threats24h: Number(threats24h),
        criticalAlerts: Number(criticalAlerts),
        openAlerts: Number(openAlerts),
        activeIncidents: Number(activeIncidents),
        falsePositives: Number(falsePositives),
        anomalies24h: Number(anomalies),
        avgRiskScore: parseFloat(String(avgRisk || 0)).toFixed(1),
      },
      distributions: {
        severity: severityDist,
        category: categoryDist,
      },
      recentAlerts,
      timeline: {
        events: timeline,
        threats: threatTimeline,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return apiError("Failed to fetch dashboard summary", 500);
  }
}
