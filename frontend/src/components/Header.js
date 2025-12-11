import React from 'react';
import { Menu, Bell, Search, User, ChevronDown } from 'lucide-react';

function Header({ toggleSidebar, alertCount, setActiveView }) {
  return (
    <header className="h-20 bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-700 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        
        <div className="hidden md:flex items-center bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700 w-64 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all">
          <Search size={18} className="text-slate-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search events, logs..." 
            className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setActiveView('alerts')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors relative cursor-pointer"
          >
            <Bell size={20} />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#1e293b] animate-pulse" />
            )}
          </button>
        </div>

        <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block" />

        <button className="flex items-center gap-3 hover:bg-slate-700/30 p-1.5 pr-3 rounded-xl transition-all group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            IN
          </div>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium text-slate-200 group-hover:text-white">Ibrahim Nasser</span>
            <span className="text-xs text-slate-500">Security Admin</span>
          </div>
          <ChevronDown size={16} className="text-slate-500 group-hover:text-white transition-colors" />
        </button>
      </div>
    </header>
  );
}

export default Header;
