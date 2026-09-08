"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime, formatBytes } from "@/lib/utils";
import { Activity, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

interface NetworkEvent {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  sourcePort: number | null;
  destinationPort: number | null;
  protocol: string | null;
  eventType: string;
  bytesSent: number | null;
  bytesReceived: number | null;
  packetCount: number | null;
  authFailureCount: number;
  isProcessed: boolean;
  source: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [eventType, setEventType] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "30",
        ...(eventType && { eventType }),
      });
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.events);
        setTotal(data.data.pagination.total);
        setPages(data.data.pagination.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, eventType]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchEvents]);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Event Stream"
        subtitle={`${total.toLocaleString()} total network events`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                autoRefresh
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-[#0f1629] border-[#1e2d4a] text-slate-400"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
              {autoRefresh ? "Live" : "Auto-refresh"}
            </button>
            <button onClick={fetchEvents} className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs">
              <RefreshCw className="w-3 h-3" />Refresh
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <select
              value={eventType}
              onChange={e => { setEventType(e.target.value); setPage(1); }}
              className="bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none"
            >
              <option value="">All Event Types</option>
              <option value="network_flow">Network Flow</option>
              <option value="auth_event">Auth Event</option>
              <option value="dns_query">DNS Query</option>
              <option value="http_request">HTTP Request</option>
              <option value="system_call">System Call</option>
            </select>
          </div>
        </Card>

        {/* Events Table */}
        <Card>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Activity className="w-10 h-10 mb-3 opacity-50" />
              <p>No events yet</p>
              <p className="text-xs mt-1">Use the Simulator to generate security events</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1e2d4a]">
                    {["Time", "Type", "Source IP", "Dest IP", "Port", "Proto", "Bytes↑", "Bytes↓", "Auth Fails", "Source", "Status", ""].map(h => (
                      <th key={h} className="text-left text-slate-500 uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4a]">
                  {events.map(event => (
                    <tr key={event.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(event.timestamp)}
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">
                          {event.eventType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-300">{event.sourceIp}</td>
                      <td className="px-4 py-2 font-mono text-slate-400">{event.destinationIp}</td>
                      <td className="px-4 py-2 font-mono text-slate-500">{event.destinationPort || "—"}</td>
                      <td className="px-4 py-2 text-slate-500">{event.protocol || "—"}</td>
                      <td className="px-4 py-2 text-cyan-400">{formatBytes(event.bytesSent)}</td>
                      <td className="px-4 py-2 text-blue-400">{formatBytes(event.bytesReceived)}</td>
                      <td className="px-4 py-2">
                        {event.authFailureCount > 0 ? (
                          <span className="text-red-400 font-bold">{event.authFailureCount}</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          event.source === 'simulator' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {event.source}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {event.isProcessed ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-yellow-400">⏳</span>
                        )}
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
              <span className="text-slate-500 text-xs">Page {page} of {pages} ({total} total)</span>
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
