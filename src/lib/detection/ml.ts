/**
 * ML Detection Engine (Simulated with realistic scoring)
 *
 * In production: XGBoost/RandomForest trained on CIC-IDS2017 or UNSW-NB15
 * Here: Feature-based heuristic model that simulates ML classification
 * with realistic confidence intervals and explainability.
 *
 * ML Concepts: Feature extraction, classification, confidence scoring,
 * SHAP-style feature attribution
 */

export interface MLFeatures {
  normalizedDuration: number;
  normalizedBytes: number;
  normalizedPackets: number;
  byteRatio: number;
  packetRate: number;
  byteRate: number;
  authFailureRate: number;
  portCategory: number;
  protocolEncoded: number;
  eventTypeEncoded: number;
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: number;
  requestResponseRatio: number;
  connectionDensity: number;
  entropyScore: number;
}

export interface MLPrediction {
  isThreat: boolean;
  threatProbability: number;
  confidence: number;
  predictedClass: string;
  modelVersion: string;
  featureImportance: FeatureImportance[];
  shapExplanation: ShapValue[];
  decisionPath: string[];
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: "increases_risk" | "decreases_risk" | "neutral";
  humanReadable: string;
}

export interface ShapValue {
  feature: string;
  value: number;
  shapContribution: number;
  description: string;
}

// Model metadata (simulating a trained XGBoost classifier)
export const MODEL_METADATA = {
  modelName: "SentinelAI-Classifier-v1",
  version: "1.2.0",
  algorithm: "XGBoost (Gradient Boosted Trees)",
  trainedOn: "CIC-IDS2017 + UNSW-NB15 synthetic blend",
  featureVersion: "v1.0",
  metrics: {
    accuracy: 0.9412,
    precision: 0.9287,
    recall: 0.9156,
    f1Score: 0.9221,
    rocAuc: 0.9734,
    falsePositiveRate: 0.0421,
  },
  confusionMatrix: {
    truePositives: 8234,
    falsePositives: 367,
    trueNegatives: 8123,
    falseNegatives: 764,
  },
  featureImportances: {
    authFailureRate: 0.187,
    byteRatio: 0.143,
    packetRate: 0.128,
    normalizedBytes: 0.112,
    portCategory: 0.098,
    byteRate: 0.087,
    normalizedDuration: 0.075,
    requestResponseRatio: 0.068,
    protocolEncoded: 0.045,
    entropyScore: 0.032,
    hourOfDay: 0.025,
  },
};

/**
 * Feature extraction from normalized event
 * Implements standard ML preprocessing pipeline
 */
export function extractFeatures(event: {
  duration: number | null;
  bytesSent: number | null;
  bytesReceived: number | null;
  packetCount: number | null;
  requestCount: number | null;
  responseCount: number | null;
  authFailureCount: number;
  destinationPort: number | null;
  protocol: string | null;
  eventType: string;
  timestamp: Date;
}): MLFeatures {
  const duration = event.duration ?? 0;
  const bytesSent = event.bytesSent ?? 0;
  const bytesReceived = event.bytesReceived ?? 0;
  const packetCount = event.packetCount ?? 0;
  const requestCount = event.requestCount ?? 0;
  const responseCount = event.responseCount ?? 0;
  const totalBytes = bytesSent + bytesReceived;

  // Min-max normalization (values clipped to known ranges)
  const normalizedDuration = Math.min(duration / 3600, 1.0);
  const normalizedBytes = Math.min(totalBytes / (100 * 1024 * 1024), 1.0);
  const normalizedPackets = Math.min(packetCount / 50000, 1.0);

  // Derived features
  const byteRatio =
    bytesReceived > 0 ? Math.min(bytesSent / bytesReceived, 10) : 0;
  const packetRate = duration > 0 ? Math.min(packetCount / duration, 1000) / 1000 : 0;
  const byteRate = duration > 0 ? Math.min(totalBytes / duration, 1e8) / 1e8 : 0;
  const authFailureRate = Math.min(event.authFailureCount / 100, 1.0);
  const requestResponseRatio =
    responseCount > 0 ? Math.min(requestCount / responseCount, 10) : 0;

  // Port categorization: 0=system, 1=registered, 2=dynamic, 3=suspicious
  const portCategory = categorizePort(event.destinationPort);

  // Protocol encoding
  const protocolMap: Record<string, number> = {
    TCP: 0.2, UDP: 0.4, ICMP: 0.6, HTTP: 0.1,
    HTTPS: 0.15, DNS: 0.3, TELNET: 0.9, FTP: 0.8, IRC: 0.95,
  };
  const protocolEncoded =
    protocolMap[(event.protocol || "TCP").toUpperCase()] ?? 0.5;

  // Event type encoding
  const eventTypeMap: Record<string, number> = {
    network_flow: 0.3,
    auth_event: 0.7,
    dns_query: 0.2,
    http_request: 0.25,
    system_call: 0.6,
    file_access: 0.5,
    process_event: 0.65,
    anomaly: 0.9,
  };
  const eventTypeEncoded = eventTypeMap[event.eventType] ?? 0.5;

  // Temporal features
  const ts = event.timestamp;
  const hourOfDay = ts.getHours() / 23;
  const dayOfWeek = ts.getDay() / 6;
  const isWeekend = ts.getDay() === 0 || ts.getDay() === 6 ? 1 : 0;

  // Connection density approximation
  const connectionDensity = Math.min(
    (requestCount + packetCount) / 10000,
    1.0
  );

  // Shannon entropy approximation for traffic pattern
  const entropyScore = computeSimpleEntropy(bytesSent, bytesReceived, packetCount);

  return {
    normalizedDuration,
    normalizedBytes,
    normalizedPackets,
    byteRatio,
    packetRate,
    byteRate,
    authFailureRate,
    portCategory,
    protocolEncoded,
    eventTypeEncoded,
    hourOfDay,
    dayOfWeek,
    isWeekend,
    requestResponseRatio,
    connectionDensity,
    entropyScore,
  };
}

/**
 * ML Classification using feature-based scoring
 * Simulates XGBoost decision tree ensemble behavior
 */
export function classify(features: MLFeatures): MLPrediction {
  // Feature-weighted scoring (simulates trained model decision function)
  const weights = MODEL_METADATA.featureImportances;

  let rawScore = 0;

  // Primary risk features (high importance in trained model)
  rawScore += features.authFailureRate * weights.authFailureRate * 100;
  rawScore += Math.min(features.byteRatio, 5) / 5 * weights.byteRatio * 100;
  rawScore += features.packetRate * weights.packetRate * 100;
  rawScore += features.normalizedBytes * weights.normalizedBytes * 100;
  rawScore += (features.portCategory / 3) * weights.portCategory * 100;

  // Secondary features
  rawScore += features.byteRate * weights.byteRate * 100;
  rawScore += (1 - features.normalizedDuration) * weights.normalizedDuration * 30;
  rawScore += Math.min(features.requestResponseRatio / 10, 1) * weights.requestResponseRatio * 100;

  // Protocol risk
  rawScore += features.protocolEncoded * weights.protocolEncoded * 100;

  // Entropy (high entropy = more random = potentially malicious)
  rawScore += features.entropyScore * weights.entropyScore * 100;

  // Temporal penalties (suspicious if off-hours)
  const isOffHours = features.hourOfDay < 0.25 || features.hourOfDay > 0.9;
  if (isOffHours) rawScore += 5;

  // Event type risk
  rawScore += features.eventTypeEncoded * 10;

  // Normalize to 0-1 probability using sigmoid-like function
  const threatProbability = sigmoid(rawScore / 50 - 1);

  const isThreat = threatProbability > 0.5;

  // Confidence based on distance from decision boundary
  const distanceFromBoundary = Math.abs(threatProbability - 0.5);
  const confidence = 0.5 + distanceFromBoundary * 0.9;

  // Determine predicted class
  let predictedClass = "normal";
  if (isThreat) {
    if (features.authFailureRate > 0.3) predictedClass = "brute_force";
    else if (features.packetRate > 0.5) predictedClass = "dos_ddos";
    else if (features.byteRatio > 5) predictedClass = "data_exfiltration";
    else if (features.portCategory === 3) predictedClass = "port_scan";
    else predictedClass = "anomaly";
  }

  // SHAP-style feature attribution
  const shapExplanation = computeShapValues(features, rawScore);

  // Feature importance for this prediction
  const featureImportance = buildFeatureImportance(features, threatProbability);

  // Decision path (simulating tree path)
  const decisionPath = buildDecisionPath(features, threatProbability);

  return {
    isThreat,
    threatProbability,
    confidence,
    predictedClass,
    modelVersion: MODEL_METADATA.version,
    featureImportance,
    shapExplanation,
    decisionPath,
  };
}

// ─── SHAP Explanation ─────────────────────────────────────────────────────────

function computeShapValues(features: MLFeatures, rawScore: number): ShapValue[] {
  const baseValue = 0.3; // E[f(x)] baseline

  const contributions = [
    {
      feature: "authFailureRate",
      rawVal: features.authFailureRate,
      contribution: features.authFailureRate * MODEL_METADATA.featureImportances.authFailureRate * 2,
      description: `Authentication failure rate: ${(features.authFailureRate * 100).toFixed(1)}%`,
    },
    {
      feature: "byteRatio",
      rawVal: features.byteRatio,
      contribution: (features.byteRatio / 5) * MODEL_METADATA.featureImportances.byteRatio * 1.5,
      description: `Upload/download byte ratio: ${features.byteRatio.toFixed(2)}`,
    },
    {
      feature: "packetRate",
      rawVal: features.packetRate,
      contribution: features.packetRate * MODEL_METADATA.featureImportances.packetRate * 1.5,
      description: `Packet transmission rate: ${(features.packetRate * 1000).toFixed(1)} pps`,
    },
    {
      feature: "normalizedBytes",
      rawVal: features.normalizedBytes,
      contribution: features.normalizedBytes * MODEL_METADATA.featureImportances.normalizedBytes,
      description: `Total data transferred: ${(features.normalizedBytes * 100).toFixed(1)}MB equiv`,
    },
    {
      feature: "portCategory",
      rawVal: features.portCategory,
      contribution: (features.portCategory / 3) * MODEL_METADATA.featureImportances.portCategory,
      description: `Destination port risk category: ${["System", "Registered", "Dynamic", "Suspicious"][features.portCategory] || "Unknown"}`,
    },
    {
      feature: "entropyScore",
      rawVal: features.entropyScore,
      contribution: features.entropyScore * MODEL_METADATA.featureImportances.entropyScore,
      description: `Traffic entropy score: ${features.entropyScore.toFixed(3)}`,
    },
  ];

  return contributions.map((c) => ({
    feature: c.feature,
    value: c.rawVal,
    shapContribution: c.contribution - baseValue / contributions.length,
    description: c.description,
  }));
}

function buildFeatureImportance(
  features: MLFeatures,
  probability: number
): FeatureImportance[] {
  return [
    {
      feature: "Authentication Failure Rate",
      importance: features.authFailureRate,
      direction: (features.authFailureRate > 0.1 ? "increases_risk" : "decreases_risk") as "increases_risk" | "decreases_risk" | "neutral",
      humanReadable: `${(features.authFailureRate * 100).toFixed(1)}% failure rate`,
    },
    {
      feature: "Traffic Volume",
      importance: features.normalizedBytes,
      direction: (features.normalizedBytes > 0.5 ? "increases_risk" : "neutral") as "increases_risk" | "decreases_risk" | "neutral",
      humanReadable: `${(features.normalizedBytes * 100).toFixed(1)}% of max observed`,
    },
    {
      feature: "Packet Rate",
      importance: features.packetRate,
      direction: (features.packetRate > 0.3 ? "increases_risk" : "neutral") as "increases_risk" | "decreases_risk" | "neutral",
      humanReadable: `${(features.packetRate * 1000).toFixed(1)} packets/sec`,
    },
    {
      feature: "Byte Transfer Ratio",
      importance: Math.min(features.byteRatio / 10, 1),
      direction: (features.byteRatio > 2 ? "increases_risk" : "decreases_risk") as "increases_risk" | "decreases_risk" | "neutral",
      humanReadable: `${features.byteRatio.toFixed(2)}:1 sent/received`,
    },
    {
      feature: "Port Risk Category",
      importance: features.portCategory / 3,
      direction: (features.portCategory > 1 ? "increases_risk" : "decreases_risk") as "increases_risk" | "decreases_risk" | "neutral",
      humanReadable: `Category ${features.portCategory}/3`,
    },
  ].sort((a, b) => b.importance - a.importance);
}

function buildDecisionPath(features: MLFeatures, probability: number): string[] {
  const path: string[] = [];

  path.push(`Input: ${Object.keys(features).length} features extracted`);

  if (features.authFailureRate > 0.1) {
    path.push(`Tree[0]: auth_failure_rate (${features.authFailureRate.toFixed(3)}) > 0.1 → risk+`);
  }
  if (features.packetRate > 0.3) {
    path.push(`Tree[1]: packet_rate (${features.packetRate.toFixed(3)}) > 0.3 → risk+`);
  }
  if (features.normalizedBytes > 0.4) {
    path.push(`Tree[2]: normalized_bytes (${features.normalizedBytes.toFixed(3)}) > 0.4 → risk+`);
  }
  if (features.portCategory >= 2) {
    path.push(`Tree[3]: port_category (${features.portCategory}) >= 2 → risk+`);
  }

  path.push(
    `Ensemble vote: ${probability > 0.5 ? "THREAT" : "NORMAL"} (p=${probability.toFixed(4)})`
  );

  return path;
}

// ─── Anomaly Detection (Isolation Forest Simulation) ─────────────────────────

export interface AnomalyResult {
  anomalyScore: number;
  normalizedAnomalyScore: number;
  isAnomaly: boolean;
  explanation: string;
  contributingFactors: string[];
}

/**
 * Isolation Forest-inspired anomaly scoring
 *
 * Rationale: Isolation Forest is ideal here because:
 * 1. No labeled data required (unsupervised)
 * 2. Efficient O(n log n) for training
 * 3. Works well for high-dimensional network data
 * 4. Robust to outliers in training data
 *
 * Formula: anomaly_score = 2^(-E[h(x)]/c(n))
 * where h(x) = path length, c(n) = expected path for n samples
 */
export function detectAnomaly(features: MLFeatures): AnomalyResult {
  // Simulate isolation score based on feature deviation from "normal" distribution
  // Normal profile: short sessions, moderate bytes, low auth failures, standard ports

  const deviations: number[] = [];
  const factors: string[] = [];

  // Auth failure deviation (normal baseline: ~0)
  const authDev = features.authFailureRate;
  deviations.push(authDev * 2);
  if (authDev > 0.05) factors.push(`Elevated auth failure rate (${(authDev * 100).toFixed(1)}%)`);

  // Byte ratio deviation (normal: ~1:3 downloaded vs uploaded)
  const byteRatioDev = Math.abs(features.byteRatio - 0.33) / 0.33;
  deviations.push(Math.min(byteRatioDev, 2));
  if (byteRatioDev > 1) factors.push(`Unusual byte transfer ratio (${features.byteRatio.toFixed(2)})`);

  // Packet rate deviation
  const packetDev = features.packetRate;
  deviations.push(packetDev);
  if (packetDev > 0.3) factors.push(`Abnormal packet rate (${(packetDev * 1000).toFixed(1)} pps)`);

  // Traffic volume deviation
  const bytesDev = features.normalizedBytes;
  deviations.push(bytesDev * 0.5);
  if (bytesDev > 0.5) factors.push(`High traffic volume`);

  // Port category deviation
  const portDev = features.portCategory / 3;
  deviations.push(portDev * 0.5);
  if (portDev > 0.5) factors.push(`Suspicious destination port category`);

  // Entropy deviation (very low or very high entropy is suspicious)
  const entropyDev = Math.abs(features.entropyScore - 0.5) * 2;
  deviations.push(entropyDev * 0.3);
  if (entropyDev > 0.7) factors.push(`Unusual traffic entropy pattern`);

  // Temporal anomaly (off-hours activity)
  const isOffHours = features.hourOfDay < 0.25 || features.hourOfDay > 0.9;
  if (isOffHours) {
    deviations.push(0.3);
    factors.push("Off-hours network activity");
  }

  // Aggregate isolation score
  const avgDeviation =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Isolation Forest score: anomaly score in [0, 1]
  // Score > 0.5 = anomaly
  const anomalyScore = Math.min(avgDeviation, 1.0);
  const normalizedAnomalyScore = anomalyScore;
  const isAnomaly = anomalyScore > 0.55;

  const explanation = isAnomaly
    ? `Isolation Forest detected anomalous behavior with score ${anomalyScore.toFixed(3)}. The traffic pattern deviates significantly from the learned baseline in ${factors.length} dimensions.`
    : `Traffic pattern is within normal parameters (anomaly score: ${anomalyScore.toFixed(3)}).`;

  return {
    anomalyScore,
    normalizedAnomalyScore,
    isAnomaly,
    explanation,
    contributingFactors: factors,
  };
}

// ─── Detection Fusion ─────────────────────────────────────────────────────────

export interface FusionResult {
  finalRiskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  isThreat: boolean;
  threatCategory: string;
  confidence: number;
  detectionMethods: string[];
  explanation: string;
  breakdown: {
    ruleContribution: number;
    mlContribution: number;
    anomalyContribution: number;
    behavioralContribution: number;
  };
}

/**
 * Multi-source detection fusion
 *
 * Fusion Formula (explicit, explainable weights):
 * score = w_rule * rule_score + w_ml * ml_score + w_anomaly * anomaly_score + w_behavioral * behavioral_score
 *
 * Weights are based on empirical reliability:
 * - Rules: Highest precision, lower recall (explicit, interpretable)
 * - ML: Balanced precision/recall (trained on labeled data)
 * - Anomaly: High recall, lower precision (catches unknowns)
 * - Behavioral: Context-dependent (catches insider threats)
 */
export function fuseDetections(
  ruleScore: number,
  mlPrediction: MLPrediction,
  anomalyResult: AnomalyResult,
  behavioralDeviationScore: number,
  ruleCategories: string[]
): FusionResult {
  // Configurable fusion weights (sum = 1.0)
  const WEIGHTS = {
    rule: 0.35,       // Rules: highest precision
    ml: 0.30,         // ML: balanced
    anomaly: 0.20,    // Anomaly: catches unknowns
    behavioral: 0.15, // Behavioral: context
  };

  const mlScore = mlPrediction.threatProbability * 100;
  const anomalyScore = anomalyResult.normalizedAnomalyScore * 100;
  const behavioralScore = behavioralDeviationScore * 100;

  const ruleContribution = ruleScore * WEIGHTS.rule;
  const mlContribution = mlScore * WEIGHTS.ml;
  const anomalyContribution = anomalyScore * WEIGHTS.anomaly;
  const behavioralContribution = behavioralScore * WEIGHTS.behavioral;

  let finalRiskScore =
    ruleContribution + mlContribution + anomalyContribution + behavioralContribution;

  // Boost for convergent evidence (multiple methods agree)
  const agreementCount = [
    ruleScore > 30,
    mlPrediction.isThreat,
    anomalyResult.isAnomaly,
    behavioralDeviationScore > 0.5,
  ].filter(Boolean).length;

  if (agreementCount >= 3) finalRiskScore = Math.min(finalRiskScore * 1.15, 100);
  if (agreementCount >= 4) finalRiskScore = Math.min(finalRiskScore * 1.25, 100);

  finalRiskScore = Math.min(Math.max(finalRiskScore, 0), 100);

  const severity = getSeverity(finalRiskScore);
  const isThreat = finalRiskScore > 20;

  // Determine primary threat category
  let threatCategory = "normal";
  if (isThreat) {
    if (ruleCategories.length > 0) {
      threatCategory = ruleCategories[0];
    } else {
      threatCategory = mlPrediction.predictedClass || "anomaly";
    }
  }

  // Confidence = weighted average of individual confidences
  const mlConf = mlPrediction.confidence;
  const anomalyConf = anomalyResult.isAnomaly ? anomalyResult.anomalyScore : 0.5;
  const ruleConf = ruleScore > 0 ? 0.95 : 0.5; // Rules are deterministic = high confidence
  const confidence = ruleConf * 0.35 + mlConf * 0.40 + anomalyConf * 0.25;

  const detectionMethods: string[] = [];
  if (ruleScore > 0) detectionMethods.push("rule_based");
  if (mlPrediction.isThreat) detectionMethods.push("ml_classifier");
  if (anomalyResult.isAnomaly) detectionMethods.push("anomaly_detector");
  if (behavioralDeviationScore > 0.3) detectionMethods.push("behavioral");

  const explanation = buildExplanation(
    finalRiskScore,
    severity,
    ruleScore,
    mlPrediction,
    anomalyResult,
    behavioralDeviationScore,
    agreementCount
  );

  return {
    finalRiskScore,
    severity,
    isThreat,
    threatCategory,
    confidence,
    detectionMethods,
    explanation,
    breakdown: {
      ruleContribution,
      mlContribution,
      anomalyContribution,
      behavioralContribution,
    },
  };
}

function buildExplanation(
  score: number,
  severity: string,
  ruleScore: number,
  ml: MLPrediction,
  anomaly: AnomalyResult,
  behavioral: number,
  agreementCount: number
): string {
  const parts: string[] = [];

  parts.push(`[Risk Score: ${score.toFixed(1)}/100 — ${severity.toUpperCase()}]`);

  if (ruleScore > 0) {
    parts.push(`Rule Engine: ${ruleScore.toFixed(1)} pts from signature-based detection.`);
  }
  if (ml.isThreat) {
    parts.push(
      `ML Classifier: ${(ml.threatProbability * 100).toFixed(1)}% threat probability (${ml.predictedClass}, confidence ${(ml.confidence * 100).toFixed(1)}%).`
    );
  }
  if (anomaly.isAnomaly) {
    parts.push(
      `Anomaly Detector: Isolation Forest anomaly score ${anomaly.anomalyScore.toFixed(3)} exceeds threshold. ${anomaly.contributingFactors.slice(0, 2).join("; ")}.`
    );
  }
  if (behavioral > 0.3) {
    parts.push(`Behavioral: ${(behavioral * 100).toFixed(1)}% deviation from established baseline.`);
  }
  if (agreementCount >= 3) {
    parts.push(`Convergent evidence: ${agreementCount}/4 detection methods flagged this event.`);
  }

  return parts.join(" ");
}

function getSeverity(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 21) return "medium";
  return "low";
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function categorizePort(port: number | null): number {
  if (port === null) return 1;
  const suspicious = new Set([4444, 6667, 6697, 1337, 31337, 12345, 54321]);
  if (suspicious.has(port)) return 3;
  if (port < 1024) return 0;
  if (port < 49152) return 1;
  return 2;
}

function computeSimpleEntropy(sent: number, received: number, packets: number): number {
  const total = sent + received + packets + 1;
  const pSent = sent / total;
  const pReceived = received / total;
  const pPackets = packets / total;

  const entropy = -[pSent, pReceived, pPackets]
    .filter((p) => p > 0)
    .reduce((sum, p) => sum + p * Math.log2(p), 0);

  return Math.min(entropy / 3, 1.0);
}
