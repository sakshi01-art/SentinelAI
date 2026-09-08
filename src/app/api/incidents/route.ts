import { NextRequest } from "next/server";
import { db } from "@/db";
import { incidents, alerts } from "@/db/schema";
import { desc, eq, and, count } from "drizzle-orm";
import {
  getCurrentUserFromRequest,
  requireRole,
  logAudit,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "20"));
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (status) conditions.push(eq(incidents.status, status as "open" | "investigating" | "contained" | "resolved" | "closed"));
    if (severity) conditions.push(eq(incidents.severity, severity as "low" | "medium" | "high" | "critical"));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(incidents)
      .where(whereClause);

    const incidentList = await db
      .select()
      .from(incidents)
      .where(whereClause)
      .orderBy(desc(incidents.createdAt))
      .limit(pageSize)
      .offset(offset);

    return apiSuccess({
      incidents: incidentList,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        pages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error("Incidents fetch error:", error);
    return apiError("Failed to fetch incidents", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);
  if (!requireRole(user.role, "analyst"))
    return apiError("Insufficient permissions", 403);

  try {
    const body = await request.json();
    const { title, description, severity, alertIds, assignedTo } = body;

    if (!title || !severity) {
      return apiError("Title and severity are required", 400);
    }

    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(severity)) {
      return apiError("Invalid severity", 400);
    }

    const [incident] = await db
      .insert(incidents)
      .values({
        title,
        description: description || null,
        severity,
        status: "open",
        alertIds: alertIds || [],
        assignedTo: assignedTo || user.id,
        createdBy: user.id,
        timeline: [
          {
            timestamp: new Date().toISOString(),
            action: "incident_created",
            actor: user.username,
            description: `Incident created by ${user.username}`,
          },
        ],
      })
      .returning();

    // Link alerts to this incident
    if (alertIds && Array.isArray(alertIds)) {
      for (const alertId of alertIds) {
        await db
          .update(alerts)
          .set({ incidentId: incident.id })
          .where(eq(alerts.id, alertId));
      }
    }

    await logAudit("incident_created", {
      userId: user.id,
      resourceType: "incident",
      resourceId: incident.id,
      details: { title, severity },
    });

    return apiSuccess({ incident }, 201);
  } catch (error) {
    console.error("Incident creation error:", error);
    return apiError("Failed to create incident", 500);
  }
}
