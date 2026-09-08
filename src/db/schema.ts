import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uuid,
  varchar,
  index,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["admin", "analyst", "viewer"]);
export const severityEnum = pgEnum("severity", [
  "low",
  "medium",
  "high",
  "critical",
]);
export const alertStatusEnum = pgEnum("alert_status", [
  "new",
  "investigating",
  "confirmed",
  "false_positive",
  "resolved",
]);
export const incidentStatusEnum = pgEnum("incident_status", [
  "open",
  "investigating",
  "contained",
  "resolved",
  "closed",
]);
export const eventTypeEnum = pgEnum("event_type", [
  "network_flow",
  "auth_event",
  "dns_query",
  "http_request",
  "system_call",
  "file_access",
  "process_event",
  "anomaly",
]);
export const detectionMethodEnum = pgEnum("detection_method", [
  "rule_based",
  "ml_classifier",
  "anomaly_detector",
  "behavioral",
  "fusion",
]);
export const threatCategoryEnum = pgEnum("threat_category", [
  "brute_force",
  "dos_ddos",
  "port_scan",
  "data_exfiltration",
  "malware",
  "insider_threat",
  "unauthorized_access",
  "anomaly",
  "normal",
]);

// ─── Users & Auth ─────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 64 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
}, (t) => [
  unique("users_email_unique").on(t.email),
  unique("users_username_unique").on(t.username),
  index("idx_users_email").on(t.email),
  index("idx_users_role").on(t.role),
]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => [
  unique("sessions_token_unique").on(t.token),
  index("idx_sessions_token").on(t.token),
  index("idx_sessions_user_id").on(t.userId),
]);

// ─── Network Events ───────────────────────────────────────────────────────────

export const networkEvents = pgTable("network_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  sourceIp: varchar("source_ip", { length: 64 }).notNull(),
  destinationIp: varchar("destination_ip", { length: 64 }).notNull(),
  sourcePort: integer("source_port"),
  destinationPort: integer("destination_port"),
  protocol: varchar("protocol", { length: 16 }),
  duration: real("duration"),
  packetCount: integer("packet_count"),
  bytesSent: integer("bytes_sent"),
  bytesReceived: integer("bytes_received"),
  requestCount: integer("request_count"),
  responseCount: integer("response_count"),
  authFailureCount: integer("auth_failure_count").notNull().default(0),
  eventType: eventTypeEnum("event_type").notNull().default("network_flow"),
  flags: varchar("flags", { length: 32 }),
  userId: text("user_id"),
  processName: text("process_name"),
  filePath: text("file_path"),
  commandLine: text("command_line"),
  metadata: jsonb("metadata"),
  rawData: jsonb("raw_data"),
  isProcessed: boolean("is_processed").notNull().default(false),
  processingError: text("processing_error"),
  ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
  source: varchar("source", { length: 64 }).notNull().default("api"),
  sessionId: text("session_id"),
}, (t) => [
  index("idx_events_timestamp").on(t.timestamp),
  index("idx_events_source_ip").on(t.sourceIp),
  index("idx_events_dest_ip").on(t.destinationIp),
  index("idx_events_type").on(t.eventType),
  index("idx_events_processed").on(t.isProcessed),
]);

// ─── Event Features ───────────────────────────────────────────────────────────

export const eventFeatures = pgTable("event_features", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => networkEvents.id, { onDelete: "cascade" }),
  normalizedDuration: real("normalized_duration"),
  normalizedBytes: real("normalized_bytes"),
  normalizedPackets: real("normalized_packets"),
  byteRatio: real("byte_ratio"),
  packetRate: real("packet_rate"),
  byteRate: real("byte_rate"),
  authFailureRate: real("auth_failure_rate"),
  portCategory: integer("port_category"),
  protocolEncoded: integer("protocol_encoded"),
  eventTypeEncoded: integer("event_type_encoded"),
  hourOfDay: integer("hour_of_day"),
  dayOfWeek: integer("day_of_week"),
  isWeekend: boolean("is_weekend"),
  requestResponseRatio: real("request_response_ratio"),
  connectionDensity: real("connection_density"),
  entropyScore: real("entropy_score"),
  featureVector: jsonb("feature_vector"),
  pipelineVersion: varchar("pipeline_version", { length: 16 }).notNull().default("v1.0"),
  extractedAt: timestamp("extracted_at").notNull().defaultNow(),
}, (t) => [
  index("idx_features_event_id").on(t.eventId),
  index("idx_features_pipeline_version").on(t.pipelineVersion),
]);

// ─── Detection Results ────────────────────────────────────────────────────────

export const detections = pgTable("detections", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => networkEvents.id, { onDelete: "cascade" }),
  ruleScore: real("rule_score").notNull().default(0),
  mlScore: real("ml_score").notNull().default(0),
  mlConfidence: real("ml_confidence").notNull().default(0),
  anomalyScore: real("anomaly_score").notNull().default(0),
  normalizedAnomalyScore: real("normalized_anomaly_score").notNull().default(0),
  behavioralDeviationScore: real("behavioral_deviation_score").notNull().default(0),
  finalRiskScore: real("final_risk_score").notNull().default(0),
  severity: severityEnum("severity").notNull().default("low"),
  threatCategory: threatCategoryEnum("threat_category").notNull().default("normal"),
  isThreat: boolean("is_threat").notNull().default(false),
  confidence: real("confidence").notNull().default(0),
  detectionMethods: jsonb("detection_methods"),
  matchedRules: jsonb("matched_rules"),
  explanation: text("explanation"),
  mlExplanation: jsonb("ml_explanation"),
  ruleEvidence: jsonb("rule_evidence"),
  behavioralEvidence: jsonb("behavioral_evidence"),
  modelVersion: varchar("model_version", { length: 32 }),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
}, (t) => [
  index("idx_detections_event_id").on(t.eventId),
  index("idx_detections_severity").on(t.severity),
  index("idx_detections_risk_score").on(t.finalRiskScore),
  index("idx_detections_detected_at").on(t.detectedAt),
  index("idx_detections_is_threat").on(t.isThreat),
]);

// ─── Detection Rules ──────────────────────────────────────────────────────────

export const detectionRules = pgTable("detection_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: threatCategoryEnum("category").notNull(),
  severity: severityEnum("severity").notNull(),
  scoreWeight: real("score_weight").notNull().default(10),
  conditions: jsonb("conditions").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  truePositiveCount: integer("true_positive_count").notNull().default(0),
  falsePositiveCount: integer("false_positive_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => [
  index("idx_rules_category").on(t.category),
  index("idx_rules_enabled").on(t.isEnabled),
]);

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  detectionId: uuid("detection_id").notNull().references(() => detections.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().references(() => networkEvents.id),
  incidentId: uuid("incident_id"),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  severity: severityEnum("severity").notNull(),
  riskScore: real("risk_score").notNull(),
  category: threatCategoryEnum("category").notNull(),
  sourceIp: varchar("source_ip", { length: 64 }),
  destinationIp: varchar("destination_ip", { length: 64 }),
  detectionMethods: jsonb("detection_methods"),
  confidence: real("confidence").notNull().default(0),
  explanation: text("explanation"),
  status: alertStatusEnum("status").notNull().default("new"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolutionNote: text("resolution_note"),
  isSuppressed: boolean("is_suppressed").notNull().default(false),
  suppressionReason: text("suppression_reason"),
  relatedEventIds: jsonb("related_event_ids"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("idx_alerts_severity").on(t.severity),
  index("idx_alerts_status").on(t.status),
  index("idx_alerts_created_at").on(t.createdAt),
  index("idx_alerts_risk_score").on(t.riskScore),
  index("idx_alerts_incident_id").on(t.incidentId),
  index("idx_alerts_source_ip").on(t.sourceIp),
]);

// ─── Incidents ────────────────────────────────────────────────────────────────

export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  severity: severityEnum("severity").notNull(),
  status: incidentStatusEnum("status").notNull().default("open"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  alertIds: jsonb("alert_ids"),
  affectedAssets: jsonb("affected_assets"),
  attackVectors: jsonb("attack_vectors"),
  timeline: jsonb("timeline"),
  containmentActions: text("containment_actions"),
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  lessonsLearned: text("lessons_learned"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => [
  index("idx_incidents_severity").on(t.severity),
  index("idx_incidents_status").on(t.status),
  index("idx_incidents_created_at").on(t.createdAt),
  index("idx_incidents_assigned_to").on(t.assignedTo),
]);

export const incidentNotes = pgTable("incident_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull().references(() => incidents.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  noteType: varchar("note_type", { length: 32 }).notNull().default("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("idx_notes_incident_id").on(t.incidentId),
]);

// ─── Threat Intelligence ──────────────────────────────────────────────────────

export const threatIndicators = pgTable("threat_indicators", {
  id: uuid("id").primaryKey().defaultRandom(),
  indicatorType: varchar("indicator_type", { length: 32 }).notNull(),
  indicatorValue: text("indicator_value").notNull(),
  threatLevel: severityEnum("threat_level").notNull().default("medium"),
  confidence: real("confidence").notNull().default(0.5),
  source: varchar("source", { length: 64 }).notNull().default("local"),
  description: text("description"),
  tags: jsonb("tags"),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  rawData: jsonb("raw_data"),
}, (t) => [
  index("idx_indicators_type").on(t.indicatorType),
  index("idx_indicators_value").on(t.indicatorValue),
  index("idx_indicators_active").on(t.isActive),
]);

// ─── ML Model Versions ────────────────────────────────────────────────────────

export const modelVersions = pgTable("model_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelName: varchar("model_name", { length: 64 }).notNull(),
  version: varchar("version", { length: 16 }).notNull(),
  algorithm: varchar("algorithm", { length: 64 }).notNull(),
  description: text("description"),
  datasetVersion: varchar("dataset_version", { length: 32 }),
  featureVersion: varchar("feature_version", { length: 16 }).notNull().default("v1.0"),
  accuracy: real("accuracy"),
  precision: real("precision"),
  recall: real("recall"),
  f1Score: real("f1_score"),
  rocAuc: real("roc_auc"),
  falsePositiveRate: real("false_positive_rate"),
  confusionMatrix: jsonb("confusion_matrix"),
  featureImportance: jsonb("feature_importance"),
  hyperparameters: jsonb("hyperparameters"),
  trainingSamples: integer("training_samples"),
  testSamples: integer("test_samples"),
  isActive: boolean("is_active").notNull().default(false),
  trainedAt: timestamp("trained_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_models_name").on(t.modelName),
  index("idx_models_active").on(t.isActive),
]);

// ─── Behavioral Baselines ─────────────────────────────────────────────────────

export const behavioralBaselines = pgTable("behavioral_baselines", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: varchar("entity_id", { length: 128 }).notNull(),
  metricName: varchar("metric_name", { length: 64 }).notNull(),
  meanValue: real("mean_value").notNull(),
  stdDeviation: real("std_deviation").notNull().default(0),
  minValue: real("min_value"),
  maxValue: real("max_value"),
  sampleCount: integer("sample_count").notNull().default(0),
  windowHours: integer("window_hours").notNull().default(24),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
  validUntil: timestamp("valid_until"),
}, (t) => [
  index("idx_baselines_entity").on(t.entityType, t.entityId),
  index("idx_baselines_metric").on(t.metricName),
]);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 64 }).notNull(),
  resourceType: varchar("resource_type", { length: 64 }),
  resourceId: uuid("resource_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (t) => [
  index("idx_audit_user_id").on(t.userId),
  index("idx_audit_action").on(t.action),
  index("idx_audit_timestamp").on(t.timestamp),
  index("idx_audit_resource").on(t.resourceType, t.resourceId),
]);

// ─── Dashboard Stats (Materialized Cache) ────────────────────────────────────

export const dashboardStats = pgTable("dashboard_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  statKey: varchar("stat_key", { length: 64 }).notNull(),
  statValue: jsonb("stat_value").notNull(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
  validUntil: timestamp("valid_until"),
}, (t) => [
  unique("dashboard_stats_key_unique").on(t.statKey),
  index("idx_stats_key").on(t.statKey),
]);
