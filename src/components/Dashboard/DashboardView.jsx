import React, { useState, useEffect } from 'react';
import { Bell, ChevronLeft, ChevronRight, LogOut, CheckCircle2, Clock, Dumbbell, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_VI = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const fmtDate = d => `${DAY_VI[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

const DashboardView = ({ session, coachProfile, onSelectClient, onLogout, onOpenProfile }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [daySessions, setDaySessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) =>
    new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)
  );

  // Scroll selected date into view
  useEffect(() => {
    const el = document.getElementById('date-btn-' + selectedDate.toDateString());
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [viewDate, selectedDate]);

  // Fetch sessions for selected date
  useEffect(() => {
    const fetchDaySessions = async () => {
      setLoadingSessions(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const coachEmail = session?.user?.email;

      // Get coach's clients first, then filter sessions
      const { data: clientIds } = await supabase
        .from('clients')
        .select('id, name, avatar_url, goal')
        .eq('coach_email', coachEmail);

      if (!clientIds || clientIds.length === 0) { setDaySessions([]); setLoadingSessions(false); return; }

      const ids = clientIds.map(c => c.id);
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .in('client_id', ids)
        .eq('scheduled_date', dateStr)
        .order('scheduled_time');

      // Join client info
      const clientMap = {};
      clientIds.forEach(c => { clientMap[c.id] = c; });

      setDaySessions((sessions || []).map(s => ({
        ...s,
        client: clientMap[s.client_id] || null,
      })));
      setLoadingSessions(false);
    };
    fetchDaySessions();
  }, [selectedDate, session]);

  // Mark session done
  const markDone = async (sessionId) => {
    setMarkingId(sessionId);
    await supabase.from('sessions').update({ status: 'done' }).eq('id', sessionId);
    // Refresh
    setDaySessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'done' } : s));
    setMarkingId(null);
  };

  const isToday = d => d.toDateString() === today.toDateString();
  const isSelected = d => d.toDateString() === selectedDate.toDateString();

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#1a1a1c] via-[#0d0d0d] to-[#000000]">

      {/* HEADER */}
      <div className="flex justify-between items-center px-5 pt-5 pb-3 shrink-0">
        <div onClick={onOpenProfile} className="flex items-center gap-3 cursor-pointer active:scale-95 transition-all">
          <img
            src={coachProfile?.avatar_url || 'https://i.pravatar.cc/150?u=coach'}
            className="w-10 h-10 rounded-full border border-white/10 object-cover"
            alt="avatar"
          />
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

      {/* CALENDAR STRIP */}
      <div className="px-5 mb-4 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-white">
            {MONTH_VI[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h2>
          <div className="flex gap-1.5">
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="p-1.5 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="p-1.5 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar scroll-smooth">
          {days.map(dateObj => (
            <button
              key={dateObj.toISOString()}
              id={'date-btn-' + dateObj.toDateString()}
              onClick={() => setSelectedDate(dateObj)}
              className={`flex flex-col items-center justify-center min-w-[52px] h-[72px] rounded-[18px] border transition-all shrink-0 ${
                isSelected(dateObj)
                  ? 'bg-white border-white/30 shadow-xl'
                  : isToday(dateObj)
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-white/[0.03] border-white/[0.05]'
              }`}
            >
              <span className={`text-[9px] font-black uppercase mb-1 ${isSelected(dateObj) ? 'text-black/50' : isToday(dateObj) ? 'text-blue-400' : 'text-neutral-600'}`}>
                {DAY_VI[dateObj.getDay()]}
              </span>
              <span className={`text-base font-bold ${isSelected(dateObj) ? 'text-black' : isToday(dateObj) ? 'text-blue-300' : 'text-neutral-400'}`}>
                {dateObj.getDate()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* SESSIONS FOR SELECTED DATE */}
      <div className="px-5 mb-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Lịch tập</p>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">{fmtDate(selectedDate)}</p>
        </div>
        {loadingSessions && <RefreshCw className="w-3.5 h-3.5 text-neutral-600 animate-spin" />}
        {!loadingSessions && daySessions.length > 0 && (
          <span className="text-[9px] font-black text-blue-400">{daySessions.length} buổi</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 hide-scrollbar">
        {!loadingSessions && daySessions.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-8 h-8 mx-auto mb-3 text-neutral-800" />
            <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">Không có buổi tập nào</p>
          </div>
        )}

        <div className="space-y-3">
          {daySessions.map(s => {
            const isDone = s.status === 'done';
            const clientAvatar = s.client?.avatar_url ||
              `https://api.dicebear.com/7.x/notionists/svg?seed=${s.client?.name}&backgroundColor=eceff4`;
            return (
              <div
                key={s.id}
                className={`rounded-[20px] border px-4 py-3.5 flex items-center gap-3 transition-all ${
                  isDone ? 'bg-white/[0.02] border-white/[0.04] opacity-50' : 'bg-white/[0.04] border-white/[0.08]'
                }`}
              >
                {/* Time */}
                <div className="text-center shrink-0 w-12">
                  <p className="text-white font-bold text-sm">{s.scheduled_time?.slice(0,5)}</p>
                  <p className="text-[8px] text-neutral-600 font-black uppercase">giờ</p>
                </div>

                <div className="w-px h-8 bg-white/[0.06] shrink-0" />

                {/* Client */}
                <img
                  src={clientAvatar}
                  className="w-9 h-9 rounded-full border border-white/10 bg-white shrink-0"
                  alt="avt"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.client?.name || 'Unknown'}</p>
                  <p className="text-[9px] text-neutral-600 font-black uppercase tracking-wider">
                    Buổi #{s.session_number}
                  </p>
                </div>

                {/* Action */}
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500/60 shrink-0" />
                ) : (
                  <button
                    onClick={() => markDone(s.id)}
                    disabled={markingId === s.id}
                    className="shrink-0 px-3 py-1.5 bg-white/[0.06] border border-white/[0.1] rounded-full text-[9px] font-black uppercase tracking-wider text-neutral-400 active:scale-90 transition-all disabled:opacity-50"
                  >
                    {markingId === s.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Done'}
                  </button>
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
