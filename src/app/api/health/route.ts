import { NextRequest } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({
      status: "ok",
      service: "SentinelAI",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "connected",
      components: {
        api: "operational",
        database: "operational",
        detectionEngine: "operational",
        mlClassifier: "operational",
        anomalyDetector: "operational",
        ruleEngine: "operational",
      },
    });
  } catch (error) {
    return Response.json(
      {
        status: "degraded",
        service: "SentinelAI",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: String(error),
      },
      { status: 503 }
    );
  }
}
