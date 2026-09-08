"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";
import { FileText, Plus, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium" });
  const [creating, setCreating] = useState(false);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/incidents?pageSize=50");
      const data = await res.json();
      if (data.success) setIncidents(data.data.incidents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const createIncident = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setIncidents((prev) => [data.data.incident, ...prev]);
        setShowCreate(false);
        setForm({ title: "", description: "", severity: "medium" });
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Incident Management"
        subtitle={`${incidents.filter(i => !['resolved','closed'].includes(i.status)).length} active incidents`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 text-[#080d1a] rounded-lg text-xs font-semibold hover:bg-cyan-400"
          >
            <Plus className="w-3 h-3" />
            New Incident
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Create modal */}
        {showCreate && (
          <Card className="border-cyan-500/30">
            <CardHeader>
              <CardTitle>Create New Incident</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50"
                  placeholder="Incident title..."
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm resize-none h-20 focus:outline-none focus:border-cyan-500/50"
                  placeholder="Incident description..."
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Severity *</label>
                <select
                  value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                  className="bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createIncident}
                  disabled={creating || !form.title}
                  className="px-4 py-2 bg-cyan-500 text-[#080d1a] rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Incident"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incident list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : incidents.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FileText className="w-10 h-10 mb-3 opacity-50" />
              <p>No incidents yet</p>
              <p className="text-xs mt-1">Create an incident or simulate events to auto-generate alerts</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {incidents.map((incident) => (
              <Link key={incident.id} href={`/dashboard/incidents/${incident.id}`}>
                <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-4 hover:border-[#2d4a7a] transition-all flex items-center gap-4 group">
                  <div className={`w-1 h-12 rounded-full ${
                    incident.severity === 'critical' ? 'bg-red-500' :
                    incident.severity === 'high' ? 'bg-orange-500' :
                    incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="severity" severity={incident.severity}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="status" status={incident.status}>
                        {incident.status}
                      </Badge>
                    </div>
                    <div className="text-slate-200 font-medium text-sm">{incident.title}</div>
                    {incident.description && (
                      <div className="text-slate-500 text-xs mt-0.5 truncate">{incident.description}</div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-slate-500 text-xs">{formatRelativeTime(incident.createdAt)}</div>
                    <div className="text-slate-600 text-xs">Updated {formatRelativeTime(incident.updatedAt)}</div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
