"use client";
import { getRiskColor, getRiskLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface RiskScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showBar?: boolean;
  showLabel?: boolean;
}

export function RiskScore({ score, size = "md", showBar = false, showLabel = true }: RiskScoreProps) {
  const color = getRiskColor(score);
  const label = getRiskLabel(score);
  
  const sizeClasses = {
    sm: "text-sm font-bold",
    md: "text-lg font-bold",
    lg: "text-3xl font-bold",
  };

  const barColor =
    score >= 76 ? "bg-red-500" :
    score >= 51 ? "bg-orange-500" :
    score >= 21 ? "bg-yellow-500" :
    "bg-green-500";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-1">
        <span className={cn(sizeClasses[size], color)}>{Math.round(score)}</span>
        <span className="text-slate-500 text-xs">/100</span>
        {showLabel && (
          <span className={cn("text-xs ml-1", color)}>{label}</span>
        )}
      </div>
      {showBar && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full risk-bar", barColor)}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function RiskGauge({ score }: { score: number }) {
  const rotation = (score / 100) * 180 - 90;
  const color = 
    score >= 76 ? "#ef4444" :
    score >= 51 ? "#f97316" :
    score >= 21 ? "#eab308" :
    "#22c55e";

  return (
    <div className="relative w-24 h-12 mx-auto">
      <div className="w-24 h-12 rounded-t-full border-4 border-slate-700 overflow-hidden">
        <div className="risk-gradient h-full opacity-30 rounded-t-full" />
      </div>
      <div
        className="absolute bottom-0 left-1/2 w-0.5 h-10 origin-bottom rounded"
        style={{
          backgroundColor: color,
          transform: `translateX(-50%) rotate(${rotation}deg)`,
          transition: "transform 1s ease",
        }}
      />
      <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-slate-600 rounded-full -translate-x-1/2 translate-y-1/2" />
    </div>
  );
}
