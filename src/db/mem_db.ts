import { newDb, DataType } from 'pg-mem';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import pgReal from 'pg';

function formatSqlWithArgs(sql: string, values: any[]): string {
  return sql.replace(/\$(\d+)/g, (match, istr) => {
    const idx = parseInt(istr, 10) - 1;
    if (idx < 0 || !values || idx >= values.length) return match;
    const val = values[idx];
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "number") return String(val);
    if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === "object") {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    }
    return `'${String(val).replace(/'/g, "''")}'`;
  });
}

export function createMemoryDatabase() {
  const memDb = newDb();

  // Register custom Postgres functions required by Drizzle & queries
  memDb.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 14.0 (SentinelAI In-Memory Engine)',
  });

  memDb.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'sentinelai',
  });

  memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    impure: true,
    implementation: () => crypto.randomUUID(),
  });

  // Custom date_trunc support for pg-mem
  memDb.public.registerFunction({
    name: 'date_trunc',
    args: [DataType.text, DataType.timestamp],
    returns: DataType.timestamp,
    impure: true,
    implementation: (unit: string, date: Date) => {
      const d = new Date(date);
      if (unit === 'hour') {
        d.setMinutes(0, 0, 0);
      } else if (unit === 'day') {
        d.setHours(0, 0, 0, 0);
      }
      return d;
    },
  });

  const ddl = `
CREATE TYPE role AS ENUM ('admin', 'analyst', 'viewer');
CREATE TYPE severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('new', 'investigating', 'confirmed', 'false_positive', 'resolved');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'contained', 'resolved', 'closed');
CREATE TYPE event_type AS ENUM ('network_flow', 'auth_event', 'dns_query', 'http_request', 'system_call', 'file_access', 'process_event', 'anomaly');
CREATE TYPE detection_method AS ENUM ('rule_based', 'ml_classifier', 'anomaly_detector', 'behavioral', 'fusion');
CREATE TYPE threat_category AS ENUM ('brute_force', 'dos_ddos', 'port_scan', 'data_exfiltration', 'malware', 'insider_threat', 'unauthorized_access', 'anomaly', 'normal');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(256) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP,
  login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(64),
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS network_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  source_ip VARCHAR(64) NOT NULL,
  destination_ip VARCHAR(64) NOT NULL,
  source_port INTEGER,
  destination_port INTEGER,
  protocol VARCHAR(16),
  duration REAL,
  packet_count INTEGER,
  bytes_sent INTEGER,
  bytes_received INTEGER,
  request_count INTEGER,
  response_count INTEGER,
  auth_failure_count INTEGER NOT NULL DEFAULT 0,
  event_type event_type NOT NULL DEFAULT 'network_flow',
  flags VARCHAR(32),
  user_id TEXT,
  process_name TEXT,
  file_path TEXT,
  command_line TEXT,
  metadata JSONB,
  raw_data JSONB,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processing_error TEXT,
  ingested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source VARCHAR(64) NOT NULL DEFAULT 'api',
  session_id TEXT
);

CREATE TABLE IF NOT EXISTS event_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES network_events(id) ON DELETE CASCADE,
  normalized_duration REAL,
  normalized_bytes REAL,
  normalized_packets REAL,
  byte_ratio REAL,
  packet_rate REAL,
  byte_rate REAL,
  auth_failure_rate REAL,
  port_category INTEGER,
  protocol_encoded INTEGER,
  event_type_encoded INTEGER,
  hour_of_day INTEGER,
  day_of_week INTEGER,
  is_weekend BOOLEAN,
  request_response_ratio REAL,
  connection_density REAL,
  entropy_score REAL,
  feature_vector JSONB,
  pipeline_version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
  extracted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES network_events(id) ON DELETE CASCADE,
  rule_score REAL NOT NULL DEFAULT 0,
  ml_score REAL NOT NULL DEFAULT 0,
  ml_confidence REAL NOT NULL DEFAULT 0,
  anomaly_score REAL NOT NULL DEFAULT 0,
  normalized_anomaly_score REAL NOT NULL DEFAULT 0,
  behavioral_deviation_score REAL NOT NULL DEFAULT 0,
  final_risk_score REAL NOT NULL DEFAULT 0,
  severity severity NOT NULL DEFAULT 'low',
  threat_category threat_category NOT NULL DEFAULT 'normal',
  is_threat BOOLEAN NOT NULL DEFAULT false,
  confidence REAL NOT NULL DEFAULT 0,
  detection_methods JSONB,
  matched_rules JSONB,
  explanation TEXT,
  ml_explanation JSONB,
  rule_evidence JSONB,
  behavioral_evidence JSONB,
  model_version VARCHAR(32),
  detected_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  description TEXT,
  category threat_category NOT NULL,
  severity severity NOT NULL,
  score_weight REAL NOT NULL DEFAULT 10,
  conditions JSONB NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  true_positive_count INTEGER NOT NULL DEFAULT 0,
  false_positive_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_id UUID NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
  event_id UUID REFERENCES network_events(id),
  incident_id UUID,
  title VARCHAR(256) NOT NULL,
  description TEXT,
  severity severity NOT NULL,
  risk_score REAL NOT NULL,
  category threat_category NOT NULL,
  source_ip VARCHAR(64),
  destination_ip VARCHAR(64),
  detection_methods JSONB,
  confidence REAL NOT NULL DEFAULT 0,
  explanation TEXT,
  status alert_status NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,
  is_suppressed BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT,
  related_event_ids JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(256) NOT NULL,
  description TEXT,
  severity severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  alert_ids JSONB,
  affected_assets JSONB,
  attack_vectors JSONB,
  timeline JSONB,
  containment_actions TEXT,
  root_cause TEXT,
  resolution TEXT,
  lessons_learned TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS incident_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  note_type VARCHAR(32) NOT NULL DEFAULT 'comment',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threat_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type VARCHAR(32) NOT NULL,
  indicator_value TEXT NOT NULL,
  threat_level severity NOT NULL DEFAULT 'medium',
  confidence REAL NOT NULL DEFAULT 0.5,
  source VARCHAR(64) NOT NULL DEFAULT 'local',
  description TEXT,
  tags JSONB,
  first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(64) NOT NULL,
  version VARCHAR(16) NOT NULL,
  algorithm VARCHAR(64) NOT NULL,
  description TEXT,
  dataset_version VARCHAR(32),
  feature_version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
  accuracy REAL,
  "precision" REAL,
  recall REAL,
  f1_score REAL,
  roc_auc REAL,
  false_positive_rate REAL,
  confusion_matrix JSONB,
  feature_importance JSONB,
  hyperparameters JSONB,
  training_samples INTEGER,
  test_samples INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trained_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS behavioral_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  metric_name VARCHAR(64) NOT NULL,
  mean_value REAL NOT NULL,
  std_deviation REAL NOT NULL DEFAULT 0,
  min_value REAL,
  max_value REAL,
  sample_count INTEGER NOT NULL DEFAULT 0,
  window_hours INTEGER NOT NULL DEFAULT 24,
  computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64),
  resource_id UUID,
  details JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key VARCHAR(64) NOT NULL UNIQUE,
  stat_value JSONB NOT NULL,
  computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP
);
`;

  memDb.public.none(ddl);

  // Seed default data directly with SQL
  const adminHash = bcrypt.hashSync("SentinelAI@2024", 10);
  const analystHash = bcrypt.hashSync("Analyst@2024", 10);
  const viewerHash = bcrypt.hashSync("Viewer@2024", 10);

  const adminId = "11111111-1111-1111-1111-111111111111";
  const analystId = "22222222-2222-2222-2222-222222222222";
  const viewerId = "33333333-3333-3333-3333-333333333333";
  const event1Id = "44444444-4444-4444-4444-444444444444";
  const det1Id = "55555555-5555-5555-5555-555555555555";
  const alert1Id = "66666666-6666-6666-6666-666666666666";
  const incident1Id = "77777777-7777-7777-7777-777777777777";

  const seedSql = `
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
('${adminId}', 'admin', 'admin@sentinelai.com', '${adminHash}', 'admin', true),
('${analystId}', 'analyst', 'analyst@sentinelai.com', '${analystHash}', 'analyst', true),
('${viewerId}', 'viewer', 'viewer@sentinelai.com', '${viewerHash}', 'viewer', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO detection_rules (id, name, description, category, severity, score_weight, conditions, is_enabled, created_by) VALUES
('11111111-0000-0000-0000-000000000001', 'Brute Force Authentication', 'Detects repeated authentication failures from a single source', 'brute_force', 'high', 25, '{"authFailureCount": {"gte": 5}}', true, '${adminId}'),
('11111111-0000-0000-0000-000000000002', 'Port Scan Detection', 'Detects rapid connection attempts across multiple ports', 'port_scan', 'medium', 20, '{"duration": {"lt": 0.5}, "packetRate": {"gt": 100}}', true, '${adminId}'),
('11111111-0000-0000-0000-000000000003', 'Data Exfiltration - Abnormal Upload', 'Detects unusually large outbound data transfers', 'data_exfiltration', 'high', 30, '{"bytesSent": {"gt": 52428800}}', true, '${adminId}'),
('11111111-0000-0000-0000-000000000004', 'DoS/DDoS Pattern', 'Detects denial of service attack patterns', 'dos_ddos', 'critical', 35, '{"requestRate": {"gt": 500}, "packetCount": {"gt": 10000}}', true, '${adminId}'),
('11111111-0000-0000-0000-000000000005', 'Suspicious Destination Port', 'Connection to commonly exploited or suspicious ports', 'unauthorized_access', 'medium', 15, '{"destinationPort": {"in": [23, 135, 139, 445, 1433, 3389, 4444, 5900, 6379, 27017]}}', true, '${adminId}'),
('11111111-0000-0000-0000-000000000006', 'Internal Lateral Movement', 'Detects potential lateral movement within internal network', 'unauthorized_access', 'high', 25, '{"internalToInternal": true, "adminPort": true}', true, '${adminId}');

INSERT INTO model_versions (id, model_name, version, algorithm, description, dataset_version, feature_version, accuracy, "precision", recall, f1_score, roc_auc, false_positive_rate, training_samples, test_samples, is_active) VALUES
('22222222-0000-0000-0000-000000000001', 'XGBoost Classifier', 'v1.2.0', 'Extreme Gradient Boosting', 'Primary intrusion detection classifier trained on CIC-IDS2017 & NSL-KDD', 'CIC-IDS2017-v2', 'v1.0', 0.941, 0.938, 0.945, 0.941, 0.978, 0.042, 225745, 56436, true),
('22222222-0000-0000-0000-000000000002', 'Isolation Forest Anomaly Detector', 'v1.1.0', 'Isolation Forest', 'Unsupervised anomaly detection for zero-day attack patterns', 'Normal-Traffic-Baseline-v1', 'v1.0', 0.864, 0.821, 0.895, 0.856, 0.912, 0.078, 150000, 37500, true);

INSERT INTO network_events (id, source_ip, destination_ip, source_port, destination_port, protocol, duration, packet_count, bytes_sent, bytes_received, request_count, response_count, auth_failure_count, event_type, flags, is_processed, source) VALUES
('${event1Id}', '198.51.100.25', '192.168.1.10', 48212, 22, 'TCP', 0.25, 15, 1200, 450, 4, 2, 8, 'auth_event', 'SYN,ACK', true, 'simulator');

INSERT INTO detections (id, event_id, rule_score, ml_score, ml_confidence, anomaly_score, normalized_anomaly_score, behavioral_deviation_score, final_risk_score, severity, threat_category, is_threat, confidence, detection_methods, explanation) VALUES
('${det1Id}', '${event1Id}', 65, 88, 0.92, 0.74, 0.78, 0.65, 82, 'high', 'brute_force', true, 0.91, '["rule_based", "ml_classifier", "behavioral"]', 'Brute Force Authentication attack detected from 198.51.100.25 targeting SSH (Port 22). 8 auth failures in short duration.');

INSERT INTO alerts (id, detection_id, event_id, title, description, severity, risk_score, category, source_ip, destination_ip, detection_methods, confidence, explanation, status) VALUES
('${alert1Id}', '${det1Id}', '${event1Id}', 'Brute Force Attack from 198.51.100.25', 'Repeated SSH authentication failures detected from external IP 198.51.100.25 against internal host 192.168.1.10.', 'high', 82, 'brute_force', '198.51.100.25', '192.168.1.10', '["rule_based", "ml_classifier", "behavioral"]', 0.91, '8 authentication failures observed within 0.25 seconds. High probability of automated password spraying.', 'new');

INSERT INTO incidents (id, title, description, severity, status, assigned_to, alert_ids, affected_assets, attack_vectors, timeline, containment_actions, created_by) VALUES
('${incident1Id}', 'Active SSH Brute Force Campaign against DMZ Server', 'Multiple external IP addresses attempting dictionary attacks against internal gateway and SSH services.', 'high', 'investigating', '${adminId}', '["${alert1Id}"]', '["192.168.1.10 (Gateway Server)"]', '["SSH Port 22 Credential Stuffing"]', '[{"timestamp":"2026-09-01T11:50:00.000Z","event":"Initial connection attempts detected"},{"timestamp":"2026-09-01T11:55:00.000Z","event":"High-frequency auth failure threshold exceeded"}]', 'IP 198.51.100.25 temporarily rate-limited at firewall perimeter.', '${adminId}');

INSERT INTO threat_indicators (id, indicator_type, indicator_value, threat_level, confidence, source, description, tags) VALUES
('33333333-0000-0000-0000-000000000001', 'ip', '198.51.100.25', 'high', 0.95, 'SentinelAI Internal Threat Feeds', 'Known malicious IP observed in multiple SSH brute force campaigns', '["brute_force", "botnet", "scanner"]'),
('33333333-0000-0000-0000-000000000002', 'ip', '185.220.101.25', 'critical', 0.98, 'Tor Exit Node Registry', 'Active Tor exit relay associated with unauthorized credential access', '["anonymizer", "tor", "suspicious"]');
`;

  memDb.public.none(seedSql);

  const pg = memDb.adapters.createPg();

  // Override adaptQuery and adaptResults to handle Drizzle array rowMode and query args
  const proto = (pg.Pool as any).prototype;

  proto.adaptQuery = function (query: any, values: any) {
    if (typeof query === "string") {
      query = { text: query };
    }
    if (Array.isArray(values) && values.length > 0) {
      query.values = values;
    }
    if (query.values && query.values.length > 0) {
      query.text = formatSqlWithArgs(query.text, query.values);
    }
    return query;
  };

  proto.adaptResults = function (query: any, res: any) {
    if (query && query.rowMode === "array") {
      const fields = res.fields || [];
      return {
        ...res,
        rows: res.rows.map((row: any) => {
          if (Array.isArray(row)) return row;
          return fields.map((f: any) => row[f.name]);
        }),
      };
    }
    return {
      ...res,
      rows: res.rows.map((row: any) => ({ ...row })),
    };
  };

  const pool = new pg.Pool();
  const db = drizzle(pool, { schema });

  return { pool, db };
}
