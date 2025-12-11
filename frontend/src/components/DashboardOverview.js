import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Eye, 
  Server, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Users,
  Camera,
  BarChart3,
  Cpu,
  HardDrive,
  Network,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const performanceData = [
  { metric: 'CPU', value: 45, status: 'good' },
  { metric: 'Memory', value: 62, status: 'good' },
  { metric: 'Network', value: 38, status: 'good' },
  { metric: 'Storage', value: 28, status: 'good' },
];

// Generate real-time activity data from predictions
function generateActivityData(predictions, startTime) {
  const now = new Date();
  
  // Always show last 24 hours (or since app started if less than 24 hours)
  const hoursToShow = 24;
  const hourlyData = [];
  
  // Create 24 hourly buckets
  for (let i = hoursToShow - 1; i >= 0; i--) {
    const hour = (now.getHours() - i + 24) % 24;
    const timeLabel = `${String(hour).padStart(2, '0')}:00`;
    hourlyData.push({ time: timeLabel, events: 0, threats: 0 });
  }
  
  // Count events and threats by hour (only count predictions from current session)
  predictions.forEach(pred => {
    if (pred.timestamp) {
      const predTime = new Date(pred.timestamp);
      const hour = predTime.getHours();
      const timeLabel = `${String(hour).padStart(2, '0')}:00`;
      
      const dataPoint = hourlyData.find(d => d.time === timeLabel);
      if (dataPoint) {
        dataPoint.events++;
        if (pred.predicted_class !== 'NormalVideos') {
          dataPoint.threats++;
        }
      }
    }
  });
  
  return hourlyData;
}

// Generate threat distribution from actual predictions
function generateThreatDistribution(predictions) {
  if (!predictions || predictions.length === 0) {
    // Return 100% Normal if no predictions
    return [{ name: 'Normal', value: 100, color: '#10b981' }];
  }
  
  const distribution = {};
  let total = 0;
  
  predictions.forEach(pred => {
    const className = pred.predicted_class || 'Normal';
    distribution[className] = (distribution[className] || 0) + 1;
    total++;
  });
  
  // Convert to percentage and create array
  const colors = {
    'NormalVideos': '#10b981',
    'Normal': '#10b981',
    'Assault': '#ef4444',
    'Burglary': '#f59e0b',
    'Fighting': '#f97316',
    'Shooting': '#dc2626',
    'Explosion': '#f97316',
    'Abuse': '#f59e0b',
    'Shoplifting': '#eab308',
    'Stealing': '#f59e0b',
  };
  
  const result = Object.entries(distribution)
    .map(([name, count]) => ({
      name: name === 'NormalVideos' ? 'Normal' : name,
      value: Math.round((count / total) * 100),
      color: colors[name] || '#64748b'
    }))
    .sort((a, b) => b.value - a.value);
  
  return result;
}

function StatCard({ title, value, icon: Icon, trend, trendValue, color, subtitle }) {
  const bgColors = {
    blue: 'bg-blue-500/10 text-blue-500',
    red: 'bg-red-500/10 text-red-500',
    green: 'bg-emerald-500/10 text-emerald-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
  };

  const isPositive = trendValue && !trendValue.startsWith('-');

  return (
    <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 hover:border-slate-600 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
            isPositive 
              ? 'text-emerald-500 bg-emerald-500/10' 
              : 'text-red-500 bg-red-500/10'
          }`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function PerformanceBar({ metric, value, status }) {
  const statusColors = {
    good: 'bg-emerald-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{metric}</span>
        <span className={`font-medium ${
          status === 'good' ? 'text-emerald-400' : 
          status === 'warning' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {value}%
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${statusColors[status]} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function DashboardOverview({ stats, alerts, predictions, historicalData }) {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appStartTime] = useState(() => new Date()); // Track when app started
  const [potentialCount, setPotentialCount] = useState(0);

  // Load potential predictions count
  useEffect(() => {
    const savedPotential = localStorage.getItem('potentialPredictions');
    if (savedPotential) {
      try {
        const potential = JSON.parse(savedPotential);
        setPotentialCount(potential.length);
      } catch (e) {
        console.error('Error loading potential predictions:', e);
      }
    }
  }, []);

  // Use historicalData as the source of truth for consistency across pages
  const dataSource = (historicalData && historicalData.length > 0) ? historicalData : predictions;

  // Filter to only count confirmed predictions (>= 90% confidence)
  const confirmedPredictions = dataSource.filter(p => {
    const confidence = p.confidence || 0;
    const shouldCount = p.should_count !== undefined ? p.should_count : confidence >= 0.9;
    return shouldCount;
  });

  const highRiskAlerts = alerts.filter(a => a.severity === 'High' || a.severity === 'Critical').length;
  const crimeDetections = confirmedPredictions.filter(p => p.predicted_class !== 'NormalVideos').length;
  const totalScans = confirmedPredictions.length;
  const detectionRate = totalScans > 0 ? ((crimeDetections / totalScans) * 100).toFixed(1) : 0;

  // Generate real-time activity data using only confirmed predictions
  const activityData = generateActivityData(confirmedPredictions, appStartTime);
  
  // Generate threat distribution from confirmed predictions only
  const threatDistribution = generateThreatDistribution(confirmedPredictions);

  const recentActivity = [
    ...alerts.slice(0, 3).map(a => ({ type: 'alert', data: a, time: a.timestamp })),
    ...confirmedPredictions.slice(0, 3).map(p => ({ type: 'prediction', data: p, time: p.timestamp }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Security Operations Dashboard</h1>
          <p className="text-slate-400">Real-time monitoring and threat intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-sm text-emerald-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Operational
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Alerts" 
          value={alerts.length} 
          icon={ShieldAlert} 
          color="red"
          subtitle={highRiskAlerts > 0 ? `${highRiskAlerts} high priority` : "No active alerts"}
        />
        <StatCard 
          title="Threat Detections" 
          value={crimeDetections} 
          icon={Activity} 
          color="purple"
          subtitle={totalScans > 0 ? `${detectionRate}% detection rate` : "No scans yet"}
        />
        <StatCard 
          title="Total Scans" 
          value={totalScans} 
          icon={Eye} 
          color="blue"
          subtitle={totalScans > 0 ? `Confirmed (${potentialCount} potential)` : "Waiting for input"}
        />
        <StatCard 
          title="System Status" 
          value={stats?.model_loaded ? "Online" : "Offline"} 
          icon={Server} 
          color="green"
          subtitle={stats?.model_loaded ? "All systems normal" : "Model not loaded"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Trends Chart */}
        <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Activity Trends</h2>
              <p className="text-sm text-slate-400">Events and threats over time</p>
            </div>
            <select className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 transition-colors">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="events" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEvents)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="threats" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorThreats)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-slate-400">Total Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-slate-400">Threats Detected</span>
            </div>
          </div>
        </div>

        {/* Threat Distribution */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-6">Threat Distribution</h2>
          <div className="h-[200px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {threatDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {threatDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="text-slate-400 font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row - Recent Activity, Performance, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Recent Activity</h2>
            <Clock size={18} className="text-slate-400" />
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {recentActivity.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Activity size={32} className="mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    item.type === 'alert' 
                      ? 'bg-red-500' 
                      : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-white">
                        {item.type === 'alert' ? item.data.type : item.data.predicted_class}
                      </span>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                        {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {item.type === 'alert' ? item.data.message : `Confidence: ${(item.data.confidence * 100).toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Performance */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">System Performance</h2>
            <Cpu size={18} className="text-slate-400" />
          </div>
          <div className="space-y-4">
            {performanceData.map((item, idx) => (
              <PerformanceBar 
                key={idx}
                metric={item.metric}
                value={item.value}
                status={item.status}
              />
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Last Updated</span>
              <span className="text-slate-300 font-mono text-xs">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl transition-colors group">
                <Camera size={20} className="text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-slate-300">Live Feed</span>
              </button>
              <button className="p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-colors group">
                <BarChart3 size={20} className="text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-slate-300">Analytics</span>
              </button>
              <button className="p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-xl transition-colors group">
                <Zap size={20} className="text-orange-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-slate-300">AI Analysis</span>
              </button>
              <button className="p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-colors group">
                <Users size={20} className="text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-slate-300">Team</span>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-4">Active Alerts</h2>
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  <CheckCircle2 size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">All clear</p>
                </div>
              ) : (
                alerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="flex items-center gap-2 p-2 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <AlertTriangle size={14} className={
                      alert.severity === 'High' ? 'text-red-500' : 'text-orange-500'
                    } />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{alert.type}</p>
                      <p className="text-xs text-slate-500 truncate">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {alerts.length > 3 && (
              <button className="w-full mt-3 py-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                View All ({alerts.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;
