import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "text-red-400";
    case "high":
      return "text-orange-400";
    case "medium":
      return "text-yellow-400";
    case "low":
      return "text-green-400";
    default:
      return "text-slate-400";
  }
}

export function getSeverityBg(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

export function getRiskColor(score: number): string {
  if (score >= 76) return "text-red-400";
  if (score >= 51) return "text-orange-400";
  if (score >= 21) return "text-yellow-400";
  return "text-green-400";
}

export function getRiskLabel(score: number): string {
  if (score >= 76) return "CRITICAL";
  if (score >= 51) return "HIGH";
  if (score >= 21) return "MEDIUM";
  return "LOW";
}

export function getStatusBg(status: string): string {
  switch (status?.toLowerCase()) {
    case "new":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "investigating":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "confirmed":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "false_positive":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    case "resolved":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "open":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "contained":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "closed":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; pages: number; page: number } {
  const total = items.length;
  const pages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    pages,
    page,
  };
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message, success: false }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ data, success: true }, { status });
}
