import { NextRequest } from "next/server";
import { db } from "@/db";
import { networkEvents } from "@/db/schema";
import { getCurrentUserFromRequest, requireRole } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { generateBatch } from "@/lib/simulator";
import { runDetectionPipeline } from "../route";
import type { EventScenario } from "@/lib/simulator";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);
  if (!requireRole(user.role, "analyst"))
    return apiError("Insufficient permissions", 403);

  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(parseInt(body.count || "10"), 100);
    const scenario = (body.scenario || "mixed") as EventScenario;

    const validScenarios = [
      "normal", "brute_force", "port_scan", "dos_ddos",
      "data_exfiltration", "lateral_movement", "malware_c2",
      "insider_threat", "mixed",
    ];

    if (!validScenarios.includes(scenario)) {
      return apiError(`Invalid scenario. Valid: ${validScenarios.join(", ")}`, 400);
    }

    const simulatedEvents = generateBatch(count, scenario);
    const results = [];

    for (const simEvent of simulatedEvents) {
      const [stored] = await db
        .insert(networkEvents)
        .values({
          timestamp: simEvent.timestamp,
          sourceIp: simEvent.sourceIp,
          destinationIp: simEvent.destinationIp,
          sourcePort: simEvent.sourcePort,
          destinationPort: simEvent.destinationPort,
          protocol: simEvent.protocol,
          duration: simEvent.duration,
          packetCount: simEvent.packetCount,
          bytesSent: simEvent.bytesSent,
          bytesReceived: simEvent.bytesReceived,
          requestCount: simEvent.requestCount,
          responseCount: simEvent.responseCount,
          authFailureCount: simEvent.authFailureCount,
          eventType: simEvent.eventType as "network_flow" | "auth_event" | "dns_query" | "http_request" | "system_call" | "file_access" | "process_event" | "anomaly",
          flags: simEvent.flags,
          userId: simEvent.userId,
          metadata: simEvent.metadata,
          source: "simulator",
        })
        .returning();

      const detection = await runDetectionPipeline(stored);
      results.push({ event: stored, detection });
    }

    const threats = results.filter((r) => r.detection?.fusionResult?.isThreat);
    const alerts = results.filter((r) => r.detection?.alert);

    return apiSuccess({
      generated: count,
      scenario,
      threatsDetected: threats.length,
      alertsCreated: alerts.length,
      results: results.map((r) => ({
        eventId: r.event.id,
        sourceIp: r.event.sourceIp,
        destinationIp: r.event.destinationIp,
        isThreat: r.detection?.fusionResult?.isThreat || false,
        riskScore: r.detection?.fusionResult?.finalRiskScore || 0,
        severity: r.detection?.fusionResult?.severity || "low",
        alertId: r.detection?.alert?.id || null,
      })),
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return apiError("Simulation failed", 500);
  }
}
