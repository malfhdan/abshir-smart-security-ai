import React from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  History, 
  AlertTriangle, 
  BarChart2, 
  BrainCircuit, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

function Sidebar({ activeView, setActiveView, isOpen }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Real-time Monitoring', icon: Camera },
    { id: 'predictions', label: 'Predictions', icon: History },
    { id: 'alerts', label: 'Alerts & Warnings', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'ai-insights', label: 'AI Insights', icon: BrainCircuit },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? 280 : 80 }}
      className="bg-[#1e293b] border-r border-slate-700 h-screen sticky top-0 left-0 z-40 flex flex-col shadow-xl"
    >
      <div className="p-6 flex items-center gap-3 border-b border-slate-700 h-20">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
          <ShieldCheck className="text-white w-6 h-6" />
        </div>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col"
          >
            <h1 className="font-bold text-lg text-white leading-tight">SecurityAI</h1>
            <span className="text-xs text-slate-400 font-medium tracking-wide">ENTERPRISE</span>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
              title={!isOpen ? item.label : ''}
            >
              <Icon 
                size={20} 
                className={`flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'group-hover:text-white'}`} 
              />
              
              {isOpen && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              
              {isActive && isOpen && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute right-0 w-1 h-8 bg-white rounded-l-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className={`rounded-xl bg-slate-800/50 p-4 border border-slate-700 ${!isOpen && 'hidden'}`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">System Operational</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            v2.4.0-stable
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
