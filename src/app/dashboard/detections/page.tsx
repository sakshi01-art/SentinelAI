"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskScore } from "@/components/ui/RiskScore";
import { formatRelativeTime } from "@/lib/utils";
import { Search, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function DetectionsPage() {
  const [detections, setDetections] = useState<Array<{
    detection: {
      id: string; severity: string; finalRiskScore: number; isThreat: boolean;
      threatCategory: string; confidence: number; detectionMethods: string[];
      detectedAt: string; mlScore: number; anomalyScore: number; ruleScore: number;
    };
    event: { id: string; sourceIp: string; destinationIp: string; eventType: string; timestamp: string };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState({ isThreat: "", severity: "" });

  const fetchDetections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (filter.isThreat) params.set("isThreat", filter.isThreat);
      if (filter.severity) params.set("severity", filter.severity);
      const res = await fetch(`/api/detections?${params}`);
      const data = await res.json();
      if (data.success) {
        setDetections(data.data.detections);
        setTotal(data.data.pagination.total);
        setPages(data.data.pagination.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchDetections(); }, [fetchDetections]);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Detection Results"
        subtitle={`${total} total detection records`}
        actions={
          <button onClick={fetchDetections} className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs">
            <RefreshCw className="w-3 h-3" />Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Card className="p-4">
          <div className="flex gap-3">
            <select
              value={filter.isThreat}
              onChange={e => { setFilter(f => ({ ...f, isThreat: e.target.value })); setPage(1); }}
              className="bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none"
            >
              <option value="">All Events</option>
              <option value="true">Threats Only</option>
              <option value="false">Normal Only</option>
            </select>
            <select
              value={filter.severity}
              onChange={e => { setFilter(f => ({ ...f, severity: e.target.value })); setPage(1); }}
              className="bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </Card>

        <Card>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : detections.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-500">
              <Search className="w-10 h-10 mb-3 opacity-50" />
              <p>No detections yet. Run the simulator.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e2d4a]">
                    {["Time", "Source", "Dest", "Threat?", "Category", "Risk Score", "Rule", "ML", "Anomaly", "Methods", ""].map(h => (
                      <th key={h} className="text-left text-slate-500 uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4a]">
                  {detections.map(({ detection, event }) => (
                    <tr key={detection.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{formatRelativeTime(detection.detectedAt)}</td>
                      <td className="px-4 py-2 font-mono text-slate-300">{event.sourceIp}</td>
                      <td className="px-4 py-2 font-mono text-slate-400">{event.destinationIp}</td>
                      <td className="px-4 py-2">
                        {detection.isThreat ? (
                          <span className="text-red-400 font-bold">THREAT</span>
                        ) : (
                          <span className="text-green-400">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400">
                        {detection.threatCategory?.replace(/_/g, " ") || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <RiskScore score={detection.finalRiskScore} size="sm" showLabel={false} showBar />
                      </td>
                      <td className="px-4 py-2 text-cyan-400">{detection.ruleScore?.toFixed(0)}</td>
                      <td className="px-4 py-2 text-blue-400">{(detection.mlScore || 0).toFixed(1)}%</td>
                      <td className="px-4 py-2 text-purple-400">{(detection.anomalyScore || 0).toFixed(3)}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          {((detection.detectionMethods as string[] | null) || []).slice(0, 2).map((m: string) => (
                            <span key={m} className="px-1 py-0.5 bg-slate-800 text-slate-500 rounded text-xs">{m.split("_")[0]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/dashboard/investigate?eventId=${event.id}`} className="text-slate-600 hover:text-cyan-400">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2d4a]">
              <span className="text-slate-500 text-xs">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-[#080d1a] border border-[#1e2d4a] rounded text-slate-400 disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1 text-xs bg-[#080d1a] border border-[#1e2d4a] rounded text-slate-400 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
