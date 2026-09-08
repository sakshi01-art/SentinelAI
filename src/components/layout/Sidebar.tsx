"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  Database,
  Cpu,
  Eye,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Terminal,
  BarChart3,
  Search,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number | null;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "SOC Dashboard", icon: Shield },
  { href: "/dashboard/events", label: "Event Stream", icon: Activity },
  { href: "/dashboard/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/dashboard/incidents", label: "Incidents", icon: FileText },
  { href: "/dashboard/detections", label: "Detections", icon: Search },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/investigate", label: "Investigate", icon: Eye },
  { href: "/dashboard/models", label: "ML Models", icon: Cpu },
  { href: "/dashboard/simulator", label: "Simulator", icon: Terminal },
  { href: "/dashboard/users", label: "User Management", icon: Users, roles: ["admin"] },
  { href: "/dashboard/audit", label: "Audit Logs", icon: Database, roles: ["admin"] },
];

interface SidebarProps {
  user?: { username: string; email: string; role: string } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const filteredItems = navItems.filter(
    (item) =>
      !item.roles || !user || item.roles.includes(user.role) || user.role === "admin"
  );

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-[#080d1a] border-r border-[#1e2d4a] transition-all duration-300 relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-[#1e2d4a]">
        <div className="relative flex-shrink-0">
          <Shield className="w-8 h-8 text-cyan-400" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-cyan-400 font-bold text-lg tracking-wider">SENTINEL</div>
            <div className="text-slate-500 text-xs -mt-1 tracking-widest">AI</div>
          </div>
        )}
      </div>

      {/* Status indicator */}
      {!collapsed && (
        <div className="mx-3 my-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-medium">SYSTEM OPERATIONAL</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-150 group",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-cyan-400" : "group-hover:text-slate-200"
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      {user && (
        <div className="border-t border-[#1e2d4a] p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 text-sm font-bold">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-sm font-medium truncate">
                  {user.username}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-wide">
                  {user.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center text-slate-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#1e2d4a] border border-[#2d4a7a] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
