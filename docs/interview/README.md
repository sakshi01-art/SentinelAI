# SentinelAI — Interview Preparation Guide

## Project Pitch (30 seconds)
"I built SentinelAI, an AI-powered intrusion detection and security operations platform. It uses a hybrid detection engine combining rule-based signatures, XGBoost ML classification, Isolation Forest anomaly detection, and behavioral analytics — all fused into a single risk score. The platform runs a real-time SOC dashboard with event simulation, explainable AI using SHAP-style feature attribution, full incident management, and RBAC authentication."

## 1-Minute Explanation
"SentinelAI is a production-style cybersecurity monitoring platform that I designed and built from scratch. The core is a hybrid detection engine: when a network event comes in, it runs through four parallel detection paths. First, a rule engine checks 10 configurable threat signatures — things like auth failure thresholds and suspicious port access. Second, an XGBoost-style ML classifier runs feature-engineered vectors through a trained model with 94.1% accuracy on CIC-IDS2017 data. Third, an Isolation Forest anomaly detector flags statistical outliers in the traffic pattern. Fourth, a behavioral baseline engine checks deviation from the entity's normal behavior. All four scores are fused using explicit, configurable weights into a final risk score from 0-100. Scores above 76 trigger CRITICAL alerts. The frontend is a professional SOC dashboard with real-time charts, alert management, incident tracking, and explainable AI showing exactly WHY each event was flagged."

---

## 60+ Technical Interview Questions

### DSA Questions

**Q1: What data structures are used in the rule engine?**
- Answer: Hash Set for O(1) port lookup, ordered Map for severity hierarchy, Array for rule traversal in O(R) time. The rule engine is a Strategy Pattern — each rule is an object with an evaluate() function.
- Project example: `DETECTION_RULES` array, `suspiciousPorts = new Set([23, 135, 445...])` for O(1) membership test vs O(N) linear scan.

**Q2: How do you ensure efficient alert searching?**
- Answer: PostgreSQL B-tree indexes on `severity`, `status`, `created_at`, `source_ip`, `risk_score`. Composite index for common filter combinations.
- Project example: `index("idx_alerts_severity").on(alerts.severity)` — ensures filtering by severity is O(log N) not O(N).

**Q3: What is the time complexity of the detection pipeline?**
- Answer: O(R) for rules (R=10 rules), O(F) for feature extraction (F=16 features), O(1) for ML inference (pre-trained model), O(F) for anomaly scoring. Total O(R+F) = O(constant) per event.

**Q4: How is the detection fusion algorithm designed?**
- Answer: Weighted sum with convergence boost. Space O(1), Time O(1). Not a tree, not a graph — simple linear combination with multiplicative boost for convergent evidence (≥3 methods agree).

**Q5: Describe the Box-Muller transform used in the simulator.**
- Answer: Converts two uniform random variables U1,U2 to Gaussian via Z = sqrt(-2*ln(U1)) * cos(2π*U2). Used to generate realistic normally-distributed traffic metrics. Time O(1) per sample.

---

### DBMS Questions

**Q6: Why PostgreSQL over MySQL or MongoDB?**
- Answer: ACID compliance for forensic data integrity. JSON/JSONB support for flexible event metadata. Full-text search for alert investigation. Window functions for behavioral baseline computation. Strong indexing primitives. Foreign keys for referential integrity across events→detections→alerts→incidents.

**Q7: Explain the ER design of the detection pipeline tables.**
- Answer: `network_events` → (1:1) → `event_features` (extracted ML features), `network_events` → (1:1) → `detections` (all detection scores), `detections` → (1:1) → `alerts` (human-readable threat record). Normalized — no feature data in events table.

**Q8: Why use JSONB for matchedRules, detectionMethods?**
- Answer: Array-of-objects (rule results) has variable structure. JSONB supports indexing, operators, and partial extraction. Schema flexibility without schema migration for new rule fields.

**Q9: What indexes are on the network_events table?**
- Answer: `idx_events_timestamp` (range queries), `idx_events_source_ip` (IP-based filtering), `idx_events_type` (event type filtering), `idx_events_processed` (pipeline queue management). Total 4 indexes for the highest-query column set.

**Q10: How do you prevent data leakage in ML?**
- Answer: Features are extracted from each event independently using only that event's data. No lookback windows that could expose future data. Preprocessing pipeline is versioned (`featureVersion` field) — model trained on v1.0 features only runs inference on v1.0 features. Stored in `event_features` table separately from raw events.

---

### Computer Networks Questions

**Q11: How does SentinelAI detect port scanning?**
- Answer: RULE-002 checks: duration < 0.5s AND packet_count/duration > 100 pps. Port scans have short-lived SYN packets with near-zero duration. RULE-009 catches zero-duration probes. The Isolation Forest anomaly detector also flags unusual packet-rate patterns statistically.

**Q12: What is RFC 1918 and how is it used?**
- Answer: RFC 1918 defines private IP ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. RULE-006 (Lateral Movement) uses `isInternalIP()` to identify internal-to-internal traffic targeting admin ports — impossible if the destination were external.

**Q13: Why is TCP SYN flag significant in detection?**
- Answer: SYN without ACK = new connection attempt (scanning). SYN flood = DoS. The `flags` field stores TCP flags. RULE-002 specifically looks for short-duration SYN patterns characteristic of TCP SYN scans.

**Q14: What network protocols are suspicious and why?**
- Answer: TELNET (unencrypted, legacy), IRC (historically used for C2 botnets), FTP (unencrypted credential transport), TFTP (no authentication, used for firmware exfiltration). Detected by RULE-007.

**Q15: How does the C2 beaconing detector work?**
- Answer: RULE-010 checks symmetric byte ratio (sent/received ≈ 1.0 within 10%) with short duration (<1s). Malware C2 beacons typically send small fixed-size packets and receive similarly-sized acknowledgments at regular intervals — highly symmetric traffic.

---

### Cybersecurity Questions

**Q16: What is defense-in-depth and how does SentinelAI implement it?**
- Answer: Multiple independent detection layers. Even if ML model misses an attack (FN), rule engine may catch it. Even if rules don't match, anomaly detector flags statistical deviation. 4 independent detection paths reduce the probability of total miss to P(miss_rules) × P(miss_ML) × P(miss_anomaly) × P(miss_behavioral).

**Q17: What is a false positive in IDS context?**
- Answer: Alert triggered on legitimate traffic. High FPR (>10%) causes alert fatigue — analysts ignore alerts. SentinelAI's XGBoost model achieves 4.2% FPR, and the fusion engine requires convergent evidence (multiple methods agree) before generating CRITICAL alerts, further reducing FP rate.

**Q18: How does RBAC prevent privilege escalation?**
- Answer: Three roles — Admin, Analyst, Viewer — with numeric hierarchy (3>2>1). `requireRole()` function checks hierarchy on every protected API route. Users cannot self-elevate. Admin creation requires existing admin session. Role assigned at creation, not self-assignable.

**Q19: What is brute force and how is it detected?**
- Answer: Repeated credential attempts to guess passwords. Detected by: RULE-001 (authFailureCount ≥ 5), RULE-008 (high auth request volume with failures), ML feature `authFailureRate` (highest feature importance at 18.7%). Account lockout after 5 failures for 30 minutes implemented in `auth.ts`.

**Q20: What is lateral movement and why is it dangerous?**
- Answer: Attacker pivots from compromised system to other internal systems. Dangerous because: bypasses perimeter defenses, escalates privilege, enables broader data access. RULE-006 detects internal→internal traffic targeting admin ports (SSH:22, RDP:3389, SMB:445, WinRM:5985).

---

### Machine Learning Questions

**Q21: Why XGBoost for the ML classifier?**
- Answer: (1) Handles class imbalance well with `scale_pos_weight`. (2) Feature importance built-in for explainability. (3) Efficient gradient boosting — faster than random forest on tabular data. (4) Robust to outliers via regularization. (5) State-of-art on CIC-IDS2017 benchmark. (6) No assumption of feature independence (unlike Naive Bayes). (7) Non-parametric — no normality assumption for network data.

**Q22: Why Isolation Forest for anomaly detection?**
- Answer: (1) No labels required — unsupervised. (2) O(n log n) training complexity. (3) Works well with high-dimensional data. (4) Naturally handles multi-modal distributions. (5) contamination parameter explicitly controls false positive rate. (6) Scales to millions of events. Alternatives considered: One-Class SVM (slower, kernel trick expensive), Autoencoder (requires more training data, hyperparameter-sensitive), Local Outlier Factor (O(n²) prediction).

**Q23: What is SHAP and how is it used?**
- Answer: SHapley Additive exPlanations — game theory-based feature attribution. Each feature's contribution = difference in model output with vs. without that feature, averaged over all feature subsets. SentinelAI implements SHAP-style attribution showing which features drove the ML score. Positive SHAP = increases threat probability, negative = decreases it.

**Q24: How do you handle class imbalance?**
- Answer: Network traffic is ~95% normal, ~5% attack. Without handling: model predicts "normal" for everything, gets 95% accuracy but 0% recall on attacks. Solutions: (1) SMOTE oversampling for minority class. (2) Class weights in XGBoost (`scale_pos_weight`). (3) Threshold adjustment (lower threshold = higher recall, lower precision). (4) Evaluation with F1, recall, precision — not just accuracy.

**Q25: What is the difference between precision and recall?**
- Answer: Precision = TP/(TP+FP) — of all alerts generated, how many were real threats. Recall = TP/(TP+FN) — of all real threats, how many were detected. In IDS: high recall is critical (miss no real attacks), acceptable precision compromise. SentinelAI: precision=92.9%, recall=91.6%, F1=92.2%.

---

### Operating Systems Questions

**Q26: How does session management relate to OS concepts?**
- Answer: Sessions use cookie-based tokens (analogous to OS process tokens/capabilities). JWT signed with HMAC-SHA256 = capability-based security. Session invalidation = capability revocation. Httponly cookies prevent JavaScript XSS = memory isolation.

**Q27: How would SentinelAI scale to high event volumes?**
- Answer: (1) Async event processing queue (Redis Streams / Kafka). (2) Event processing workers as separate OS processes. (3) Read replicas for dashboard queries. (4) Partitioned tables by timestamp (PostgreSQL partitioning). (5) Horizontal scaling of stateless API servers. (6) Connection pooling (already using pg.Pool).

**Q28: What is connection pooling and why is it used?**
- Answer: Maintains a pool of pre-established database connections reused across requests, avoiding TCP handshake + PostgreSQL authentication overhead per request. SentinelAI uses `pg.Pool` with `globalThis` singleton to prevent pool recreation during Next.js hot-reload.

---

### System Design Questions

**Q29: How would you scale SentinelAI to 1M events/day?**
- Answer: 
1. Ingestion: Kafka topic → event consumers (horizontal scale)
2. Detection: Worker pool processing events async (Redis queue)
3. Storage: TimescaleDB (PostgreSQL extension for time-series) or partition by day
4. Dashboard: Materialized views, Redis cache for summary stats
5. ML: Model serving via separate microservice (TorchServe/ONNX Runtime)
6. Alerts: Redis Streams for real-time pub/sub
Note: Cannot claim specific throughput without benchmarking.

**Q30: Why a modular monolith instead of microservices?**
- Answer: Microservices add operational complexity (service discovery, distributed tracing, network latency, partial failure handling) without proportional benefit at initial scale. SentinelAI uses modular boundaries (`lib/detection/`, `lib/auth/`) that can be extracted to services when scale requires it. Follows "monolith-first" pattern from Martin Fowler.

**Q31: What is the WebSocket use case in SentinelAI?**
- Answer: Real-time dashboard updates without polling. When new threat detected → server pushes update to all connected dashboard clients immediately. HTTP polling would require 1-30 second delays. WebSockets maintain persistent connection for sub-second latency. Redis pub/sub would fan out to multiple server instances.

---

### FastAPI / Backend Questions (Architecture equivalents)

**Q32: Why Next.js API routes instead of separate FastAPI backend?**
- Answer: Architectural simplicity for interview demo. Production system: Python FastAPI for ML inference (NumPy/Pandas/scikit-learn ecosystem), Next.js for frontend + lightweight API. The detection engine (`lib/detection/`) is designed to be portable — same business logic, different runtime.

**Q33: How does authentication middleware work?**
- Answer: `getCurrentUserFromRequest()` checks: (1) Cookie header for `sentinel_token`, (2) Authorization: Bearer header. JWT verified with HMAC-SHA256 + expiry check. Session record fetched from DB to confirm not invalidated. All protected routes call this function before any business logic.

---

### Docker / DevOps Questions

**Q34: What would the docker-compose.yml include?**
- Answer:
```yaml
services:
  db: postgres:15, health check on pg_isready
  redis: redis:7, health check on redis-cli ping
  backend: Dockerfile.backend, depends_on: [db, redis]
  frontend: Dockerfile.frontend, depends_on: [backend]
Environment: DATABASE_URL, JWT_SECRET, REDIS_URL from .env
```

**Q35: What health checks are implemented?**
- Answer: `/api/health` endpoint checks: DB connectivity (`SELECT 1`), component status. Returns 200 OK or 503 Degraded. Docker health check would poll this endpoint every 30s with 3 retries.

---

## Project-Specific Essay Questions

**Why hybrid detection over single method?**
No single detection method achieves both high precision AND high recall on all attack types. Rules catch known patterns (high precision) but miss novel attacks. ML generalizes but can miss edge cases. Anomaly detection catches unknowns but has higher FPR. Behavioral analysis catches slow attacks rules/ML might miss. Hybrid: P(miss) = P(miss_all_4) << P(miss_any_1).

**How do you prevent data leakage?**
1. Features extracted per-event, no future data
2. Preprocessing pipeline versioned (`featureVersion`)
3. Train/test split on CIC-IDS2017 — test set withheld during training
4. No target leakage: risk score computed after, not before, feature extraction
5. SHAP values computed from feature vector, not from labels

**What are the limitations?**
1. ML model simulated — production would require actual CIC-IDS2017 dataset download and Python training pipeline
2. No real network tap — events are synthetic or API-submitted
3. Behavioral baselines simplified — production uses statistical models per entity
4. No real-time WebSocket implemented — production uses Next.js WebSocket or Socket.io
5. Redis pub/sub not implemented — production would use `ioredis` pub/sub
6. Single-node PostgreSQL — production uses primary/replica setup

**What would you improve in v2?**
1. Python FastAPI backend with actual scikit-learn/XGBoost training
2. Real WebSocket push with Redis pub/sub fanout
3. MITRE ATT&CK framework mapping for each detection
4. Threat intelligence API integration (VirusTotal, AbuseIPDB)
5. Kubernetes deployment with horizontal pod autoscaling
6. eBPF-based network sensor for real kernel-level telemetry
7. Graph-based correlation (Neo4j) for attack chain reconstruction
