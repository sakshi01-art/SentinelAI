# SentinelAI — ATS-Optimized Resume Bullets

## For Software Engineer / Backend Engineer Roles

- Designed and implemented **SentinelAI**, a full-stack cybersecurity monitoring platform using Next.js 16, PostgreSQL (Drizzle ORM), and TypeScript; architected a hybrid detection pipeline combining rule-based engine, supervised ML classification (XGBoost), unsupervised anomaly detection (Isolation Forest), and behavioral baseline analytics into a unified risk-scoring system (0–100 scale)

- Built a **4-layer detection fusion engine** that extracts 16 engineered features per network event (byte ratios, packet rates, auth failure rates, entropy scores), runs parallel inference across detection methods, and applies explicit weighted aggregation (rules:35%, ML:30%, anomaly:20%, behavioral:15%) with convergence boost for multi-method agreement — achieving ML classifier F1-score of 92.2% with 4.2% false positive rate

- Implemented **Explainable AI (XAI)** using SHAP-style feature attribution for every ML detection, producing human-readable decision paths, per-feature SHAP contribution scores, and ranked feature importance — enabling analysts to understand exactly why an event was flagged without accessing model internals

- Engineered a **secure RESTful API** (20+ endpoints) with JWT authentication, HTTP-only cookie sessions, bcrypt password hashing (12 salt rounds), role-based access control (Admin/Analyst/Viewer hierarchy), account lockout after 5 failed attempts, and comprehensive audit logging of all security-sensitive actions

- Developed a **professional SOC dashboard** using React, TypeScript, and Recharts with real-time event streaming, alert management workflow (New→Investigating→Confirmed→Resolved), incident correlation, ML model performance monitoring (confusion matrix, ROC-AUC, precision/recall), and a configurable synthetic event simulator generating statistically realistic attack scenarios using Box-Muller Gaussian distributions

## One-Line Version
Built SentinelAI, an AI-powered intrusion detection platform with hybrid ML/rule/anomaly detection (XGBoost F1: 92.2%), explainable AI, RBAC authentication, incident management, and a professional SOC dashboard using Next.js, PostgreSQL, and TypeScript.
