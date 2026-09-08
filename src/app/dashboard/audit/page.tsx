"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { Database, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  success: boolean;
  timestamp: string;
}

const ACTION_COLORS: Record<string, string> = {
  user_login: "text-green-400",
  user_logout: "text-slate-400",
  login_failed: "text-red-400",
  user_registered: "text-blue-400",
  alert_updated: "text-yellow-400",
  incident_created: "text-orange-400",
  incident_updated: "text-orange-400",
  user_created_by_admin: "text-purple-400",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?page=${page}&pageSize=50`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs);
        setTotal(data.data.pagination.total);
        setPages(data.data.pagination.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Audit Logs"
        subtitle={`${total} security-sensitive events recorded`}
        actions={
          <button onClick={fetchLogs} className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs">
            <RefreshCw className="w-3 h-3" />Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-500">
              <Database className="w-10 h-10 mb-3 opacity-50" />
              <p>No audit logs yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e2d4a]">
                    {["Timestamp", "Action", "Resource", "IP Address", "Status", "Details"].map(h => (
                      <th key={h} className="text-left text-slate-500 uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4a]">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap font-mono">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-medium ${ACTION_COLORS[log.action] || "text-slate-300"}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {log.resourceType && (
                          <span>
                            {log.resourceType}
                            {log.resourceId && (
                              <span className="text-slate-600 font-mono"> #{String(log.resourceId).slice(0, 8)}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">
                        {log.ipAddress || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.success ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-400">
                            <XCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details).slice(0, 60) : "—"}
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
