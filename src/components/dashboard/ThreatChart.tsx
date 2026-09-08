"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Color palette for charts ──────────────────────────────────────────────────
const COLORS = {
  cyan: "#00d4ff",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  purple: "#a855f7",
  pink: "#ec4899",
  blue: "#3b82f6",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: COLORS.red,
  high: COLORS.orange,
  medium: COLORS.yellow,
  low: COLORS.green,
};

const CATEGORY_COLORS: Record<string, string> = {
  brute_force: COLORS.red,
  dos_ddos: COLORS.orange,
  port_scan: COLORS.yellow,
  data_exfiltration: COLORS.purple,
  malware: COLORS.pink,
  unauthorized_access: COLORS.blue,
  lateral_movement: COLORS.cyan,
  anomaly: COLORS.green,
  normal: "#475569",
};

const tooltipStyle = {
  backgroundColor: "#0f1629",
  border: "1px solid #1e2d4a",
  borderRadius: "8px",
  color: "#e2e8f0",
};

// ─── Threat Timeline ──────────────────────────────────────────────────────────

interface TimelineData {
  bucket: string;
  events?: number;
  threats?: number;
  alerts?: number;
  avgRisk?: number | null;
}

interface ThreatTimelineProps {
  data: TimelineData[];
  type?: "events" | "threats" | "combined";
}

export function ThreatTimeline({ data, type = "combined" }: ThreatTimelineProps) {
  const formatted = data.map((d) => ({
    ...d,
    time: new Date(d.bucket).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="eventsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="threatsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.red} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
        <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10 }} />
        <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        {(type === "events" || type === "combined") && (
          <Area
            type="monotone"
            dataKey="events"
            stroke={COLORS.cyan}
            fill="url(#eventsGrad)"
            strokeWidth={2}
            dot={false}
            name="Events"
          />
        )}
        {(type === "threats" || type === "combined") && (
          <Area
            type="monotone"
            dataKey="threats"
            stroke={COLORS.red}
            fill="url(#threatsGrad)"
            strokeWidth={2}
            dot={false}
            name="Threats"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Severity Distribution ────────────────────────────────────────────────────

interface SeverityDist {
  severity: string;
  count: number | string;
}

export function SeverityPieChart({ data }: { data: SeverityDist[] }) {
  const formatted = data.map((d) => ({
    name: d.severity.toUpperCase(),
    value: Number(d.count),
    color: SEVERITY_COLORS[d.severity] || "#475569",
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [value, name]}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Category Distribution ────────────────────────────────────────────────────

interface CategoryDist {
  category: string;
  count: number | string;
}

export function CategoryBarChart({ data }: { data: CategoryDist[] }) {
  const formatted = data
    .filter((d) => d.category !== "normal")
    .map((d) => ({
      name: d.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Number(d.count),
      fill: CATEGORY_COLORS[d.category] || COLORS.cyan,
    }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="#475569"
          tick={{ fontSize: 9, fill: "#94a3b8" }}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Detection Method Radar ───────────────────────────────────────────────────

interface DetectionRadarProps {
  ruleScore: number;
  mlScore: number;
  anomalyScore: number;
  behavioralScore: number;
}

export function DetectionRadar({
  ruleScore,
  mlScore,
  anomalyScore,
  behavioralScore,
}: DetectionRadarProps) {
  const data = [
    { method: "Rules", score: ruleScore * 100 },
    { method: "ML", score: mlScore * 100 },
    { method: "Anomaly", score: anomalyScore * 100 },
    { method: "Behavioral", score: behavioralScore * 100 },
    { method: "Fusion", score: (ruleScore + mlScore + anomalyScore + behavioralScore) / 4 * 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart cx="50%" cy="50%" outerRadius={70} data={data}>
        <PolarGrid stroke="#1e2d4a" />
        <PolarAngleAxis dataKey="method" tick={{ fill: "#94a3b8", fontSize: 10 }} />
        <Radar
          name="Score"
          dataKey="score"
          stroke={COLORS.cyan}
          fill={COLORS.cyan}
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Risk Distribution Histogram ─────────────────────────────────────────────

interface RiskHistogramProps {
  data: { range: string; count: number }[];
}

export function RiskHistogram({ data }: RiskHistogramProps) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
        <XAxis dataKey="range" stroke="#475569" tick={{ fontSize: 10 }} />
        <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Events" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => {
            const label = entry.range;
            const color =
              label === "76-100" ? COLORS.red :
              label === "51-75" ? COLORS.orange :
              label === "21-50" ? COLORS.yellow :
              COLORS.green;
            return <Cell key={i} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
