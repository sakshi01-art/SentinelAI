"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "cyan" | "red" | "orange" | "yellow" | "green" | "purple";
  className?: string;
}

const colorMap = {
  cyan: {
    icon: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    value: "text-cyan-400",
  },
  red: {
    icon: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    value: "text-red-400",
  },
  orange: {
    icon: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    value: "text-orange-400",
  },
  yellow: {
    icon: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
    value: "text-yellow-400",
  },
  green: {
    icon: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    value: "text-green-400",
  },
  purple: {
    icon: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    value: "text-purple-400",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "cyan",
  className,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "bg-[#0f1629] border rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 hover:border-opacity-50",
        colors.border,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
          {title}
        </span>
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <Icon className={cn("w-4 h-4", colors.icon)} />
        </div>
      </div>

      <div>
        <div className={cn("text-3xl font-bold", colors.value)}>{value}</div>
        {subtitle && (
          <div className="text-slate-500 text-xs mt-0.5">{subtitle}</div>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-xs">
          {trend === "up" ? (
            <TrendingUp className="w-3 h-3 text-red-400" />
          ) : trend === "down" ? (
            <TrendingDown className="w-3 h-3 text-green-400" />
          ) : (
            <Minus className="w-3 h-3 text-slate-400" />
          )}
          <span
            className={cn(
              trend === "up"
                ? "text-red-400"
                : trend === "down"
                ? "text-green-400"
                : "text-slate-400"
            )}
          >
            {trendValue}
          </span>
          <span className="text-slate-500">vs. last period</span>
        </div>
      )}
    </div>
  );
}
