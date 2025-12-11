import React, { useState } from 'react';
import { BrainCircuit, Zap, Eye, Database, AlertOctagon } from 'lucide-react';

function AIInsightsPanel({ predictions }) {
  const [anomalyResults, setAnomalyResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const detectAnomalies = async () => {
    if (predictions.length === 0) return;

    setIsAnalyzing(true);
    try {
      const predictionData = predictions.map(p => ({
        predicted_class: p.predicted_class,
        confidence: p.confidence,
        timestamp: p.timestamp
      }));

      const response = await fetch('http://localhost:8000/api/anomaly/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions: predictionData, threshold: 0.7 }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnomalyResults(data);
      }
    } catch (error) {
      console.error('Error detecting anomalies:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const features = [
    { icon: Eye, title: "Feature Importance", desc: "Visual analysis of key indicators driving model decisions" },
    { icon: Zap, title: "Confidence Scoring", desc: "Real-time uncertainty estimation per prediction" },
    { icon: BrainCircuit, title: "Neural Explanations", desc: "Natural language reasoning for detected events" },
    { icon: Database, title: "Pattern Memory", desc: "Historical context matching for better accuracy" }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Capabilities</h1>
        <p className="text-slate-400">Explainable AI (XAI) and Anomaly Detection Engine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div key={idx} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertOctagon size={20} className="text-purple-500" />
              Anomaly Detection Engine
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Identify irregular patterns and outliers in the data stream
            </p>
          </div>
          <button 
            onClick={detectAnomalies}
            disabled={isAnalyzing || predictions.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isAnalyzing ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap size={18} />
            )}
            {isAnalyzing ? 'Scanning...' : 'Run Analysis'}
          </button>
        </div>

        <div className="p-6">
          {anomalyResults ? (
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-4 rounded-xl bg-slate-800 border border-slate-700">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Risk Level</div>
                  <div className={`text-2xl font-bold ${
                    anomalyResults.risk_level === 'Critical' ? 'text-red-500' :
                    anomalyResults.risk_level === 'High' ? 'text-red-500' : 
                    anomalyResults.risk_level === 'Medium' ? 'text-orange-500' : 'text-green-500'
                  }`}>
                    {anomalyResults.risk_level}
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-700" />
                <div>
                  <div className="text-sm text-slate-400 mb-1">Anomalies Found</div>
                  <div className="text-2xl font-bold text-white">{anomalyResults.total_anomalies}</div>
                </div>
              </div>

              {anomalyResults.anomalies.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {anomalyResults.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-white">{anomaly.type}</span>
                        <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {anomaly.severity}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-slate-400">
                        <div className="flex justify-between">
                          <span>Class:</span>
                          <span className="text-slate-300">{anomaly.class}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confidence:</span>
                          <span className="text-slate-300">{(anomaly.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700/50">
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                <BrainCircuit size={32} className="opacity-20" />
              </div>
              <p>Run analysis to detect behavioral anomalies</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIInsightsPanel;
