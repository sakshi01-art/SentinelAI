/**
 * Rule-Based Detection Engine
 *
 * DSA Concepts: Hash maps for O(1) rule lookup, sorted priority queues
 * CS Concept: Pattern matching, threshold-based detection
 */

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  scoreWeight: number;
  evaluate: (event: NormalizedEvent) => RuleResult | null;
}

export interface NormalizedEvent {
  sourceIp: string;
  destinationIp: string;
  sourcePort: number | null;
  destinationPort: number | null;
  protocol: string | null;
  duration: number | null;
  packetCount: number | null;
  bytesSent: number | null;
  bytesReceived: number | null;
  requestCount: number | null;
  responseCount: number | null;
  authFailureCount: number;
  eventType: string;
  flags: string | null;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  severity: string;
  scoreContribution: number;
  evidence: string;
  details: Record<string, unknown>;
}

// ─── Rule Definitions ─────────────────────────────────────────────────────────
// Rules are defined as data structures + strategy functions (OOP + Strategy Pattern)

export const DETECTION_RULES: DetectionRule[] = [
  {
    id: "RULE-001",
    name: "Brute Force Authentication",
    description: "Detects repeated authentication failures from a single source",
    category: "brute_force",
    severity: "high",
    scoreWeight: 25,
    evaluate(event) {
      const threshold = 5;
      if (event.authFailureCount >= threshold) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: Math.min(
            this.scoreWeight * (event.authFailureCount / threshold),
            40
          ),
          evidence: `Authentication failure count ${event.authFailureCount} exceeds threshold of ${threshold}`,
          details: {
            authFailureCount: event.authFailureCount,
            threshold,
            sourceIp: event.sourceIp,
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-002",
    name: "Port Scan Detection",
    description: "Detects rapid connection attempts across multiple ports",
    category: "port_scan",
    severity: "medium",
    scoreWeight: 20,
    evaluate(event) {
      const isHighPortRange =
        event.destinationPort !== null && event.destinationPort > 1024;
      const shortDuration = event.duration !== null && event.duration < 0.5;
      const highPacketRate =
        event.packetCount !== null &&
        event.duration !== null &&
        event.duration > 0 &&
        event.packetCount / event.duration > 100;

      if (shortDuration && highPacketRate) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: isHighPortRange ? "medium" : "high",
          scoreContribution: this.scoreWeight,
          evidence: `Short duration (${event.duration?.toFixed(3)}s) with high packet rate indicates port scanning`,
          details: {
            duration: event.duration,
            packetCount: event.packetCount,
            destinationPort: event.destinationPort,
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-003",
    name: "Data Exfiltration - Abnormal Upload",
    description: "Detects unusually large outbound data transfers",
    category: "data_exfiltration",
    severity: "high",
    scoreWeight: 30,
    evaluate(event) {
      const exfiltrationThreshold = 50 * 1024 * 1024; // 50 MB
      const suspiciousRatio =
        event.bytesSent !== null &&
        event.bytesReceived !== null &&
        event.bytesReceived > 0 &&
        event.bytesSent / event.bytesReceived > 10;

      if (
        (event.bytesSent !== null && event.bytesSent > exfiltrationThreshold) ||
        suspiciousRatio
      ) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: this.scoreWeight,
          evidence: `Outbound bytes (${event.bytesSent?.toLocaleString()}) indicates possible data exfiltration`,
          details: {
            bytesSent: event.bytesSent,
            bytesReceived: event.bytesReceived,
            ratio: event.bytesReceived
              ? (event.bytesSent || 0) / event.bytesReceived
              : null,
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-004",
    name: "DoS/DDoS Pattern",
    description: "Detects denial of service attack patterns",
    category: "dos_ddos",
    severity: "critical",
    scoreWeight: 35,
    evaluate(event) {
      const highRequestRate =
        event.requestCount !== null &&
        event.duration !== null &&
        event.duration > 0 &&
        event.requestCount / event.duration > 500;

      const massivePackets =
        event.packetCount !== null && event.packetCount > 10000;

      if (highRequestRate || massivePackets) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: this.scoreWeight,
          evidence: `Request rate or packet count indicates DoS/DDoS activity`,
          details: {
            requestCount: event.requestCount,
            packetCount: event.packetCount,
            duration: event.duration,
            requestRate: event.duration
              ? (event.requestCount || 0) / event.duration
              : null,
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-005",
    name: "Suspicious Destination Port",
    description: "Connection to commonly exploited or suspicious ports",
    category: "unauthorized_access",
    severity: "medium",
    scoreWeight: 15,
    evaluate(event) {
      const suspiciousPorts = new Set([
        23, 69, 135, 137, 138, 139, 445, 1433, 1521, 3306, 3389, 4444, 5900,
        6379, 27017, 6667, 6697,
      ]);

      if (
        event.destinationPort !== null &&
        suspiciousPorts.has(event.destinationPort)
      ) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: this.scoreWeight,
          evidence: `Connection to suspicious destination port ${event.destinationPort}`,
          details: {
            destinationPort: event.destinationPort,
            knownService: getPortService(event.destinationPort),
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-006",
    name: "Internal Network Lateral Movement",
    description: "Detects potential lateral movement within internal network",
    category: "unauthorized_access",
    severity: "high",
    scoreWeight: 25,
    evaluate(event) {
      const isInternalSrc = isInternalIP(event.sourceIp);
      const isInternalDst = isInternalIP(event.destinationIp);
      const adminPorts = new Set([22, 23, 3389, 5985, 5986, 445, 135]);
      const targetingAdminPort =
        event.destinationPort !== null &&
        adminPorts.has(event.destinationPort);

      if (isInternalSrc && isInternalDst && targetingAdminPort) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: this.scoreWeight,
          evidence: `Internal-to-internal traffic targeting administrative port ${event.destinationPort} — possible lateral movement`,
          details: {
            sourceIp: event.sourceIp,
            destinationIp: event.destinationIp,
            destinationPort: event.destinationPort,
            adminPortService: getPortService(event.destinationPort || 0),
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-007",
    name: "Protocol Anomaly",
    description: "Detects traffic using unexpected protocols",
    category: "anomaly",
    severity: "medium",
    scoreWeight: 15,
    evaluate(event) {
      const unusualProtocols = new Set(["IRC", "TELNET", "FTP", "TFTP"]);
      if (
        event.protocol &&
        unusualProtocols.has(event.protocol.toUpperCase())
      ) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: this.scoreWeight,
          evidence: `Use of insecure/unusual protocol: ${event.protocol}`,
          details: { protocol: event.protocol },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-008",
    name: "High Authentication Event Volume",
    description: "Unusually high number of authentication events in short time",
    category: "brute_force",
    severity: "medium",
    scoreWeight: 20,
    evaluate(event) {
      const highAuthVolume =
        event.requestCount !== null && event.requestCount > 200;
      const hasAuthFailures = event.authFailureCount > 0;

      if (highAuthVolume && hasAuthFailures) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: this.scoreWeight,
          evidence: `High authentication request volume (${event.requestCount}) with ${event.authFailureCount} failures`,
          details: {
            requestCount: event.requestCount,
            authFailureCount: event.authFailureCount,
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-009",
    name: "Zero-Duration Connection",
    description: "Connection with zero or near-zero duration indicates scanning",
    category: "port_scan",
    severity: "low",
    scoreWeight: 10,
    evaluate(event) {
      if (
        event.duration !== null &&
        event.duration < 0.001 &&
        event.packetCount !== null &&
        event.packetCount > 0
      ) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          matched: true,
          severity: this.severity,
          scoreContribution: this.scoreWeight,
          evidence: `Near-zero duration connection (${event.duration}s) suggesting probing`,
          details: {
            duration: event.duration,
            packetCount: event.packetCount,
          },
        };
      }
      return null;
    },
  },

  {
    id: "RULE-010",
    name: "Symmetric Traffic Pattern (C2 Beacon)",
    description: "Symmetric byte transfer pattern typical of C2 beaconing",
    category: "malware",
    severity: "high",
    scoreWeight: 25,
    evaluate(event) {
      if (
        event.bytesSent !== null &&
        event.bytesReceived !== null &&
        event.bytesSent > 0 &&
        event.bytesReceived > 0
      ) {
        const ratio = event.bytesSent / event.bytesReceived;
        const isSymmetric = ratio > 0.9 && ratio < 1.1;
        const regularInterval =
          event.duration !== null && event.duration > 0 && event.duration < 1;

        if (isSymmetric && regularInterval) {
          return {
            ruleId: this.id,
            ruleName: this.name,
            matched: true,
            severity: this.severity,
            scoreContribution: this.scoreWeight,
            evidence: `Symmetric byte ratio (${ratio.toFixed(3)}) with short duration — possible C2 beaconing`,
            details: { bytesSent: event.bytesSent, bytesReceived: event.bytesReceived, ratio },
          };
        }
      }
      return null;
    },
  },
];

// ─── Rule Engine ──────────────────────────────────────────────────────────────

export interface RuleEngineResult {
  matchedRules: RuleResult[];
  totalRuleScore: number;
  highestSeverity: string;
  categories: string[];
}

export function runRuleEngine(event: NormalizedEvent): RuleEngineResult {
  const matchedRules: RuleResult[] = [];
  let totalScore = 0;
  const categories = new Set<string>();

  // O(R) where R = number of rules — linear scan with early pattern matching
  for (const rule of DETECTION_RULES) {
    try {
      const result = rule.evaluate(event);
      if (result && result.matched) {
        matchedRules.push(result);
        totalScore += result.scoreContribution;
        categories.add(rule.category);
      }
    } catch (err) {
      console.error(`Rule ${rule.id} evaluation error:`, err);
    }
  }

  // Severity hierarchy using ordered mapping (DSA: comparison via ordered enumeration)
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
  const highestSeverity =
    matchedRules.reduce(
      (highest, rule) => {
        const ruleLevel =
          severityOrder[rule.severity as keyof typeof severityOrder] || 0;
        const currentLevel =
          severityOrder[highest as keyof typeof severityOrder] || 0;
        return ruleLevel > currentLevel ? rule.severity : highest;
      },
      "low" as string
    );

  return {
    matchedRules,
    totalRuleScore: Math.min(totalScore, 100), // Cap at 100
    highestSeverity,
    categories: Array.from(categories),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isInternalIP(ip: string): boolean {
  // RFC 1918 private address detection
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (ip.startsWith("127.")) return true;
  return false;
}

function getPortService(port: number): string {
  const portMap: Record<number, string> = {
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    69: "TFTP",
    80: "HTTP",
    135: "MS-RPC",
    137: "NetBIOS-NS",
    138: "NetBIOS-DGM",
    139: "NetBIOS-SSN",
    443: "HTTPS",
    445: "SMB",
    1433: "MSSQL",
    1521: "Oracle DB",
    3306: "MySQL",
    3389: "RDP",
    4444: "Metasploit",
    5900: "VNC",
    5985: "WinRM-HTTP",
    5986: "WinRM-HTTPS",
    6379: "Redis",
    6667: "IRC",
    6697: "IRC-SSL",
    27017: "MongoDB",
  };
  return portMap[port] || `Port ${port}`;
}
