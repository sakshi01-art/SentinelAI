"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { RiskScore } from "@/components/ui/RiskScore";
import { formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface Alert {
  id: string;
  title: string;
  severity: string;
  riskScore: number;
  category: string;
  status: string;
  sourceIp: string | null;
  createdAt: string | Date;
  confidence: number;
}

interface AlertFeedProps {
  alerts: Alert[];
  limit?: number;
}

export function AlertFeed({ alerts, limit = 10 }: AlertFeedProps) {
  const displayed = alerts.slice(0, limit);

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
        <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No alerts detected</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1e2d4a]">
      {displayed.map((alert) => (
        <Link
          key={alert.id}
          href={`/dashboard/alerts/${alert.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors group"
        >
          {/* Severity indicator */}
          <div
            className={`w-1 h-10 rounded-full flex-shrink-0 ${
              alert.severity === "critical"
                ? "bg-red-500"
                : alert.severity === "high"
                ? "bg-orange-500"
                : alert.severity === "medium"
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="severity" severity={alert.severity}>
                {alert.severity.toUpperCase()}
              </Badge>
              <span className="text-slate-200 text-sm font-medium truncate">
                {alert.title}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono">{alert.sourceIp || "N/A"}</span>
              <span>•</span>
              <span>{alert.category?.replace(/_/g, " ").toUpperCase()}</span>
              <span>•</span>
              <span>{formatRelativeTime(alert.createdAt)}</span>
              <span>•</span>
              <span>{(alert.confidence * 100).toFixed(0)}% confidence</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <RiskScore score={alert.riskScore} size="sm" showLabel={false} />
            <Badge variant="status" status={alert.status}>
              {alert.status.replace("_", " ")}
            </Badge>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
}
