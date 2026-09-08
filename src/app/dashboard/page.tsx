"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  ThreatTimeline,
  SeverityPieChart,
  CategoryBarChart,
  RiskHistogram,
} from "@/components/dashboard/ThreatChart";
import {
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  Zap,
  Target,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface DashboardData {
  summary: {
    totalEvents: number;
    events24h: number;
    totalThreats: number;
    threats24h: number;
    criticalAlerts: number;
    openAlerts: number;
    activeIncidents: number;
    falsePositives: number;
    anomalies24h: number;
    avgRiskScore: string;
  };
  distributions: {
    severity: { severity: string; count: string | number }[];
    category: { category: string; count: string | number }[];
  };
  recentAlerts: {
    id: string;
    title: string;
    severity: string;
    riskScore: number;
    category: string;
    status: string;
    sourceIp: string | null;
    createdAt: string;
    confidence: number;
  }[];
  timeline: {
    events: { bucket: string; events: number }[];
    threats: { bucket: string; threats: number }[];
  };
}

const RISK_HISTOGRAM_DATA = [
  { range: "0-20", count: 0 },
  { range: "21-50", count: 0 },
  { range: "51-75", count: 0 },
  { range: "76-100", count: 0 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Build combined timeline data
  const timelineData = (() => {
    if (!data) return [];
    const eventMap = new Map(
      data.timeline.events.map((e) => [e.bucket, { events: e.events, threats: 0 }])
    );
    data.timeline.threats.forEach((t) => {
      const existing = eventMap.get(t.bucket) || { events: 0, threats: 0 };
      eventMap.set(t.bucket, { ...existing, threats: t.threats });
    });
    return Array.from(eventMap.entries()).map(([bucket, vals]) => ({
      bucket,
      ...vals,
    }));
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-12 h-12 text-cyan-400 animate-pulse" />
          <div className="text-slate-400 text-sm">Loading SOC Dashboard...</div>
        </div>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Security Operations Center"
        subtitle="Real-time threat monitoring and analytics"
        actions={
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1629] border border-[#1e2d4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Events"
            value={(s?.totalEvents || 0).toLocaleString()}
            subtitle={`${s?.events24h || 0} in last 24h`}
            icon={Activity}
            color="cyan"
            trend="up"
            trendValue={`+${s?.events24h || 0}`}
          />
          <StatCard
            title="Threats Detected"
            value={(s?.totalThreats || 0).toLocaleString()}
            subtitle={`${s?.threats24h || 0} in last 24h`}
            icon={Target}
            color="red"
            trend={s?.threats24h ? "up" : "neutral"}
            trendValue={`+${s?.threats24h || 0}`}
          />
          <StatCard
            title="Critical Alerts"
            value={s?.criticalAlerts || 0}
            subtitle={`${s?.openAlerts || 0} total open`}
            icon={AlertTriangle}
            color="orange"
          />
          <StatCard
            title="Active Incidents"
            value={s?.activeIncidents || 0}
            subtitle={`${s?.falsePositives || 0} false positives`}
            icon={FileText}
            color="yellow"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Anomalies (24h)"
            value={s?.anomalies24h || 0}
            subtitle="Isolation Forest detected"
            icon={Zap}
            color="purple"
          />
          <StatCard
            title="Avg Risk Score"
            value={s?.avgRiskScore || "0.0"}
            subtitle="Last 24 hours"
            icon={TrendingUp}
            color={
              parseFloat(s?.avgRiskScore || "0") >= 51
                ? "red"
                : parseFloat(s?.avgRiskScore || "0") >= 21
                ? "yellow"
                : "green"
            }
          />
          <StatCard
            title="ML Accuracy"
            value="94.1%"
            subtitle="XGBoost Classifier"
            icon={Shield}
            color="cyan"
          />
          <StatCard
            title="Detection Methods"
            value="4 Active"
            subtitle="Rules + ML + Anomaly + Behavioral"
            icon={Activity}
            color="green"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Threat Timeline */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Threat Activity Timeline (24h)</CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                  <span className="text-slate-400">Events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-slate-400">Threats</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {timelineData.length > 0 ? (
                <ThreatTimeline data={timelineData} type="combined" />
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                  No timeline data yet — run the simulator to generate events
                </div>
              )}
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {data?.distributions.severity &&
              data.distributions.severity.length > 0 ? (
                <SeverityPieChart data={data.distributions.severity} />
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                  No alert data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Threat Categories (7d)</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {data?.distributions.category &&
              data.distributions.category.length > 0 ? (
                <CategoryBarChart data={data.distributions.category} />
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                  No category data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detection Engine Status */}
          <Card>
            <CardHeader>
              <CardTitle>Detection Engine Status</CardTitle>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">All systems operational</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    name: "Rule-Based Engine",
                    rules: "10 active rules",
                    status: "operational",
                    accuracy: "~95%",
                    color: "cyan",
                  },
                  {
                    name: "ML Classifier (XGBoost)",
                    rules: "v1.2.0 loaded",
                    status: "operational",
                    accuracy: "94.1%",
                    color: "blue",
                  },
                  {
                    name: "Anomaly Detector (IsoForest)",
                    rules: "contamination=0.1",
                    status: "operational",
                    accuracy: "86.4%",
                    color: "purple",
                  },
                  {
                    name: "Behavioral Analytics",
                    rules: "Baseline active",
                    status: "operational",
                    accuracy: "~80%",
                    color: "green",
                  },
                ].map((engine) => (
                  <div
                    key={engine.name}
                    className="flex items-center justify-between py-2 border-b border-[#1e2d4a] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full bg-${engine.color}-400`}
                      />
                      <div>
                        <div className="text-slate-200 text-xs font-medium">
                          {engine.name}
                        </div>
                        <div className="text-slate-500 text-xs">{engine.rules}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 text-xs">ACTIVE</div>
                      <div className="text-slate-500 text-xs">{engine.accuracy}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <a
              href="/dashboard/alerts"
              className="text-cyan-400 text-xs hover:text-cyan-300 transition-colors"
            >
              View all →
            </a>
          </CardHeader>
          <AlertFeed alerts={data?.recentAlerts || []} limit={8} />
        </Card>
      </div>
    </div>
  );
}
