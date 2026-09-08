"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Cpu, BarChart3, CheckCircle, Activity } from "lucide-react";

interface ModelInfo {
  id: string;
  modelName: string;
  version: string;
  algorithm: string;
  description: string;
  datasetVersion: string;
  featureVersion: string;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  rocAuc: number | null;
  falsePositiveRate: number | null;
  confusionMatrix: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  } | null;
  featureImportance: Record<string, number> | null;
  hyperparameters: Record<string, unknown> | null;
  trainingSamples: number | null;
  testSamples: number | null;
  isActive: boolean;
  trainedAt: string;
}

function MetricBar({ label, value, max = 1, color = "cyan" }: { label: string; value: number | null; max?: number; color?: string }) {
  if (value === null) return null;
  const pct = (value / max) * 100;
  const barColor = color === "red" ? "bg-red-400" : color === "green" ? "bg-green-400" : "bg-cyan-400";
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 text-slate-400 text-xs">{label}</div>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`w-14 text-right text-sm font-bold text-${color}-400`}>
        {(value * (max === 1 ? 100 : 1)).toFixed(max === 1 ? 1 : 1)}{max === 1 ? "%" : ""}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setModels(d.data.models);
          if (d.data.models.length > 0) setSelected(d.data.models[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedModel = models.find((m) => m.id === selected);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="ML Model Management"
        subtitle="Model performance metrics and evaluation"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelected(model.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selected === model.id
                  ? "bg-cyan-500/10 border-cyan-500/30"
                  : "bg-[#0f1629] border-[#1e2d4a] hover:border-[#2d4a7a]"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Cpu className={`w-5 h-5 ${selected === model.id ? "text-cyan-400" : "text-slate-400"}`} />
                <div>
                  <div className="text-slate-200 font-semibold text-sm">{model.modelName}</div>
                  <div className="text-slate-500 text-xs">{model.version} • {model.algorithm}</div>
                </div>
                {model.isActive && (
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-xs">ACTIVE</span>
                  </div>
                )}
              </div>
              <div className="text-slate-500 text-xs">{model.description?.slice(0, 80)}...</div>
              {model.f1Score !== null && (
                <div className="mt-2 flex gap-4">
                  <div className="text-center">
                    <div className="text-cyan-400 font-bold">{(model.f1Score * 100).toFixed(1)}%</div>
                    <div className="text-slate-600 text-xs">F1</div>
                  </div>
                  {model.rocAuc !== null && (
                    <div className="text-center">
                      <div className="text-green-400 font-bold">{(model.rocAuc * 100).toFixed(1)}%</div>
                      <div className="text-slate-600 text-xs">ROC-AUC</div>
                    </div>
                  )}
                  {model.falsePositiveRate !== null && (
                    <div className="text-center">
                      <div className="text-red-400 font-bold">{(model.falsePositiveRate * 100).toFixed(1)}%</div>
                      <div className="text-slate-600 text-xs">FPR</div>
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {selectedModel && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {selectedModel.accuracy !== null && (
                    <MetricBar label="Accuracy" value={selectedModel.accuracy} color="cyan" />
                  )}
                  <MetricBar label="Precision" value={selectedModel.precision} color="blue" />
                  <MetricBar label="Recall" value={selectedModel.recall} color="green" />
                  <MetricBar label="F1-Score" value={selectedModel.f1Score} color="cyan" />
                  <MetricBar label="ROC-AUC" value={selectedModel.rocAuc} color="purple" />
                  <MetricBar label="False Positive Rate" value={selectedModel.falsePositiveRate} color="red" />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#080d1a] rounded-lg p-3 text-center">
                    <div className="text-cyan-400 text-xl font-bold">
                      {selectedModel.trainingSamples?.toLocaleString() || "N/A"}
                    </div>
                    <div className="text-slate-500 text-xs">Training Samples</div>
                  </div>
                  <div className="bg-[#080d1a] rounded-lg p-3 text-center">
                    <div className="text-green-400 text-xl font-bold">
                      {selectedModel.testSamples?.toLocaleString() || "N/A"}
                    </div>
                    <div className="text-slate-500 text-xs">Test Samples</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confusion Matrix */}
            {selectedModel.confusionMatrix && (
              <Card>
                <CardHeader>
                  <CardTitle>Confusion Matrix</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center">
                    <div className="text-slate-500 text-xs mb-4">Predicted →</div>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                      <div className="text-center">
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                          <div className="text-green-400 text-2xl font-bold">
                            {selectedModel.confusionMatrix.truePositives.toLocaleString()}
                          </div>
                          <div className="text-green-400 text-xs mt-1">True Positive</div>
                          <div className="text-slate-500 text-xs">TP</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                          <div className="text-red-400 text-2xl font-bold">
                            {selectedModel.confusionMatrix.falsePositives.toLocaleString()}
                          </div>
                          <div className="text-red-400 text-xs mt-1">False Positive</div>
                          <div className="text-slate-500 text-xs">FP</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
                          <div className="text-orange-400 text-2xl font-bold">
                            {selectedModel.confusionMatrix.falseNegatives.toLocaleString()}
                          </div>
                          <div className="text-orange-400 text-xs mt-1">False Negative</div>
                          <div className="text-slate-500 text-xs">FN</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                          <div className="text-green-400 text-2xl font-bold">
                            {selectedModel.confusionMatrix.trueNegatives.toLocaleString()}
                          </div>
                          <div className="text-green-400 text-xs mt-1">True Negative</div>
                          <div className="text-slate-500 text-xs">TN</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feature Importance */}
            {selectedModel.featureImportance && (
              <Card>
                <CardHeader>
                  <CardTitle>Feature Importance</CardTitle>
                  <span className="text-slate-500 text-xs">Top predictive features</span>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(selectedModel.featureImportance)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([feature, importance]) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="w-44 text-slate-400 text-xs truncate">
                          {feature.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                        </div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            style={{ width: `${importance * 100}%` }}
                          />
                        </div>
                        <div className="text-cyan-400 text-xs w-10 text-right">
                          {(importance * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Model Info */}
            <Card>
              <CardHeader>
                <CardTitle>Model Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Model Name", value: selectedModel.modelName },
                  { label: "Version", value: selectedModel.version },
                  { label: "Algorithm", value: selectedModel.algorithm },
                  { label: "Dataset", value: selectedModel.datasetVersion || "N/A" },
                  { label: "Feature Version", value: selectedModel.featureVersion },
                  { label: "Trained At", value: new Date(selectedModel.trainedAt).toLocaleDateString() },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#1e2d4a] last:border-0">
                    <span className="text-slate-500 text-xs">{item.label}</span>
                    <span className="text-slate-200 text-sm font-medium">{item.value}</span>
                  </div>
                ))}

                {selectedModel.hyperparameters && (
                  <div className="mt-2">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-2">Hyperparameters</div>
                    <div className="bg-[#080d1a] rounded-lg p-3 font-mono text-xs text-green-400">
                      {Object.entries(selectedModel.hyperparameters).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-cyan-400">{k}</span>: {String(v)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 p-3 bg-[#080d1a] rounded-lg">
                  <div className="text-slate-500 text-xs mb-1">Description</div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    {selectedModel.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
