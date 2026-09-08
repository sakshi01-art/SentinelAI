"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskScore, RiskGauge } from "@/components/ui/RiskScore";
import { DetectionRadar } from "@/components/dashboard/ThreatChart";
import { formatDate } from "@/lib/utils";
import { Eye, Search, AlertTriangle } from "lucide-react";

function InvestigateContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [searchInput, setSearchInput] = useState(eventId || "");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const investigate = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Event not found");
        setData(null);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) investigate(eventId);
  }, [eventId]);

  const event = data?.event as Record<string, unknown> | null;
  const detection = data?.detection as Record<string, unknown> | null;
  const alertsList = data?.alerts as Array<Record<string, unknown>> | null;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Event Investigation"
        subtitle="Deep-dive analysis of security events"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search */}
        <Card className="p-4">
          <div className="flex gap-3">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && investigate(searchInput)}
              placeholder="Enter Event ID (UUID)..."
              className="flex-1 bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 font-mono"
            />
            <button
              onClick={() => investigate(searchInput)}
              disabled={loading || !searchInput.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-[#080d1a] rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? "Searching..." : "Investigate"}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </Card>

        {!data && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Eye className="w-16 h-16 mb-4 opacity-30" />
            <div className="text-lg font-medium mb-2">Event Investigation Console</div>
            <div className="text-sm text-center max-w-md">
              Enter an Event ID to perform deep analysis. You can find Event IDs in the
              Events Stream or Detection Results pages.
            </div>
            <div className="mt-6 text-xs text-slate-600">
              Tip: Run the Simulator first to generate events, then investigate from the Event Stream.
            </div>
          </div>
        )}

        {event && (
          <>
            {/* Overview */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Event Overview</CardTitle>
                  <span className="text-slate-500 text-xs font-mono">{event.id as string}</span>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Source IP", value: event.sourceIp, mono: true },
                      { label: "Destination IP", value: event.destinationIp, mono: true },
                      { label: "Protocol", value: event.protocol || "N/A" },
                      { label: "Source Port", value: event.sourcePort || "N/A", mono: true },
                      { label: "Dest Port", value: event.destinationPort || "N/A", mono: true },
                      { label: "Event Type", value: String(event.eventType).replace(/_/g, " ") },
                      { label: "Duration", value: event.duration ? `${Number(event.duration).toFixed(3)}s` : "N/A" },
                      { label: "Packet Count", value: event.packetCount ? Number(event.packetCount).toLocaleString() : "N/A" },
                      { label: "Auth Failures", value: event.authFailureCount },
                      { label: "Bytes Sent", value: event.bytesSent ? `${(Number(event.bytesSent)/1024).toFixed(1)} KB` : "N/A" },
                      { label: "Bytes Recv", value: event.bytesReceived ? `${(Number(event.bytesReceived)/1024).toFixed(1)} KB` : "N/A" },
                      { label: "Timestamp", value: formatDate(event.timestamp as string) },
                    ].map(f => (
                      <div key={f.label} className="bg-[#080d1a] rounded-lg p-3">
                        <div className="text-slate-500 text-xs mb-1">{f.label}</div>
                        <div className={`text-slate-200 text-sm font-medium ${f.mono ? "font-mono" : ""}`}>
                          {String(f.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {detection ? (
                <Card>
                  <CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
                  <CardContent className="text-center space-y-3">
                    <RiskGauge score={Number(detection.finalRiskScore)} />
                    <RiskScore score={Number(detection.finalRiskScore)} size="lg" showBar />
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Severity</span>
                        <Badge variant="severity" severity={detection.severity as string}>
                          {String(detection.severity).toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Category</span>
                        <span className="text-slate-300">{String(detection.threatCategory).replace(/_/g,' ')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Confidence</span>
                        <span className="text-cyan-400">{(Number(detection.confidence)*100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">ML Score</span>
                        <span className="text-blue-400">{Number(detection.mlScore).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Anomaly</span>
                        <span className="text-purple-400">{Number(detection.normalizedAnomalyScore).toFixed(3)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12 text-slate-500">
                    Event not yet analyzed
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Detection Details */}
            {detection && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Detection Fusion</CardTitle></CardHeader>
                  <CardContent>
                    <DetectionRadar
                      ruleScore={Number(detection.ruleScore)/100}
                      mlScore={Number(detection.mlScore)/100}
                      anomalyScore={Number(detection.normalizedAnomalyScore)}
                      behavioralScore={Number(detection.behavioralDeviationScore)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Explanation</CardTitle></CardHeader>
                  <CardContent>
                    <div className="bg-[#080d1a] rounded-lg p-4 text-slate-300 text-sm leading-relaxed">
                      {detection.explanation as string || "No explanation available"}
                    </div>
                    {Array.isArray(detection.matchedRules) && (detection.matchedRules as Array<{ ruleId: string; ruleName: string; evidence: string }>).length > 0 && (
                      <div className="mt-4">
                        <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Matched Rules</div>
                        {(detection.matchedRules as Array<{ ruleId: string; ruleName: string; evidence: string }>).map((rule) => (
                          <div key={rule.ruleId} className="flex items-start gap-2 py-2 border-b border-[#1e2d4a] last:border-0">
                            <AlertTriangle className="w-3 h-3 text-orange-400 mt-1 flex-shrink-0" />
                            <div>
                              <div className="text-slate-300 text-xs font-medium">{String(rule.ruleName)}</div>
                              <div className="text-slate-500 text-xs">{String(rule.evidence)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Related Alerts */}
            {alertsList && alertsList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Alerts</CardTitle>
                  <span className="text-slate-400 text-xs">{alertsList.length} alert(s)</span>
                </CardHeader>
                <div className="divide-y divide-[#1e2d4a]">
                  {alertsList.map(a => (
                    <div key={a.id as string} className="px-4 py-3 flex items-center gap-4">
                      <Badge variant="severity" severity={a.severity as string}>
                        {String(a.severity).toUpperCase()}
                      </Badge>
                      <span className="text-slate-200 text-sm flex-1">{a.title as string}</span>
                      <RiskScore score={Number(a.riskScore)} size="sm" showLabel={false} />
                      <Badge variant="status" status={a.status as string}>
                        {String(a.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function InvestigatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InvestigateContent />
    </Suspense>
  );
}
