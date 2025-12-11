import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Shield, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AlertsPanel({ alerts, setAlerts }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const fetchRecommendations = async () => {
    if (alerts.length === 0) return;

    setIsLoadingRecommendations(true);
    try {
      const response = await fetch('http://localhost:8000/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alerts: alerts,
          context: {
            location: 'Field Site',
            timestamp: new Date().toISOString(),
            risk_level: alerts.some(a => a.severity === 'High') ? 'High' : 'Medium'
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    if (alerts.length > 0) {
      fetchRecommendations();
    }
  }, [alerts.length]);

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    if (selectedAlert?.id === alertId) setSelectedAlert(null);
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'High':
      case 'Critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Medium':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts & Incidents</h1>
          <p className="text-slate-400">Active threats and AI-driven response strategies</p>
        </div>
        
        <button 
          onClick={fetchRecommendations}
          disabled={isLoadingRecommendations || alerts.length === 0}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-700"
        >
          <RefreshCw size={18} className={isLoadingRecommendations ? 'animate-spin' : ''} />
          Refresh Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Alerts List */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-slate-400" />
              Active Alerts ({alerts.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            <AnimatePresence>
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-lg font-medium text-slate-300">All Systems Normal</p>
                  <p>No active security alerts detected</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedAlert(alert)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedAlert?.id === alert.id
                        ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className={
                          alert.severity === 'High' ? 'text-red-500' : 'text-orange-500'
                        } />
                        <span className="font-bold text-white">{alert.type}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{alert.message}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                        className="text-slate-500 hover:text-white transition-colors p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-blue-400" />
              AI Incident Response
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {recommendations ? (
              <div className="space-y-6">
                {/* Risk Assessment */}
                <div className={`p-4 rounded-xl border ${
                  recommendations.risk_assessment === 'Critical'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : recommendations.risk_assessment === 'High'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : recommendations.risk_assessment === 'Medium'
                    ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                    : 'bg-green-500/10 border-green-500/20 text-green-400'
                }`}>
                  <div className="text-sm uppercase tracking-wide opacity-70 font-semibold mb-1">Current Risk Assessment</div>
                  <div className="text-2xl font-bold">{recommendations.risk_assessment}</div>
                </div>

                {/* Structured Recommendations */}
                {typeof recommendations.recommendations === 'object' && recommendations.recommendations.immediateActions ? (
                  <div className="space-y-5">
                    {/* Immediate Actions */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-red-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <h3 className="text-base font-bold text-white">Immediate Actions</h3>
                      </div>
                      <p className="text-sm text-slate-300 mb-3 font-medium">
                        {recommendations.recommendations.immediateActions.summary}
                      </p>
                      <div className="space-y-2">
                        {recommendations.recommendations.immediateActions.details?.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-red-400 mt-1">•</span>
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resource Allocation */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <h3 className="text-base font-bold text-white">Resource Allocation</h3>
                      </div>
                      <p className="text-sm text-slate-300 mb-3 font-medium">
                        {recommendations.recommendations.resourceAllocation.summary}
                      </p>
                      <div className="space-y-2">
                        {recommendations.recommendations.resourceAllocation.details?.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Priority Ranking */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <h3 className="text-base font-bold text-white">Priority Ranking of Alerts</h3>
                      </div>
                      <p className="text-sm text-slate-300 mb-3 font-medium">
                        {recommendations.recommendations.priorityRanking.summary}
                      </p>
                      <div className="space-y-2">
                        {recommendations.recommendations.priorityRanking.details?.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-orange-400 mt-1">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preventive Measures */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h3 className="text-base font-bold text-white">Preventive Measures</h3>
                      </div>
                      <p className="text-sm text-slate-300 mb-3 font-medium">
                        {recommendations.recommendations.preventiveMeasures.summary}
                      </p>
                      <div className="space-y-2">
                        {recommendations.recommendations.preventiveMeasures.details?.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-emerald-400 mt-1">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Coordination Steps */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <h3 className="text-base font-bold text-white">Coordination Steps for Field Teams</h3>
                      </div>
                      <p className="text-sm text-slate-300 mb-3 font-medium">
                        {recommendations.recommendations.coordinationSteps.summary}
                      </p>
                      <div className="space-y-2">
                        {recommendations.recommendations.coordinationSteps.details?.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-purple-400 mt-1">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Strategic Analysis</h3>
                    <div className="text-slate-300 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700 whitespace-pre-line">
                      {typeof recommendations.recommendations === 'string' 
                        ? recommendations.recommendations 
                        : 'Recommendations format not recognized'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Shield size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select alerts to generate AI response strategies</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertsPanel;
