"use client";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "blue" | "red" | "green" | "none";
}

export function Card({ children, className, hover, glow = "none" }: CardProps) {
  const glowClass = glow === "blue" ? "glow-blue" : glow === "red" ? "glow-red" : glow === "green" ? "glow-green" : "";
  return (
    <div
      className={cn(
        "bg-[#0f1629] border border-[#1e2d4a] rounded-xl",
        hover && "card-hover cursor-pointer",
        glowClass,
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-3 border-b border-[#1e2d4a] flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-sm font-semibold text-slate-200 tracking-wide uppercase", className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
