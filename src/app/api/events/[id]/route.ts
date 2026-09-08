import { NextRequest } from "next/server";
import { db } from "@/db";
import { networkEvents, eventFeatures, detections, alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  const { id } = await params;

  try {
    const [event] = await db
      .select()
      .from(networkEvents)
      .where(eq(networkEvents.id, id))
      .limit(1);

    if (!event) return apiError("Event not found", 404);

    const [features] = await db
      .select()
      .from(eventFeatures)
      .where(eq(eventFeatures.eventId, id))
      .limit(1);

    const [detection] = await db
      .select()
      .from(detections)
      .where(eq(detections.eventId, id))
      .limit(1);

    const relatedAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.eventId, id));

    return apiSuccess({
      event,
      features: features || null,
      detection: detection || null,
      alerts: relatedAlerts,
    });
  } catch (error) {
    console.error("Event fetch error:", error);
    return apiError("Failed to fetch event", 500);
  }
}
