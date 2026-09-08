"use client";

import { cn, getSeverityBg, getStatusBg } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "severity" | "status" | "default" | "outline";
  severity?: string;
  status?: string;
  className?: string;
}

export function Badge({ children, variant = "default", severity, status, className }: BadgeProps) {
  let baseClass = "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border";
  
  if (variant === "severity" && severity) {
    return (
      <span className={cn(baseClass, getSeverityBg(severity), className)}>
        {children}
      </span>
    );
  }
  
  if (variant === "status" && status) {
    return (
      <span className={cn(baseClass, getStatusBg(status), className)}>
        {children}
      </span>
    );
  }
  
  return (
    <span className={cn(baseClass, "bg-slate-800 text-slate-300 border-slate-700", className)}>
      {children}
    </span>
  );
}
