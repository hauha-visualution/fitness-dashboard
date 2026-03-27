import React, { useState, useEffect } from 'react';
import { Bell, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

const DashboardView = ({ session, onSelectClient, onLogout, onOpenProfile }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    const elId = 'date-btn-' + selectedDate.toDateString();
    const el = document.getElementById(elId);
    if (el) { el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
  }, [viewDate, selectedDate]);

  const nextMonth = () => { setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1))); };
  const prevMonth = () => { setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1))); };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000]">
      
      {/* 1. HEADER DASHBOARD - Cập nhật để mở Profile */}
      <div className="flex justify-between items-center p-6 shrink-0">
        <div 
          onClick={onOpenProfile} 
          className="flex items-center gap-4 cursor-pointer active:scale-95 transition-all group"
        >
          <div className="relative">
            <img 
              src={session?.avatar_url || "https://i.pravatar.cc/150?u=coach"} 
              className="w-12 h-12 rounded-full border border-white/10 grayscale-[20%] object-cover" 
              alt="avatar" 
            />
            <div className="absolute inset-0 rounded-full border border-white/0 group-hover:border-white/20 transition-all"></div>
          </div>
          <div>
            <p className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">Aesthetics Hub</p>
            <h1 className="text-xl font-medium text-white tracking-tight">
              {session?.full_name || 'Coach Hạo'}
            </h1>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="p-3 bg-white/5 border border-white/10 rounded-full text-white shadow-lg active:scale-90 transition-all">
            <Bell className="w-5 h-5" />
          </button>
          <button 
            onClick={onLogout} 
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 shadow-lg active:scale-90 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. CALENDAR SECTION */}
      <div className="px-6 mb-8 shrink-0">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-light text-white tracking-tight">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white"/>
            </button>
            <button onClick={nextMonth} className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors">
              <ChevronRight className="w-4 h-4 text-white"/>
            </button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth">
          {days.map(dateObj => {
            const isSelected = dateObj.toDateString() === selectedDate.toDateString();
            return (
              <button 
                key={dateObj.toISOString()} 
                id={'date-btn-' + dateObj.toDateString()} 
                onClick={() => setSelectedDate(dateObj)} 
                className={`flex flex-col items-center justify-center min-w-[58px] h-[84px] rounded-[22px] border transition-all shrink-0 ${isSelected ? 'bg-black border-white/20 shadow-2xl scale-100' : 'bg-white/[0.03] border-white/[0.05] text-neutral-600'}`}
              >
                <span className="text-[10px] font-bold uppercase mb-1">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-lg font-semibold">{dateObj.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. WORK TIMELINE */}
      <div className="px-6 mb-4 flex justify-between items-end shrink-0">
        <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Work Timeline</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
          <span className="text-[9px] font-black text-neutral-400 uppercase">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 hide-scrollbar">
        <div className="relative border-l border-white/5 ml-[54px] pl-6 space-y-8">
          <div className="text-center text-neutral-500 text-[10px] uppercase font-black tracking-widest mt-10">
            No sessions scheduled
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardView;