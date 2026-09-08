import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, detectionRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(_request: NextRequest) {
  try {
    // Create default admin user if none exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "admin@sentinelai.com"))
      .limit(1);

    let adminUser = null;
    if (existing.length === 0) {
      const passwordHash = await hashPassword("SentinelAI@2024");
      const [admin] = await db
        .insert(users)
        .values({
          username: "admin",
          email: "admin@sentinelai.com",
          passwordHash,
          role: "admin",
        })
        .returning({ id: users.id, username: users.username, email: users.email });
      adminUser = admin;
    }

    // Create default analyst
    const analystExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "analyst@sentinelai.com"))
      .limit(1);

    if (analystExists.length === 0) {
      const passwordHash = await hashPassword("Analyst@2024");
      await db.insert(users).values({
        username: "analyst",
        email: "analyst@sentinelai.com",
        passwordHash,
        role: "analyst",
      });
    }

    // Create default viewer
    const viewerExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "viewer@sentinelai.com"))
      .limit(1);

    if (viewerExists.length === 0) {
      const passwordHash = await hashPassword("Viewer@2024");
      await db.insert(users).values({
        username: "viewer",
        email: "viewer@sentinelai.com",
        passwordHash,
        role: "viewer",
      });
    }

    // Seed detection rules into DB
    const rulesExist = await db
      .select({ id: detectionRules.id })
      .from(detectionRules)
      .limit(1);

    if (rulesExist.length === 0) {
      await db.insert(detectionRules).values([
        {
          name: "Brute Force Authentication",
          description: "Detects repeated authentication failures from a single source",
          category: "brute_force",
          severity: "high",
          scoreWeight: 25,
          conditions: { authFailureCount: { gte: 5 } },
          isEnabled: true,
        },
        {
          name: "Port Scan Detection",
          description: "Detects rapid connection attempts across multiple ports",
          category: "port_scan",
          severity: "medium",
          scoreWeight: 20,
          conditions: { duration: { lt: 0.5 }, packetRate: { gt: 100 } },
          isEnabled: true,
        },
        {
          name: "Data Exfiltration - Abnormal Upload",
          description: "Detects unusually large outbound data transfers",
          category: "data_exfiltration",
          severity: "high",
          scoreWeight: 30,
          conditions: { bytesSent: { gt: 52428800 } },
          isEnabled: true,
        },
        {
          name: "DoS/DDoS Pattern",
          description: "Detects denial of service attack patterns",
          category: "dos_ddos",
          severity: "critical",
          scoreWeight: 35,
          conditions: { requestRate: { gt: 500 }, packetCount: { gt: 10000 } },
          isEnabled: true,
        },
        {
          name: "Suspicious Destination Port",
          description: "Connection to commonly exploited or suspicious ports",
          category: "unauthorized_access",
          severity: "medium",
          scoreWeight: 15,
          conditions: { destinationPort: { in: [23, 135, 139, 445, 1433, 3389, 4444, 5900, 6379, 27017] } },
          isEnabled: true,
        },
        {
          name: "Internal Lateral Movement",
          description: "Detects potential lateral movement within internal network",
          category: "unauthorized_access",
          severity: "high",
          scoreWeight: 25,
          conditions: { internalToInternal: true, adminPort: true },
          isEnabled: true,
        },
      ]);
    }

    return apiSuccess({
      message: "System initialized successfully",
      defaultCredentials: {
        admin: { email: "admin@sentinelai.com", password: "SentinelAI@2024" },
        analyst: { email: "analyst@sentinelai.com", password: "Analyst@2024" },
        viewer: { email: "viewer@sentinelai.com", password: "Viewer@2024" },
      },
      adminCreated: adminUser !== null,
    });
  } catch (error) {
    console.error("Init error:", error);
    return apiError("Initialization failed: " + String(error), 500);
  }
}
