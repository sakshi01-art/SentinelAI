"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskScore, RiskGauge } from "@/components/ui/RiskScore";
import { DetectionRadar } from "@/components/dashboard/ThreatChart";
import { formatDate, getSeverityBg } from "@/lib/utils";
import {
  Shield,
  AlertTriangle,
  Activity,
  Cpu,
  Eye,
  Clock,
  Network,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";

interface AlertDetail {
  alert: {
    id: string;
    title: string;
    description: string;
    severity: string;
    riskScore: number;
    category: string;
    status: string;
    sourceIp: string;
    destinationIp: string;
    confidence: number;
    explanation: string;
    detectionMethods: string[];
    createdAt: string;
    resolvedAt: string | null;
    resolutionNote: string | null;
  };
  detection: {
    id: string;
    ruleScore: number;
    mlScore: number;
    mlConfidence: number;
    anomalyScore: number;
    normalizedAnomalyScore: number;
    behavioralDeviationScore: number;
    finalRiskScore: number;
    threatCategory: string;
    matchedRules: Array<{ ruleId: string; ruleName: string; evidence: string; scoreContribution: number }>;
    mlExplanation: {
      shapValues: Array<{ feature: string; shapContribution: number; description: string }>;
      featureImportance: Array<{ feature: string; importance: number; direction: string; humanReadable: string }>;
      decisionPath: string[];
    };
    behavioralEvidence: {
      deviationScore: number;
      factors: string[];
    };
  } | null;
  event: {
    id: string;
    sourceIp: string;
    destinationIp: string;
    sourcePort: number | null;
    destinationPort: number | null;
    protocol: string | null;
    duration: number | null;
    packetCount: number | null;
    bytesSent: number | null;
    bytesReceived: number | null;
    authFailureCount: number;
    eventType: string;
    timestamp: string;
  } | null;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["investigating", "false_positive"],
  investigating: ["confirmed", "false_positive", "resolved"],
  confirmed: ["resolved"],
  false_positive: [],
  resolved: [],
};

export default function AlertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch(`/api/alerts/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/alerts/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, resolutionNote: note }),
      });
      const updated = await res.json();
      if (updated.success) {
        setData((prev) => prev ? { ...prev, alert: updated.data.alert } : null);
        setNote("");
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-red-400">Alert not found</div>;

  const { alert, detection, event } = data;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={`Alert: ${alert.id.slice(0, 8)}...`}
        subtitle={alert.title}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs"
          >
            <ChevronLeft className="w-3 h-3" />
            Back
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Header row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Alert summary */}
          <Card className="xl:col-span-2">
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <RiskGauge score={alert.riskScore} />
                  <div className="text-center mt-1">
                    <RiskScore score={alert.riskScore} size="lg" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="severity" severity={alert.severity}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="status" status={alert.status}>
                      {alert.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <span className="text-slate-500 text-xs">
                      {alert.category?.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-slate-100 text-lg font-semibold mb-2">
                    {alert.title}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {alert.explanation}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[
                      { label: "Confidence", value: `${(alert.confidence * 100).toFixed(1)}%` },
                      { label: "Detection Methods", value: (alert.detectionMethods || []).length },
                      { label: "Source IP", value: alert.sourceIp || "N/A" },
                      { label: "Detected", value: formatDate(alert.createdAt) },
                    ].map((m) => (
                      <div key={m.label} className="bg-[#080d1a] rounded-lg p-3">
                        <div className="text-slate-500 text-xs mb-1">{m.label}</div>
                        <div className="text-slate-200 text-sm font-mono font-medium">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle>Status Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(STATUS_TRANSITIONS[alert.status] || []).length > 0 ? (
                  <>
                    <div>
                      <label className="text-slate-500 text-xs uppercase tracking-wider block mb-2">
                        Resolution Note
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg p-3 text-slate-300 text-sm resize-none h-24 focus:outline-none focus:border-cyan-500/50"
                        placeholder="Add investigation notes..."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_TRANSITIONS[alert.status].map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(s)}
                          disabled={updating}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                            s === "confirmed"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                              : s === "false_positive"
                              ? "bg-slate-500/20 text-slate-400 border border-slate-500/30 hover:bg-slate-500/30"
                              : s === "resolved"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                          }`}
                        >
                          {s.replace("_", " ").toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Alert is in final state: {alert.status}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Network Event Details */}
        {event && (
          <Card>
            <CardHeader>
              <CardTitle>Network Event Details</CardTitle>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400 text-xs">{formatDate(event.timestamp)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {[
                  { label: "Source IP", value: event.sourceIp, mono: true },
                  { label: "Source Port", value: event.sourcePort || "N/A", mono: true },
                  { label: "Destination IP", value: event.destinationIp, mono: true },
                  { label: "Dest Port", value: event.destinationPort || "N/A", mono: true },
                  { label: "Protocol", value: event.protocol || "N/A" },
                  { label: "Event Type", value: event.eventType?.replace(/_/g, " ") },
                  { label: "Duration", value: event.duration ? `${event.duration.toFixed(3)}s` : "N/A" },
                  { label: "Packets", value: event.packetCount?.toLocaleString() || "N/A" },
                  { label: "Bytes Sent", value: event.bytesSent ? `${(event.bytesSent / 1024).toFixed(1)} KB` : "N/A" },
                  { label: "Bytes Recv", value: event.bytesReceived ? `${(event.bytesReceived / 1024).toFixed(1)} KB` : "N/A" },
                  { label: "Auth Failures", value: event.authFailureCount },
                  { label: "Event ID", value: event.id.slice(0, 8) + "...", mono: true },
                ].map((field) => (
                  <div key={field.label} className="bg-[#080d1a] rounded-lg p-3">
                    <div className="text-slate-500 text-xs mb-1">{field.label}</div>
                    <div className={`text-slate-200 text-sm font-medium ${field.mono ? "font-mono" : ""}`}>
                      {String(field.value)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detection Analysis */}
        {detection && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Detection scores */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Fusion Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <DetectionRadar
                  ruleScore={detection.ruleScore / 100}
                  mlScore={detection.mlScore / 100}
                  anomalyScore={detection.normalizedAnomalyScore}
                  behavioralScore={detection.behavioralDeviationScore}
                />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { label: "Rule Score", value: detection.ruleScore.toFixed(1), color: "text-cyan-400" },
                    { label: "ML Score", value: `${detection.mlScore.toFixed(1)}%`, color: "text-blue-400" },
                    { label: "Anomaly Score", value: detection.normalizedAnomalyScore.toFixed(3), color: "text-purple-400" },
                    { label: "Behavioral Dev.", value: `${(detection.behavioralDeviationScore * 100).toFixed(1)}%`, color: "text-green-400" },
                  ].map((m) => (
                    <div key={m.label} className="bg-[#080d1a] rounded-lg p-3">
                      <div className="text-slate-500 text-xs mb-1">{m.label}</div>
                      <div className={`font-bold text-lg ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ML Explanation */}
            <Card>
              <CardHeader>
                <CardTitle>Explainable AI (SHAP)</CardTitle>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                {detection.mlExplanation?.featureImportance && (
                  <div className="space-y-3">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                      Feature Contributions
                    </div>
                    {detection.mlExplanation.featureImportance.slice(0, 5).map((f: { feature: string; importance: number; direction: string; humanReadable: string }) => (
                      <div key={f.feature} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-slate-400 truncate flex-shrink-0">
                          {f.feature}
                        </div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              f.direction === "increases_risk"
                                ? "bg-red-400"
                                : f.direction === "decreases_risk"
                                ? "bg-green-400"
                                : "bg-slate-500"
                            }`}
                            style={{ width: `${f.importance * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-400 w-16 text-right">
                          {f.humanReadable}
                        </div>
                      </div>
                    ))}

                    {detection.mlExplanation.decisionPath && (
                      <>
                        <div className="text-slate-500 text-xs uppercase tracking-wider mt-4 mb-2">
                          Decision Path
                        </div>
                        <div className="bg-[#080d1a] rounded-lg p-3 space-y-1">
                          {detection.mlExplanation.decisionPath.map((step: string, i: number) => (
                            <div key={i} className="text-xs font-mono text-slate-400">
                              <span className="text-cyan-600 mr-2">{i + 1}.</span>
                              {step}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Matched Rules */}
        {detection && detection.matchedRules && Array.isArray(detection.matchedRules) && (detection.matchedRules as unknown[]).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Matched Detection Rules</CardTitle>
              <span className="text-cyan-400 text-xs">
                {(detection.matchedRules as unknown[]).length} rule(s) triggered
              </span>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(detection.matchedRules as Array<{ ruleId: string; ruleName: string; evidence: string; scoreContribution: number; severity: string }>).map((rule) => (
                  <div
                    key={rule.ruleId}
                    className="flex items-start gap-4 bg-[#080d1a] rounded-lg p-4"
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${getSeverityBg(rule.severity)}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-200 text-sm font-medium">
                          {rule.ruleName}
                        </span>
                        <span className="text-slate-500 text-xs">{rule.ruleId}</span>
                        <Badge variant="severity" severity={rule.severity}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">{rule.evidence}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-orange-400 font-bold">
                        +{rule.scoreContribution.toFixed(0)}
                      </div>
                      <div className="text-slate-500 text-xs">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Behavioral Evidence */}
        {detection?.behavioralEvidence?.factors && detection.behavioralEvidence.factors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Behavioral & Anomaly Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                    Contributing Factors
                  </div>
                  <ul className="space-y-2">
                    {detection.behavioralEvidence.factors.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-orange-400 mt-0.5">▸</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                    Deviation Score
                  </div>
                  <div className="bg-[#080d1a] rounded-lg p-4">
                    <div className="text-orange-400 text-3xl font-bold">
                      {(detection.behavioralEvidence.deviationScore * 100).toFixed(1)}%
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                      deviation from behavioral baseline
                    </div>
                    <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{
                          width: `${Math.min(detection.behavioralEvidence.deviationScore * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
