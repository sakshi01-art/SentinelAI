"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertTriangle,
  Activity,
  Cpu,
  Network,
} from "lucide-react";

const FEATURES = [
  { icon: Shield, label: "Hybrid Detection Engine", desc: "Rules + ML + Anomaly + Behavioral" },
  { icon: Cpu, label: "XGBoost ML Classifier", desc: "94.1% accuracy on CIC-IDS2017" },
  { icon: Activity, label: "Real-time SOC Dashboard", desc: "WebSocket-powered live feed" },
  { icon: Network, label: "Event Correlation", desc: "Multi-event incident grouping" },
  { icon: AlertTriangle, label: "Explainable AI", desc: "SHAP-based decision explanations" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@sentinelai.com");
  const [password, setPassword] = useState("SentinelAI@2024");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize system on first load
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/init", { method: "POST" });
        if (res.ok) setInitialized(true);
      } catch {}
    };
    init();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex matrix-bg">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-[#1e2d4a]">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="relative">
              <Shield className="w-10 h-10 text-cyan-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="text-cyan-400 font-bold text-2xl tracking-wider">SENTINELAI</div>
              <div className="text-slate-500 text-xs tracking-widest">
                INTELLIGENT INTRUSION DETECTION PLATFORM
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-slate-200 text-3xl font-light mb-3">
              Next-Generation
              <br />
              <span className="text-cyan-400 font-bold">Security Operations</span>
              <br />
              Platform
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              AI-powered intrusion detection combining rule-based, supervised ML,
              anomaly detection, and behavioral analytics for comprehensive threat coverage.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-4 group">
                <div className="w-8 h-8 bg-cyan-400/10 border border-cyan-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-slate-200 text-sm font-medium">{f.label}</div>
                  <div className="text-slate-500 text-xs">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threat metrics ticker */}
        <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider mb-3">
            Detection Capabilities
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "ML Accuracy", value: "94.1%" },
              { label: "False Positive Rate", value: "4.2%" },
              { label: "Detection Methods", value: "4" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className="text-cyan-400 font-bold text-lg">{m.value}</div>
                <div className="text-slate-500 text-xs">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-cyan-400 font-bold text-xl tracking-wider">SENTINELAI</span>
          </div>

          <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-2xl p-8">
            <div className="mb-8">
              <h2 className="text-slate-200 text-2xl font-semibold mb-1">
                Secure Access
              </h2>
              <p className="text-slate-500 text-sm">
                Authenticate to access the Security Operations Center
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg pl-10 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-sm"
                    placeholder="analyst@sentinelai.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#080d1a] border border-[#1e2d4a] rounded-lg pl-10 pr-12 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 text-[#080d1a] disabled:text-slate-500 font-semibold py-3 rounded-lg transition-colors duration-150 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Access SOC Platform
                  </>
                )}
              </button>
            </form>

            {/* Default credentials */}
            <div className="mt-6 pt-6 border-t border-[#1e2d4a]">
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-3">
                Demo Credentials
              </div>
              <div className="space-y-2">
                {[
                  { role: "Admin", email: "admin@sentinelai.com", password: "SentinelAI@2024", color: "text-red-400" },
                  { role: "Analyst", email: "analyst@sentinelai.com", password: "Analyst@2024", color: "text-yellow-400" },
                  { role: "Viewer", email: "viewer@sentinelai.com", password: "Viewer@2024", color: "text-green-400" },
                ].map((cred) => (
                  <button
                    key={cred.role}
                    onClick={() => {
                      setEmail(cred.email);
                      setPassword(cred.password);
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 bg-[#080d1a] border border-[#1e2d4a] rounded-lg hover:border-[#2d4a7a] transition-colors"
                  >
                    <span className={`text-xs font-semibold ${cred.color} w-12`}>
                      {cred.role}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">{cred.email}</span>
                  </button>
                ))}
              </div>
            </div>

            {initialized && (
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-green-400 text-xs">System initialized successfully</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
