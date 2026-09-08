"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { ChevronLeft, Clock, MessageSquare, Send } from "lucide-react";

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<{
    incident: Record<string, unknown>;
    notes: Array<{ id: string; content: string; noteType: string; createdAt: string }>;
    alerts: Array<{ id: string; title: string; severity: string; riskScore: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchData = () => {
    fetch(`/api/incidents/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData(d.data);
          setStatus((d.data.incident.status as string) || "");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [params.id]);

  const update = async () => {
    setUpdating(true);
    try {
      await fetch(`/api/incidents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || undefined }),
      });
      setNote("");
      fetchData();
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="p-6 text-red-400">Incident not found</div>;

  const incident = data.incident as {
    id: string; title: string; description: string | null;
    severity: string; status: string; createdAt: string;
    timeline: Array<Record<string, string>> | null;
  };
  const { notes, alerts } = data;
  const timeline = incident.timeline || [];

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={`Incident: ${String(incident.id).slice(0, 8)}...`}
        subtitle={String(incident.title)}
        actions={
          <button onClick={() => router.back()} className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs">
            <ChevronLeft className="w-3 h-3" />Back
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Main details */}
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="severity" severity={String(incident.severity)}>
                    {String(incident.severity).toUpperCase()}
                  </Badge>
                  <Badge variant="status" status={String(incident.status)}>
                    {String(incident.status)}
                  </Badge>
                  <span className="text-slate-500 text-xs">{formatDate(String(incident.createdAt))}</span>
                </div>
                <h2 className="text-slate-100 text-xl font-semibold mb-2">{String(incident.title)}</h2>
                {incident.description && (
                  <p className="text-slate-400 text-sm">{incident.description as string}</p>
                )}
              </CardContent>
            </Card>

            {/* Related Alerts */}
            {alerts.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Related Alerts ({alerts.length})</CardTitle></CardHeader>
                <div className="divide-y divide-[#1e2d4a]">
                  {alerts.map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                      <Badge variant="severity" severity={a.severity}>{a.severity}</Badge>
                      <span className="text-slate-200 text-sm flex-1">{a.title}</span>
                      <span className="text-slate-400 text-xs">{a.riskScore.toFixed(0)}/100</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Investigation Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Investigation Notes ({notes.length})</CardTitle>
                <MessageSquare className="w-4 h-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {notes.length === 0 ? (
                    <div className="text-slate-500 text-sm text-center py-4">No notes yet</div>
                  ) : (
                    notes.map(n => (
                      <div key={n.id} className="bg-[#080d1a] rounded-lg p-3">
                        <div className="text-slate-500 text-xs mb-1">{formatRelativeTime(n.createdAt)}</div>
                        <div className="text-slate-300 text-sm">{n.content}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="flex-1 bg-[#080d1a] border border-[#1e2d4a] rounded-lg p-3 text-slate-300 text-sm resize-none h-16 focus:outline-none focus:border-cyan-500/50"
                    placeholder="Add investigation note..."
                  />
                  <button
                    onClick={update}
                    disabled={updating || (!note && status === incident.status)}
                    className="px-3 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status update */}
            <Card>
              <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
              <CardContent>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none mb-3"
                >
                  {["open", "investigating", "contained", "resolved", "closed"].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={update}
                  disabled={updating}
                  className="w-full py-2 bg-cyan-500 text-[#080d1a] rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {updating ? "Updating..." : "Update"}
                </button>
              </CardContent>
            </Card>

            {/* Timeline */}
            {timeline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                  <Clock className="w-4 h-4 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {timeline.slice().reverse().map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1" />
                          {i < timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-[#1e2d4a] mt-1" />
                          )}
                        </div>
                        <div className="pb-3">
                          <div className="text-slate-400 text-xs">{entry.description}</div>
                          <div className="text-slate-600 text-xs">{entry.actor}</div>
                          <div className="text-slate-700 text-xs">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
