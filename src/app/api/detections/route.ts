import { NextRequest } from "next/server";
import { db } from "@/db";
import { detections, networkEvents } from "@/db/schema";
import { desc, eq, and, gte, count } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "20"));
  const isThreat = searchParams.get("isThreat");
  const severity = searchParams.get("severity");
  const from = searchParams.get("from");
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (isThreat !== null) conditions.push(eq(detections.isThreat, isThreat === "true"));
    if (severity) conditions.push(eq(detections.severity, severity as "low" | "medium" | "high" | "critical"));
    if (from) conditions.push(gte(detections.detectedAt, new Date(from)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(detections)
      .where(whereClause);

    const results = await db
      .select({
        detection: detections,
        event: {
          id: networkEvents.id,
          sourceIp: networkEvents.sourceIp,
          destinationIp: networkEvents.destinationIp,
          eventType: networkEvents.eventType,
          timestamp: networkEvents.timestamp,
        },
      })
      .from(detections)
      .innerJoin(networkEvents, eq(detections.eventId, networkEvents.id))
      .where(whereClause)
      .orderBy(desc(detections.detectedAt))
      .limit(pageSize)
      .offset(offset);

    return apiSuccess({
      detections: results,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        pages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error("Detections fetch error:", error);
    return apiError("Failed to fetch detections", 500);
  }
}
