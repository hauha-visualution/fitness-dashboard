import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ChevronLeft, ChevronRight, LogOut, CheckCircle2, Dumbbell, RefreshCw, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Helpers for local dates
const toLocalISOString = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=CN
  const diff = day === 0 ? -6 : 1 - day; // T2=0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const generateAvatarBadgeColor = (name) => {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index] + '/20 text-' + colors[index].replace('bg-', '').replace('-500', '-400');
};

const DashboardView = ({ session, coachProfile, onSelectClient, onLogout, onOpenProfile }) => {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [selectedDate, setSelectedDate] = useState(today);
  
  const [stats, setStats] = useState({ monthly: 0, streak: 0, todayTotal: 0 });
  const [allWeekSessions, setAllWeekSessions] = useState({}); // { 'YYYY-MM-DD': [sessions] }
  const [loading, setLoading] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const coachEmail = session?.user?.email;
    if (!coachEmail) return;

    // 1. Get clients
    const { data: clientsRows } = await supabase.from('clients').select('id, name, avatar_url, goal').eq('coach_email', coachEmail);
    if (!clientsRows || clientsRows.length === 0) {
      setAllWeekSessions({});
      setStats({ monthly: 0, streak: 0, todayTotal: 0 });
      setLoading(false);
      return;
    }
    const clientIds = clientsRows.map(c => c.id);
    const clientMap = {};
    clientsRows.forEach(c => { clientMap[c.id] = c; });

    // 2. Fetch completed sessions for stats ( streak & monthly )
    const { data: allDone } = await supabase
      .from('sessions')
      .select('scheduled_date')
      .in('client_id', clientIds)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false });

    // Build stats
    const todayStr = toLocalISOString(today);
    const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthlyCount = (allDone || []).filter(s => s.scheduled_date.startsWith(currentMonthPrefix)).length;

    // Streak logic
    const uniqueDatesDesc = [...new Set((allDone || []).map(s => s.scheduled_date))];
    let streakCount = 0;
    let checkDate = new Date();
    let dStr = toLocalISOString(checkDate);
    
    // If no session today, check if yesterday exists
    if (!uniqueDatesDesc.includes(dStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      dStr = toLocalISOString(checkDate);
    }
    while (uniqueDatesDesc.includes(dStr)) {
      streakCount++;
      checkDate.setDate(checkDate.getDate() - 1);
      dStr = toLocalISOString(checkDate);
    }

    // 3. Fetch week sessions
    const fromStr = toLocalISOString(weekDays[0]);
    const toStr = toLocalISOString(weekDays[6]);
    const { data: wSessions } = await supabase
      .from('sessions')
      .select('*')
      .in('client_id', clientIds)
      .gte('scheduled_date', fromStr)
      .lte('scheduled_date', toStr)
      .order('scheduled_time');

    const grouped = {};
    let todayTotal = 0;
    (wSessions || []).forEach(s => {
      const key = s.scheduled_date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...s, client: clientMap[s.client_id] });
      if (key === todayStr) todayTotal++;
    });

    setStats({ monthly: monthlyCount, streak: streakCount, todayTotal });
    setAllWeekSessions(grouped);
    setLoading(false);
  }, [session, weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helpers
  const isToday = d => d.toDateString() === today.toDateString();
  const isSelected = d => d.toDateString() === selectedDate.toDateString();
  const hasSessions = d => !!(allWeekSessions[toLocalISOString(d)]?.length);

  const selectedKey = toLocalISOString(selectedDate);
  const selectedSessions = allWeekSessions[selectedKey] || [];

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#1a1a1c] via-[#0d0d0d] to-[#000000] overflow-hidden">

      {/* 1. HEADER */}
      <div className="flex justify-between items-center px-5 pt-5 pb-4 shrink-0">
        <div onClick={onOpenProfile} className="flex items-center gap-3 cursor-pointer active:scale-95 transition-all">
          {coachProfile?.avatar_url ? (
            <img src={coachProfile.avatar_url} className="w-10 h-10 rounded-full border border-white/10 object-cover" alt="avatar" />
          ) : (
            <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center font-bold text-white">
              {coachProfile?.full_name?.charAt(0) || session?.user?.email?.charAt(0).toUpperCase() || 'C'}
            </div>
          )}
          <div>
            <p className="text-neutral-600 text-[8px] font-black uppercase tracking-widest">Aesthetics Hub</p>
            <h1 className="text-base font-semibold text-white leading-tight">
              {coachProfile?.full_name || session?.user?.user_metadata?.username || 'Coach'}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 bg-white/5 border border-white/10 rounded-full text-white active:scale-90 transition-all">
            <Bell className="w-4 h-4" />
          </button>
          <button onClick={onLogout} className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 active:scale-90 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. STATS STRIP */}
      <div className="px-5 mb-5 shrink-0">
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-[16px] p-4 flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Buổi/tháng</p>
            <p className="text-3xl font-light text-blue-400">{stats.monthly}</p>
          </div>
          <div className="w-px h-10 bg-white/[0.05]"></div>
          <div className="text-center flex-1">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Streak</p>
            <p className="text-3xl font-light text-yellow-500">{stats.streak}</p>
          </div>
          <div className="w-px h-10 bg-white/[0.05]"></div>
          <div className="text-center flex-1">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Hôm nay</p>
            <p className="text-3xl font-light text-white">{stats.todayTotal}</p>
          </div>
        </div>
      </div>

      {/* 3. CALENDAR 7-DAY STRIP */}
      <div className="px-5 mb-4 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-white">
            Tháng {weekDays[0].getMonth() + 1}
          </h2>
          <div className="flex gap-1.5">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1.5 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={() => { setWeekStart(getWeekStart(today)); setSelectedDate(today); }} className="px-3 py-1 bg-white/[0.05] rounded-full text-[10px] font-black text-neutral-400 uppercase tracking-wider hover:bg-white/10 transition-colors">
              Hôm nay
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1.5 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d, i) => (
            <button
              key={i}
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center py-2.5 rounded-[14px] transition-all ${
                isSelected(d) ? 'bg-white' : isToday(d) ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-white/[0.03] border border-white/[0.05]'
              }`}
            >
              <span className={`text-[8px] font-black uppercase ${isSelected(d) ? 'text-black/40' : isToday(d) ? 'text-blue-400' : 'text-neutral-600'}`}>
                {DAY_VI[d.getDay()]}
              </span>
              <span className={`text-sm font-bold mt-0.5 ${isSelected(d) ? 'text-black' : isToday(d) ? 'text-blue-300' : 'text-neutral-400'}`}>
                {d.getDate()}
              </span>
              <div className={`w-1 h-1 rounded-full mt-1 transition-all ${hasSessions(d) ? isSelected(d) ? 'bg-black/40' : 'bg-blue-400' : 'bg-transparent'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* 4. SESSIONS LIST */}
      <div className="px-5 mb-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Danh sách buổi tập</p>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">{DAY_VI[selectedDate.getDay()]} {String(selectedDate.getDate()).padStart(2,'0')}/{String(selectedDate.getMonth()+1).padStart(2,'0')}</p>
        </div>
        {loading && <RefreshCw className="w-3.5 h-3.5 text-neutral-600 animate-spin" />}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 hide-scrollbar">
        {!loading && selectedSessions.length === 0 && (
          <div className="text-center py-12 animate-slide-up">
            <Dumbbell className="w-8 h-8 mx-auto mb-3 text-neutral-800" />
            <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">Trống lịch</p>
          </div>
        )}

        <div className="space-y-3">
          {selectedSessions.map(s => {
            const isCompleted = s.status === 'completed';
            const isCancelled = s.status === 'cancelled';
            const isInProgress = s.status === 'in_progress';
            
            const initials = s.client?.name?.substring(0,2).toUpperCase() || 'NA';
            const colorClass = generateAvatarBadgeColor(s.client?.name || 'A');

            return (
              <div
                key={s.id}
                className={`rounded-[20px] border px-4 py-3.5 flex items-center gap-3 transition-all animate-slide-up ${
                  isCompleted ? 'bg-white/[0.02] border-white/[0.04] opacity-50' : 
                  isCancelled ? 'bg-red-500/5 border-red-500/10 opacity-70' :
                  isInProgress ? 'bg-white/[0.06] border-white/20' : 'bg-white/[0.03] border-white/[0.05]'
                }`}
              >
                {/* Time */}
                <div className="text-center shrink-0 w-12">
                  <p className={`font-bold text-sm ${isCancelled ? 'text-red-400 line-through' : 'text-white'}`}>{s.scheduled_time?.slice(0,5)}</p>
                  <p className="text-[8px] text-neutral-600 font-black uppercase">giờ</p>
                </div>

                <div className="w-px h-8 bg-white/[0.06] shrink-0" />

                {/* Avatar Initials */}
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${colorClass}`}>
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isCancelled ? 'text-red-300' : 'text-white'}`}>{s.client?.name || 'Unknown'}</p>
                  <p className="text-[9px] text-neutral-600 font-black uppercase tracking-wider">
                    Buổi #{s.session_number}
                  </p>
                </div>

                {/* Status Badges */}
                {isCompleted && (
                  <div className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </div>
                )}
                {isCancelled && (
                  <div className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full uppercase shrink-0 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Hủy
                  </div>
                )}
                {isInProgress && (
                  <div className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full uppercase shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Lưu tạm
                  </div>
                )}
                {(!isCompleted && !isCancelled && !isInProgress) && (
                  <div className="text-[9px] font-black text-neutral-500 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full uppercase shrink-0">
                    Chưa tập
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
