/**
 * Security Event Simulator
 *
 * Generates realistic synthetic security events WITHOUT performing any real attacks.
 * Uses statistical distributions to model normal and attack traffic patterns.
 *
 * CS Concepts: Stochastic simulation, Markov chain state transitions,
 * statistical distributions (Gaussian, Poisson, Pareto)
 */

export type EventScenario =
  | "normal"
  | "brute_force"
  | "port_scan"
  | "dos_ddos"
  | "data_exfiltration"
  | "lateral_movement"
  | "malware_c2"
  | "insider_threat"
  | "mixed";

export interface SimulatedEvent {
  timestamp: Date;
  sourceIp: string;
  destinationIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  duration: number;
  packetCount: number;
  bytesSent: number;
  bytesReceived: number;
  requestCount: number;
  responseCount: number;
  authFailureCount: number;
  eventType: string;
  flags: string;
  userId: string | null;
  metadata: Record<string, unknown>;
  scenario: string;
}

// ─── IP Pools ─────────────────────────────────────────────────────────────────

const INTERNAL_IPS = [
  "192.168.1.10", "192.168.1.15", "192.168.1.20", "192.168.1.25",
  "10.0.0.5", "10.0.0.10", "10.0.0.15", "10.0.0.20",
  "172.16.0.5", "172.16.0.10",
];

const EXTERNAL_IPS = [
  "203.0.113.10", "198.51.100.25", "192.0.2.50", "45.33.32.156",
  "104.21.45.67", "172.67.68.90", "185.220.101.25", "91.108.4.1",
  "162.55.0.1", "94.102.61.1",
];

const USER_IDS = [
  "alice@corp.com", "bob@corp.com", "charlie@corp.com",
  "david@corp.com", "eve@corp.com", null, null,
];

// ─── Protocol Definitions ────────────────────────────────────────────────────

const PROTOCOLS = {
  normal: [
    { proto: "TCP", weight: 0.5 },
    { proto: "UDP", weight: 0.2 },
    { proto: "HTTPS", weight: 0.2 },
    { proto: "DNS", weight: 0.1 },
  ],
  attack: [
    { proto: "TCP", weight: 0.6 },
    { proto: "UDP", weight: 0.2 },
    { proto: "ICMP", weight: 0.1 },
    { proto: "TELNET", weight: 0.05 },
    { proto: "IRC", weight: 0.05 },
  ],
};

const COMMON_PORTS = [80, 443, 53, 8080, 8443, 22, 25, 110, 143, 993, 995];
const SUSPICIOUS_PORTS = [23, 135, 139, 445, 1433, 3389, 4444, 5900, 6379, 27017];

// ─── Scenario Generators ─────────────────────────────────────────────────────

function generateNormalEvent(): Partial<SimulatedEvent> {
  return {
    sourceIp: randomChoice(INTERNAL_IPS),
    destinationIp: Math.random() > 0.3 ? randomChoice(EXTERNAL_IPS) : randomChoice(INTERNAL_IPS),
    sourcePort: randomInt(1024, 65535),
    destinationPort: randomChoice(COMMON_PORTS),
    protocol: weightedChoice(PROTOCOLS.normal),
    duration: gaussianRandom(2.5, 1.5, 0.01, 30),
    packetCount: Math.round(gaussianRandom(50, 30, 2, 500)),
    bytesSent: Math.round(gaussianRandom(5000, 3000, 100, 50000)),
    bytesReceived: Math.round(gaussianRandom(15000, 8000, 500, 100000)),
    requestCount: Math.round(gaussianRandom(10, 8, 1, 80)),
    responseCount: Math.round(gaussianRandom(10, 8, 1, 80)),
    authFailureCount: Math.random() > 0.95 ? randomInt(1, 2) : 0,
    eventType: randomChoice(["network_flow", "http_request", "dns_query"]),
    flags: "ACK",
    userId: randomChoice(USER_IDS),
    scenario: "normal",
  };
}

function generateBruteForceEvent(): Partial<SimulatedEvent> {
  const attacker = randomChoice(EXTERNAL_IPS);
  const target = randomChoice(INTERNAL_IPS);
  return {
    sourceIp: attacker,
    destinationIp: target,
    sourcePort: randomInt(1024, 65535),
    destinationPort: randomChoice([22, 23, 3389, 21, 445]),
    protocol: "TCP",
    duration: gaussianRandom(0.1, 0.05, 0.001, 0.5),
    packetCount: randomInt(5, 20),
    bytesSent: randomInt(200, 1500),
    bytesReceived: randomInt(100, 500),
    requestCount: randomInt(1, 5),
    responseCount: randomInt(0, 3),
    authFailureCount: randomInt(5, 50),
    eventType: "auth_event",
    flags: "SYN,ACK",
    userId: null,
    scenario: "brute_force",
  };
}

function generatePortScanEvent(): Partial<SimulatedEvent> {
  const attacker = randomChoice(EXTERNAL_IPS);
  const target = randomChoice(INTERNAL_IPS);
  return {
    sourceIp: attacker,
    destinationIp: target,
    sourcePort: randomInt(1024, 65535),
    destinationPort: randomInt(1, 65535),
    protocol: "TCP",
    duration: gaussianRandom(0.001, 0.001, 0.0001, 0.01),
    packetCount: randomInt(1, 3),
    bytesSent: randomInt(40, 100),
    bytesReceived: Math.random() > 0.5 ? randomInt(0, 60) : 0,
    requestCount: 1,
    responseCount: Math.random() > 0.5 ? 1 : 0,
    authFailureCount: 0,
    eventType: "network_flow",
    flags: "SYN",
    userId: null,
    scenario: "port_scan",
  };
}

function generateDDoSEvent(): Partial<SimulatedEvent> {
  const attacker = randomChoice(EXTERNAL_IPS);
  const target = randomChoice(INTERNAL_IPS);
  return {
    sourceIp: attacker,
    destinationIp: target,
    sourcePort: randomInt(1024, 65535),
    destinationPort: randomChoice([80, 443, 53]),
    protocol: randomChoice(["TCP", "UDP", "ICMP"]),
    duration: gaussianRandom(0.5, 0.3, 0.1, 5),
    packetCount: randomInt(5000, 50000),
    bytesSent: randomInt(500000, 5000000),
    bytesReceived: randomInt(100, 1000),
    requestCount: randomInt(500, 10000),
    responseCount: randomInt(0, 50),
    authFailureCount: 0,
    eventType: "network_flow",
    flags: "SYN",
    userId: null,
    scenario: "dos_ddos",
  };
}

function generateExfiltrationEvent(): Partial<SimulatedEvent> {
  const insider = randomChoice(INTERNAL_IPS);
  const external = randomChoice(EXTERNAL_IPS);
  return {
    sourceIp: insider,
    destinationIp: external,
    sourcePort: randomInt(1024, 65535),
    destinationPort: randomChoice([443, 8443, 21, 22, 80]),
    protocol: randomChoice(["TCP", "HTTPS"]),
    duration: gaussianRandom(120, 60, 10, 600),
    packetCount: randomInt(500, 5000),
    bytesSent: randomInt(50000000, 500000000), // 50MB-500MB
    bytesReceived: randomInt(1000, 10000),
    requestCount: randomInt(10, 100),
    responseCount: randomInt(5, 50),
    authFailureCount: 0,
    eventType: "network_flow",
    flags: "ACK,PSH",
    userId: randomChoice(USER_IDS.filter(Boolean)),
    scenario: "data_exfiltration",
  };
}

function generateLateralMovementEvent(): Partial<SimulatedEvent> {
  const source = randomChoice(INTERNAL_IPS);
  const target = randomChoice(INTERNAL_IPS.filter((ip) => ip !== source));
  return {
    sourceIp: source,
    destinationIp: target,
    sourcePort: randomInt(1024, 65535),
    destinationPort: randomChoice([22, 445, 135, 3389, 5985]),
    protocol: "TCP",
    duration: gaussianRandom(5, 3, 0.5, 30),
    packetCount: randomInt(50, 500),
    bytesSent: randomInt(5000, 100000),
    bytesReceived: randomInt(5000, 100000),
    requestCount: randomInt(10, 100),
    responseCount: randomInt(8, 100),
    authFailureCount: randomInt(0, 3),
    eventType: "auth_event",
    flags: "ACK",
    userId: randomChoice(USER_IDS),
    scenario: "lateral_movement",
  };
}

function generateMalwareC2Event(): Partial<SimulatedEvent> {
  const infected = randomChoice(INTERNAL_IPS);
  const c2Server = randomChoice(EXTERNAL_IPS);
  const beaconSize = randomInt(200, 2000);
  return {
    sourceIp: infected,
    destinationIp: c2Server,
    sourcePort: randomInt(1024, 65535),
    destinationPort: randomChoice([80, 443, 8080, 6667]),
    protocol: randomChoice(["TCP", "HTTPS"]),
    duration: gaussianRandom(0.5, 0.1, 0.3, 0.8),
    packetCount: randomInt(5, 20),
    bytesSent: beaconSize,
    bytesReceived: beaconSize + randomInt(-50, 50),
    requestCount: 1,
    responseCount: 1,
    authFailureCount: 0,
    eventType: "network_flow",
    flags: "ACK,PSH",
    userId: null,
    scenario: "malware_c2",
  };
}

// ─── Main Simulator ───────────────────────────────────────────────────────────

export function generateEvent(scenario: EventScenario = "mixed"): SimulatedEvent {
  let eventData: Partial<SimulatedEvent>;

  if (scenario === "mixed") {
    // Realistic distribution: 70% normal, 30% attack types
    const roll = Math.random();
    if (roll < 0.70) {
      eventData = generateNormalEvent();
    } else if (roll < 0.80) {
      eventData = generateBruteForceEvent();
    } else if (roll < 0.87) {
      eventData = generatePortScanEvent();
    } else if (roll < 0.92) {
      eventData = generateDDoSEvent();
    } else if (roll < 0.95) {
      eventData = generateExfiltrationEvent();
    } else if (roll < 0.97) {
      eventData = generateLateralMovementEvent();
    } else {
      eventData = generateMalwareC2Event();
    }
  } else {
    const generators: Record<EventScenario, () => Partial<SimulatedEvent>> = {
      normal: generateNormalEvent,
      brute_force: generateBruteForceEvent,
      port_scan: generatePortScanEvent,
      dos_ddos: generateDDoSEvent,
      data_exfiltration: generateExfiltrationEvent,
      lateral_movement: generateLateralMovementEvent,
      malware_c2: generateMalwareC2Event,
      insider_threat: generateExfiltrationEvent,
      mixed: generateNormalEvent,
    };
    eventData = (generators[scenario] || generateNormalEvent)();
  }

  return {
    timestamp: new Date(),
    metadata: {
      simulator: "SentinelAI-v1",
      generatedAt: new Date().toISOString(),
    },
    ...eventData,
  } as SimulatedEvent;
}

export function generateBatch(
  count: number,
  scenario: EventScenario = "mixed"
): SimulatedEvent[] {
  return Array.from({ length: count }, () => generateEvent(scenario));
}

// ─── Statistical Helpers ─────────────────────────────────────────────────────

function gaussianRandom(mean: number, std: number, min: number, max: number): number {
  // Box-Muller transform for Gaussian distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.min(Math.max(z * std + mean, min), max);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedChoice(options: { proto: string; weight: number }[]): string {
  const rand = Math.random();
  let cumulative = 0;
  for (const opt of options) {
    cumulative += opt.weight;
    if (rand <= cumulative) return opt.proto;
  }
  return options[options.length - 1].proto;
}
