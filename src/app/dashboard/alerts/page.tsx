"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskScore } from "@/components/ui/RiskScore";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, ChevronRight, Filter, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

interface Alert {
  id: string;
  title: string;
  severity: string;
  riskScore: number;
  category: string;
  status: string;
  sourceIp: string | null;
  destinationIp: string | null;
  createdAt: string;
  confidence: number;
  explanation: string | null;
  detectionMethods: string[] | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "25",
        ...(severity && { severity }),
        ...(status && { status }),
      });
      const res = await fetch(`/api/alerts?${params}`);
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data.alerts);
        setTotal(data.data.pagination.total);
        setPages(data.data.pagination.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, severity, status]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filtered = search
    ? alerts.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          (a.sourceIp || "").includes(search) ||
          a.category.includes(search)
      )
    : alerts;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Alert Management"
        subtitle={`${total} total alerts`}
        actions={
          <button
            onClick={fetchAlerts}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts..."
                className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg pl-9 pr-4 py-2 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="confirmed">Confirmed</option>
              <option value="false_positive">False Positive</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </Card>

        {/* Alerts Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <AlertTriangle className="w-10 h-10 mb-3 opacity-50" />
              <p>No alerts found</p>
              <p className="text-xs mt-1">Run the simulator to generate events and alerts</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e2d4a]">
                    {["Severity", "Alert", "Source", "Category", "Risk", "Methods", "Status", "Time", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4a]">
                  {filtered.map((alert) => (
                    <tr
                      key={alert.id}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Badge variant="severity" severity={alert.severity}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-slate-200 text-sm font-medium truncate">
                          {alert.title}
                        </div>
                        {alert.explanation && (
                          <div className="text-slate-500 text-xs truncate max-w-xs">
                            {alert.explanation.slice(0, 80)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300 text-xs font-mono">
                          {alert.sourceIp || "N/A"}
                        </div>
                        {alert.destinationIp && (
                          <div className="text-slate-500 text-xs font-mono">
                            → {alert.destinationIp}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-400 text-xs">
                          {alert.category?.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RiskScore
                          score={alert.riskScore}
                          size="sm"
                          showBar
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(alert.detectionMethods as string[] | null)?.slice(0, 2).map((m: string) => (
                            <span
                              key={m}
                              className="text-xs px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded"
                            >
                              {m.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" status={alert.status}>
                          {alert.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatRelativeTime(alert.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/alerts/${alert.id}`}
                          className="text-slate-600 hover:text-cyan-400 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2d4a]">
              <span className="text-slate-500 text-xs">
                Page {page} of {pages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs bg-[#080d1a] border border-[#1e2d4a] rounded text-slate-400 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="px-3 py-1 text-xs bg-[#080d1a] border border-[#1e2d4a] rounded text-slate-400 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
