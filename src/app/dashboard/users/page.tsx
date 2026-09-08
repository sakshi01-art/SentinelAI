"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";
import { Users, Plus } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  loginAttempts: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "analyst" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => { if (d.success) setUsers(d.data.users); })
      .finally(() => setLoading(false));
  }, []);

  const createUser = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => [data.data.user, ...prev]);
        setShowCreate(false);
        setForm({ username: "", email: "", password: "", role: "analyst" });
      } else {
        setError(data.error || "Creation failed");
      }
    } finally {
      setCreating(false);
    }
  };

  const roleColor: Record<string, string> = {
    admin: "text-red-400 bg-red-400/10 border-red-400/20",
    analyst: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    viewer: "text-green-400 bg-green-400/10 border-green-400/20",
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="User Management"
        subtitle={`${users.length} users`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 text-[#080d1a] rounded-lg text-xs font-semibold hover:bg-cyan-400"
          >
            <Plus className="w-3 h-3" />New User
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {showCreate && (
          <Card className="border-cyan-500/30">
            <CardHeader><CardTitle>Create User</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {error && <div className="text-red-400 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Username</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={createUser} disabled={creating} className="px-4 py-2 bg-cyan-500 text-[#080d1a] rounded-lg text-sm font-semibold disabled:opacity-50">
                  {creating ? "Creating..." : "Create User"}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Cancel</button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2d4a]">
                    {["User", "Email", "Role", "Status", "Last Login", "Login Attempts"].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2d4a]">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-800/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
                            <span className="text-cyan-400 text-sm font-bold">{user.username[0].toUpperCase()}</span>
                          </div>
                          <span className="text-slate-200 font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border text-xs font-medium ${roleColor[user.role] || ""}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 ${user.isActive ? "text-green-400" : "text-red-400"}`}>
                          <div className={`w-2 h-2 rounded-full ${user.isActive ? "bg-green-400" : "bg-red-400"}`} />
                          {user.isActive ? "Active" : "Disabled"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={user.loginAttempts > 3 ? "text-red-400" : "text-slate-400"}>
                          {user.loginAttempts}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
