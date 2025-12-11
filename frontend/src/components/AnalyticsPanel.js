import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { BarChart2, TrendingUp, Activity, Search } from 'lucide-react';

function AnalyticsPanel({ historicalData }) {
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (historicalData && historicalData.length > 0) {
      analyzePatterns();
    }
  }, [historicalData]);

  const analyzePatterns = async () => {
    if (!historicalData || historicalData.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/analyze/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: historicalData }),
      });

      if (response.ok) {
        const data = await response.json();
        setPatternAnalysis(data);
      }
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data - use historicalData as source of truth
  // Filter to only use confirmed predictions (>= 90%)
  const allData = historicalData || [];
  const dataSource = allData.filter(p => {
    const confidence = p.confidence || 0;
    const shouldCount = p.should_count !== undefined ? p.should_count : confidence >= 0.9;
    return shouldCount;
  });
  
  const classDistribution = dataSource.length > 0 ? Object.entries(
    dataSource.reduce((acc, curr) => {
      const className = curr.predicted_class || 'Unknown';
      acc[className] = (acc[className] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })) : [];

  const timeDistribution = Array(24).fill(0).map((_, i) => ({
    hour: `${i}:00`,
    count: dataSource.filter(d => d.timestamp && new Date(d.timestamp).getHours() === i).length
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-slate-400">Deep dive into security metrics and trends</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
          <div className="flex justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <Activity size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{dataSource.length}</div>
          <div className="text-sm text-slate-400">Total Scans</div>
        </div>
        
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
          <div className="flex justify-between mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {dataSource.filter(d => d.predicted_class !== 'NormalVideos').length}
          </div>
          <div className="text-sm text-slate-400">Threat Detections</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 min-h-[400px]">
          <h2 className="text-lg font-bold text-white mb-6">Event Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={classDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {classDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {classDistribution.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 min-h-[400px]">
          <h2 className="text-lg font-bold text-white mb-6">Activity by Hour</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="hour" stroke="#94a3b8" axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#334155', opacity: 0.2 }}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {patternAnalysis && (
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
              <Search size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">AI Pattern Recognition</h2>
          </div>
          
          {typeof patternAnalysis.pattern_analysis === 'object' && patternAnalysis.pattern_analysis.patternsAndTrends ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Patterns and Trends */}
              <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="text-base font-bold text-white">Identified Patterns & Trends</h3>
                </div>
                <p className="text-sm text-slate-300 mb-3 font-medium">
                  {patternAnalysis.pattern_analysis.patternsAndTrends.summary}
                </p>
                <div className="space-y-2">
                  {patternAnalysis.pattern_analysis.patternsAndTrends.details?.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* High-Risk Periods */}
              <div className="bg-slate-800/50 p-5 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <h3 className="text-base font-bold text-white">Predicted High-Risk Time Periods</h3>
                </div>
                <p className="text-sm text-slate-300 mb-3 font-medium">
                  {patternAnalysis.pattern_analysis.highRiskPeriods.summary}
                </p>
                <div className="space-y-2">
                  {patternAnalysis.pattern_analysis.highRiskPeriods.details?.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-red-400 mt-1">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preventive Measures */}
              <div className="bg-slate-800/50 p-5 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-base font-bold text-white">Recommended Preventive Measures</h3>
                </div>
                <p className="text-sm text-slate-300 mb-3 font-medium">
                  {patternAnalysis.pattern_analysis.preventiveMeasures.summary}
                </p>
                <div className="space-y-2">
                  {patternAnalysis.pattern_analysis.preventiveMeasures.details?.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monitoring Areas */}
              <div className="bg-slate-800/50 p-5 rounded-xl border border-orange-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <h3 className="text-base font-bold text-white">Areas Requiring Increased Monitoring</h3>
                </div>
                <p className="text-sm text-slate-300 mb-3 font-medium">
                  {patternAnalysis.pattern_analysis.monitoringAreas.summary}
                </p>
                <div className="space-y-2">
                  {patternAnalysis.pattern_analysis.monitoringAreas.details?.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Recommendations - Full Width */}
              <div className="lg:col-span-2 bg-slate-800/50 p-5 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="text-base font-bold text-white">Long-Term Strategic Recommendations</h3>
                </div>
                <p className="text-sm text-slate-300 mb-3 font-medium">
                  {patternAnalysis.pattern_analysis.strategicRecommendations.summary}
                </p>
                <div className="space-y-2">
                  {patternAnalysis.pattern_analysis.strategicRecommendations.details?.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-slate-300 leading-relaxed whitespace-pre-line">
              {typeof patternAnalysis.pattern_analysis === 'string' 
                ? patternAnalysis.pattern_analysis 
                : 'Analysis data format not recognized'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalyticsPanel;
