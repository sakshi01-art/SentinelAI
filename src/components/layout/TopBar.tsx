"use client";

import { useState, useEffect } from "react";
import { Bell, RefreshCw, Clock } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-14 border-b border-[#1e2d4a] bg-[#080d1a]/80 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-slate-200 font-semibold text-base">{title}</h1>
        {subtitle && (
          <p className="text-slate-500 text-xs">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        
        {/* Live Clock */}
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-400">
            {time.toLocaleTimeString("en-US", { hour12: false })}
          </span>
          <span className="text-slate-600">
            {time.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
          </span>
        </div>

        {/* Threat Level */}
        <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          <span className="text-orange-400 text-xs font-medium">THREAT LEVEL: ELEVATED</span>
        </div>
      </div>
    </div>
  );
}
