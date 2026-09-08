import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  networkEvents,
  eventFeatures,
  detections,
  alerts,
  detectionRules,
} from "@/db/schema";
import { desc, eq, and, gte, lte, like, sql, count } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import {
  extractFeatures,
  classify,
  detectAnomaly,
  fuseDetections,
} from "@/lib/detection/ml";
import { runRuleEngine } from "@/lib/detection/rules";
import type { NormalizedEvent } from "@/lib/detection/rules";

// ─── GET /api/events ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "20"));
  const eventType = searchParams.get("eventType");
  const sourceIp = searchParams.get("sourceIp");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (eventType) conditions.push(eq(networkEvents.eventType, eventType as "network_flow" | "auth_event" | "dns_query" | "http_request" | "system_call" | "file_access" | "process_event" | "anomaly"));
    if (sourceIp) conditions.push(like(networkEvents.sourceIp, `%${sourceIp}%`));
    if (from) conditions.push(gte(networkEvents.timestamp, new Date(from)));
    if (to) conditions.push(lte(networkEvents.timestamp, new Date(to)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(networkEvents)
      .where(whereClause);

    const events = await db
      .select()
      .from(networkEvents)
      .where(whereClause)
      .orderBy(desc(networkEvents.timestamp))
      .limit(pageSize)
      .offset(offset);

    return apiSuccess({
      events,
      pagination: {
        page,
        pageSize,
        total: Number(total),
        pages: Math.ceil(Number(total) / pageSize),
      },
    });
  } catch (error) {
    console.error("Events fetch error:", error);
    return apiError("Failed to fetch events", 500);
  }
}

// ─── POST /api/events ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return apiError("Not authenticated", 401);

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.sourceIp || !body.destinationIp) {
      return apiError("sourceIp and destinationIp are required", 400);
    }

    // Validate IP format (basic)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(body.sourceIp) || !ipRegex.test(body.destinationIp)) {
      return apiError("Invalid IP address format", 400);
    }

    // Sanitize and store event
    const [event] = await db
      .insert(networkEvents)
      .values({
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        sourceIp: body.sourceIp,
        destinationIp: body.destinationIp,
        sourcePort: body.sourcePort ? parseInt(body.sourcePort) : null,
        destinationPort: body.destinationPort
          ? parseInt(body.destinationPort)
          : null,
        protocol: body.protocol || "TCP",
        duration: body.duration ? parseFloat(body.duration) : null,
        packetCount: body.packetCount ? parseInt(body.packetCount) : null,
        bytesSent: body.bytesSent ? parseInt(body.bytesSent) : null,
        bytesReceived: body.bytesReceived ? parseInt(body.bytesReceived) : null,
        requestCount: body.requestCount ? parseInt(body.requestCount) : null,
        responseCount: body.responseCount ? parseInt(body.responseCount) : null,
        authFailureCount: body.authFailureCount
          ? parseInt(body.authFailureCount)
          : 0,
        eventType: body.eventType || "network_flow",
        flags: body.flags || null,
        userId: body.userId || null,
        metadata: body.metadata || null,
        source: "api",
      })
      .returning();

    // Run detection pipeline asynchronously
    const detectionResult = await runDetectionPipeline(event);

    return apiSuccess(
      {
        event,
        detection: detectionResult,
        message: "Event ingested and analyzed successfully",
      },
      201
    );
  } catch (error) {
    console.error("Event ingestion error:", error);
    return apiError("Failed to ingest event", 500);
  }
}

// ─── Detection Pipeline ───────────────────────────────────────────────────────

export async function runDetectionPipeline(event: typeof networkEvents.$inferSelect) {
  try {
    // 1. Normalize event for detection engines
    const normalizedEvent: NormalizedEvent = {
      sourceIp: event.sourceIp,
      destinationIp: event.destinationIp,
      sourcePort: event.sourcePort,
      destinationPort: event.destinationPort,
      protocol: event.protocol,
      duration: event.duration,
      packetCount: event.packetCount,
      bytesSent: event.bytesSent,
      bytesReceived: event.bytesReceived,
      requestCount: event.requestCount,
      responseCount: event.responseCount,
      authFailureCount: event.authFailureCount,
      eventType: event.eventType,
      flags: event.flags,
      userId: event.userId,
      metadata: event.metadata as Record<string, unknown> | null,
      timestamp: event.timestamp,
    };

    // 2. Rule engine
    const ruleResult = runRuleEngine(normalizedEvent);

    // 3. Feature extraction
    const features = extractFeatures({
      duration: event.duration,
      bytesSent: event.bytesSent,
      bytesReceived: event.bytesReceived,
      packetCount: event.packetCount,
      requestCount: event.requestCount,
      responseCount: event.responseCount,
      authFailureCount: event.authFailureCount,
      destinationPort: event.destinationPort,
      protocol: event.protocol,
      eventType: event.eventType,
      timestamp: event.timestamp,
    });

    // 4. ML classification
    const mlPrediction = classify(features);

    // 5. Anomaly detection
    const anomalyResult = detectAnomaly(features);

    // 6. Behavioral baseline (simplified — compare against expected ranges)
    const behavioralDeviationScore = computeBehavioralDeviation(features);

    // 7. Detection fusion
    const fusionResult = fuseDetections(
      ruleResult.totalRuleScore,
      mlPrediction,
      anomalyResult,
      behavioralDeviationScore,
      ruleResult.categories
    );

    // 8. Store features
    await db.insert(eventFeatures).values({
      eventId: event.id,
      normalizedDuration: features.normalizedDuration,
      normalizedBytes: features.normalizedBytes,
      normalizedPackets: features.normalizedPackets,
      byteRatio: features.byteRatio,
      packetRate: features.packetRate,
      byteRate: features.byteRate,
      authFailureRate: features.authFailureRate,
      portCategory: features.portCategory,
      protocolEncoded: Math.round(features.protocolEncoded * 100),
      eventTypeEncoded: Math.round(features.eventTypeEncoded * 100),
      hourOfDay: Math.round(features.hourOfDay * 23),
      dayOfWeek: Math.round(features.dayOfWeek * 6),
      isWeekend: features.isWeekend === 1,
      requestResponseRatio: features.requestResponseRatio,
      connectionDensity: features.connectionDensity,
      entropyScore: features.entropyScore,
      featureVector: features as unknown as Record<string, unknown>,
    });

    // 9. Store detection
    const [detection] = await db
      .insert(detections)
      .values({
        eventId: event.id,
        ruleScore: ruleResult.totalRuleScore,
        mlScore: mlPrediction.threatProbability * 100,
        mlConfidence: mlPrediction.confidence,
        anomalyScore: anomalyResult.anomalyScore,
        normalizedAnomalyScore: anomalyResult.normalizedAnomalyScore,
        behavioralDeviationScore,
        finalRiskScore: fusionResult.finalRiskScore,
        severity: fusionResult.severity,
        threatCategory: fusionResult.threatCategory as "brute_force" | "dos_ddos" | "port_scan" | "data_exfiltration" | "malware" | "insider_threat" | "unauthorized_access" | "anomaly" | "normal",
        isThreat: fusionResult.isThreat,
        confidence: fusionResult.confidence,
        detectionMethods: fusionResult.detectionMethods,
        matchedRules: ruleResult.matchedRules,
        explanation: fusionResult.explanation,
        mlExplanation: {
          shapValues: mlPrediction.shapExplanation,
          featureImportance: mlPrediction.featureImportance,
          decisionPath: mlPrediction.decisionPath,
        } as Record<string, unknown>,
        ruleEvidence: ruleResult.matchedRules as unknown as Record<string, unknown>[],
        behavioralEvidence: {
          deviationScore: behavioralDeviationScore,
          factors: anomalyResult.contributingFactors,
        } as Record<string, unknown>,
        modelVersion: mlPrediction.modelVersion,
      })
      .returning();

    // 10. Create alert if threat detected
    let alert = null;
    if (fusionResult.isThreat && fusionResult.finalRiskScore > 20) {
      const title = generateAlertTitle(
        fusionResult.threatCategory,
        fusionResult.severity,
        event.sourceIp
      );

      [alert] = await db
        .insert(alerts)
        .values({
          detectionId: detection.id,
          eventId: event.id,
          title,
          description: fusionResult.explanation,
          severity: fusionResult.severity,
          riskScore: fusionResult.finalRiskScore,
          category: fusionResult.threatCategory as "brute_force" | "dos_ddos" | "port_scan" | "data_exfiltration" | "malware" | "insider_threat" | "unauthorized_access" | "anomaly" | "normal",
          sourceIp: event.sourceIp,
          destinationIp: event.destinationIp,
          detectionMethods: fusionResult.detectionMethods,
          confidence: fusionResult.confidence,
          explanation: fusionResult.explanation,
          status: "new",
        })
        .returning();
    }

    // 11. Mark event as processed
    await db
      .update(networkEvents)
      .set({ isProcessed: true })
      .where(eq(networkEvents.id, event.id));

    return {
      detection,
      alert,
      ruleResult,
      mlPrediction: {
        isThreat: mlPrediction.isThreat,
        probability: mlPrediction.threatProbability,
        class: mlPrediction.predictedClass,
      },
      anomalyResult: {
        isAnomaly: anomalyResult.isAnomaly,
        score: anomalyResult.anomalyScore,
      },
      fusionResult,
    };
  } catch (err) {
    console.error("Detection pipeline error:", err);
    await db
      .update(networkEvents)
      .set({ processingError: String(err) })
      .where(eq(networkEvents.id, event.id));
    return null;
  }
}

function computeBehavioralDeviation(features: ReturnType<typeof extractFeatures>): number {
  // Simplified behavioral baseline comparison
  // In production: compare against stored behavioral_baselines table
  const deviations = [
    Math.max(0, features.authFailureRate - 0.02),
    Math.max(0, features.normalizedBytes - 0.3),
    Math.max(0, features.packetRate - 0.2),
    features.portCategory > 1 ? 0.2 : 0,
  ];

  return Math.min(
    deviations.reduce((a, b) => a + b, 0) / deviations.length,
    1.0
  );
}

function generateAlertTitle(
  category: string,
  severity: string,
  sourceIp: string
): string {
  const titles: Record<string, string> = {
    brute_force: `Brute Force Attack from ${sourceIp}`,
    dos_ddos: `DoS/DDoS Attack Detected from ${sourceIp}`,
    port_scan: `Port Scan Activity from ${sourceIp}`,
    data_exfiltration: `Possible Data Exfiltration from ${sourceIp}`,
    malware: `Malware/C2 Communication from ${sourceIp}`,
    lateral_movement: `Lateral Movement from ${sourceIp}`,
    unauthorized_access: `Unauthorized Access Attempt from ${sourceIp}`,
    insider_threat: `Insider Threat Activity from ${sourceIp}`,
    anomaly: `Anomalous Traffic from ${sourceIp}`,
  };

  return titles[category] || `Security Alert [${severity.toUpperCase()}] from ${sourceIp}`;
}
