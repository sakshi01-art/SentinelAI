"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RiskScore } from "@/components/ui/RiskScore";
import { Terminal, Play, Zap, Activity } from "lucide-react";

interface SimResult {
  eventId: string;
  sourceIp: string;
  destinationIp: string;
  isThreat: boolean;
  riskScore: number;
  severity: string;
  alertId: string | null;
}

interface SimResponse {
  generated: number;
  scenario: string;
  threatsDetected: number;
  alertsCreated: number;
  results: SimResult[];
}

const SCENARIOS = [
  { value: "mixed", label: "Mixed (Realistic)", desc: "70% normal, 30% attack traffic", color: "cyan" },
  { value: "brute_force", label: "Brute Force Attack", desc: "SSH/RDP credential stuffing", color: "red" },
  { value: "port_scan", label: "Port Scan", desc: "TCP SYN scan activity", color: "yellow" },
  { value: "dos_ddos", label: "DoS/DDoS", desc: "Volumetric attack simulation", color: "red" },
  { value: "data_exfiltration", label: "Data Exfiltration", desc: "Large outbound transfers", color: "purple" },
  { value: "lateral_movement", label: "Lateral Movement", desc: "Internal network pivoting", color: "orange" },
  { value: "malware_c2", label: "Malware C2", desc: "Command & control beaconing", color: "red" },
  { value: "normal", label: "Normal Traffic", desc: "Baseline network activity", color: "green" },
];

export default function SimulatorPage() {
  const [scenario, setScenario] = useState("mixed");
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const runSimulation = async () => {
    setLoading(true);
    setResult(null);
    const newLog: string[] = [];
    
    newLog.push(`[${new Date().toLocaleTimeString()}] Initiating simulation: ${scenario} × ${count} events`);
    newLog.push(`[${new Date().toLocaleTimeString()}] Generating synthetic events using Box-Muller transform...`);
    setLog([...newLog]);

    try {
      const res = await fetch("/api/events/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, count }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        newLog.push(`[${new Date().toLocaleTimeString()}] Events generated: ${data.data.generated}`);
        newLog.push(`[${new Date().toLocaleTimeString()}] Running rule engine (${10} rules)...`);
        newLog.push(`[${new Date().toLocaleTimeString()}] Running XGBoost ML classifier...`);
        newLog.push(`[${new Date().toLocaleTimeString()}] Running Isolation Forest anomaly detector...`);
        newLog.push(`[${new Date().toLocaleTimeString()}] Performing detection fusion (weighted aggregation)...`);
        newLog.push(`[${new Date().toLocaleTimeString()}] ✓ Threats detected: ${data.data.threatsDetected}/${data.data.generated}`);
        newLog.push(`[${new Date().toLocaleTimeString()}] ✓ Alerts created: ${data.data.alertsCreated}`);
        newLog.push(`[${new Date().toLocaleTimeString()}] Simulation complete.`);
      } else {
        newLog.push(`[${new Date().toLocaleTimeString()}] ✗ Error: ${data.error}`);
      }
    } catch (err) {
      newLog.push(`[${new Date().toLocaleTimeString()}] ✗ Network error: ${err}`);
    } finally {
      setLog([...newLog]);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Security Event Simulator"
        subtitle="Generate synthetic security events for testing and demonstration"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-yellow-400 font-medium text-sm">Defensive Simulation Only</div>
            <div className="text-yellow-400/70 text-xs mt-0.5">
              This simulator generates synthetic data using statistical distributions. No real attacks,
              network traffic, or harmful payloads are produced. Safe for testing and demonstration.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Configuration */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Simulation Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                    Event Count
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value))}
                      className="flex-1 accent-cyan-400"
                    />
                    <span className="text-cyan-400 font-bold w-8 text-center">{count}</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                    Scenario
                  </label>
                  <div className="space-y-2">
                    {SCENARIOS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setScenario(s.value)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                          scenario === s.value
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                            : "bg-[#080d1a] border-[#1e2d4a] text-slate-400 hover:border-[#2d4a7a]"
                        }`}
                      >
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-xs opacity-70">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={runSimulation}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 text-[#080d1a] disabled:text-slate-500 font-semibold py-3 rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Simulation
                    </>
                  )}
                </button>
              </CardContent>
            </Card>

            {/* Results Summary */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle>Simulation Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#080d1a] rounded-lg p-3 text-center">
                      <div className="text-cyan-400 text-2xl font-bold">{result.generated}</div>
                      <div className="text-slate-500 text-xs">Events Generated</div>
                    </div>
                    <div className="bg-[#080d1a] rounded-lg p-3 text-center">
                      <div className="text-red-400 text-2xl font-bold">{result.threatsDetected}</div>
                      <div className="text-slate-500 text-xs">Threats Detected</div>
                    </div>
                    <div className="bg-[#080d1a] rounded-lg p-3 text-center">
                      <div className="text-orange-400 text-2xl font-bold">{result.alertsCreated}</div>
                      <div className="text-slate-500 text-xs">Alerts Created</div>
                    </div>
                    <div className="bg-[#080d1a] rounded-lg p-3 text-center">
                      <div className="text-green-400 text-2xl font-bold">
                        {result.generated - result.threatsDetected}
                      </div>
                      <div className="text-slate-500 text-xs">Normal Traffic</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Terminal log + Results */}
          <div className="xl:col-span-2 space-y-4">
            {/* Terminal */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Pipeline Log</CardTitle>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-xs">LIVE</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-[#030609] rounded-b-xl p-4 font-mono text-xs text-green-400 min-h-48 max-h-64 overflow-y-auto scanline relative">
                  {log.length === 0 ? (
                    <div className="text-slate-600">
                      {">"} SentinelAI Detection Pipeline v1.0<br />
                      {">"} Select scenario and run simulation...<br />
                      {">"} _
                    </div>
                  ) : (
                    log.map((line, i) => (
                      <div key={i} className={line.includes("✓") ? "text-green-400" : line.includes("✗") ? "text-red-400" : "text-green-600"}>
                        {line}
                      </div>
                    ))
                  )}
                  {loading && (
                    <div className="text-cyan-400 animate-pulse">{">"} Processing...</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Event Results */}
            {result && result.results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Event Analysis Results</CardTitle>
                  <Activity className="w-4 h-4 text-cyan-400" />
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1e2d4a]">
                        {["Event ID", "Source IP", "Destination", "Threat?", "Risk Score", "Severity", "Alert"].map(h => (
                          <th key={h} className="text-left text-slate-500 uppercase tracking-wider px-4 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2d4a]">
                      {result.results.slice(0, 30).map((r) => (
                        <tr key={r.eventId} className="hover:bg-slate-800/20">
                          <td className="px-4 py-2 font-mono text-slate-500">
                            {r.eventId.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-300">{r.sourceIp}</td>
                          <td className="px-4 py-2 font-mono text-slate-400">{r.destinationIp}</td>
                          <td className="px-4 py-2">
                            {r.isThreat ? (
                              <span className="text-red-400 font-semibold">YES</span>
                            ) : (
                              <span className="text-green-400">NO</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <RiskScore score={r.riskScore} size="sm" showLabel={false} showBar />
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant="severity" severity={r.severity}>
                              {r.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            {r.alertId ? (
                              <a
                                href={`/dashboard/alerts/${r.alertId}`}
                                className="text-cyan-400 hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
