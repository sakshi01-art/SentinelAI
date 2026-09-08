import { NextRequest } from "next/server";
import { db } from "@/db";
import { incidents, incidentNotes, alerts } from "@/db/schema";
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
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);

    if (!incident) return apiError("Incident not found", 404);

    const notes = await db
      .select()
      .from(incidentNotes)
      .where(eq(incidentNotes.incidentId, id))
      .orderBy(incidentNotes.createdAt);

    const relatedAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.incidentId, id));

    return apiSuccess({ incident, notes, alerts: relatedAlerts });
  } catch (error) {
    console.error("Incident fetch error:", error);
    return apiError("Failed to fetch incident", 500);
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
    const { status, assignedTo, title, description, containmentActions, rootCause, resolution, note } = body;

    const [existing] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);

    if (!existing) return apiError("Incident not found", 404);

    // Add to timeline
    const currentTimeline = (existing.timeline as unknown[]) || [];
    const newEntry = {
      timestamp: new Date().toISOString(),
      action: status ? "status_changed" : "updated",
      actor: user.username,
      description: status
        ? `Status changed to ${status}`
        : "Incident updated",
      previousStatus: existing.status,
      newStatus: status || existing.status,
    };

    const updateData: Partial<typeof incidents.$inferInsert> = {
      updatedAt: new Date(),
      timeline: [...currentTimeline, newEntry],
    };

    if (status) updateData.status = status;
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (containmentActions !== undefined) updateData.containmentActions = containmentActions;
    if (rootCause !== undefined) updateData.rootCause = rootCause;
    if (resolution !== undefined) updateData.resolution = resolution;

    if (status === "resolved" || status === "closed") {
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(incidents)
      .set(updateData)
      .where(eq(incidents.id, id))
      .returning();

    // Add note if provided
    if (note) {
      await db.insert(incidentNotes).values({
        incidentId: id,
        authorId: user.id,
        content: note,
        noteType: "comment",
      });
    }

    await logAudit("incident_updated", {
      userId: user.id,
      resourceType: "incident",
      resourceId: id,
      details: { changes: Object.keys(body) },
    });

    return apiSuccess({ incident: updated });
  } catch (error) {
    console.error("Incident update error:", error);
    return apiError("Failed to update incident", 500);
  }
}
