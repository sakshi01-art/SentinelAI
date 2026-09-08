import { NextRequest } from "next/server";
import { db } from "@/db";
import { alerts, detections, networkEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getCurrentUserFromRequest,
  requireRole,
  logAudit,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  const { id } = await params;

  try {
    const [alert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id))
      .limit(1);

    if (!alert) return apiError("Alert not found", 404);

    const [detection] = await db
      .select()
      .from(detections)
      .where(eq(detections.id, alert.detectionId))
      .limit(1);

    const [event] = await db
      .select()
      .from(networkEvents)
      .where(eq(networkEvents.id, alert.eventId))
      .limit(1);

    return apiSuccess({ alert, detection, event });
  } catch (error) {
    console.error("Alert fetch error:", error);
    return apiError("Failed to fetch alert", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);
  if (!requireRole(user.role, "analyst"))
    return apiError("Insufficient permissions", 403);

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, resolutionNote } = body;

    const validStatuses = ["new", "investigating", "confirmed", "false_positive", "resolved"];
    if (status && !validStatuses.includes(status)) {
      return apiError(`Invalid status. Valid: ${validStatuses.join(", ")}`, 400);
    }

    const [existing] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, id))
      .limit(1);

    if (!existing) return apiError("Alert not found", 404);

    const updateData: Partial<typeof alerts.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (resolutionNote) updateData.resolutionNote = resolutionNote;
    if (status === "resolved" || status === "false_positive") {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = user.id;
    }

    const [updated] = await db
      .update(alerts)
      .set(updateData)
      .where(eq(alerts.id, id))
      .returning();

    await logAudit("alert_updated", {
      userId: user.id,
      resourceType: "alert",
      resourceId: id,
      details: { previousStatus: existing.status, newStatus: status },
    });

    return apiSuccess({ alert: updated });
  } catch (error) {
    console.error("Alert update error:", error);
    return apiError("Failed to update alert", 500);
  }
}
