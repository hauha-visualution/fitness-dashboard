import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Dumbbell, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// Get Monday of the week containing `date`
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Mon=0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const toDateStr = d => d.toISOString().split('T')[0];

const CalendarView = ({ session }) => {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [allSessions, setAllSessions] = useState({}); // { 'YYYY-MM-DD': [sessions] }
  const [loading, setLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Load week sessions
  useEffect(() => {
    const fetchWeek = async () => {
      setLoading(true);
      const coachEmail = session?.user?.email;
      const from = toDateStr(weekStart);
      const to = toDateStr(addDays(weekStart, 6));

      const { data: clientRows } = await supabase
        .from('clients')
        .select('id, name, avatar_url')
        .eq('coach_email', coachEmail);

      if (!clientRows?.length) { setAllSessions({}); setLoading(false); return; }

      const ids = clientRows.map(c => c.id);
      const clientMap = {};
      clientRows.forEach(c => { clientMap[c.id] = c; });

      const { data: rows } = await supabase
        .from('sessions')
        .select('*')
        .in('client_id', ids)
        .gte('scheduled_date', from)
        .lte('scheduled_date', to)
        .order('scheduled_time');

      const grouped = {};
      (rows || []).forEach(s => {
        const key = s.scheduled_date;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ ...s, client: clientMap[s.client_id] });
      });
      setAllSessions(grouped);
      setLoading(false);
    };
    fetchWeek();
  }, [weekStart, session]);

  const markDone = async (sessionId) => {
    setMarkingId(sessionId);
    await supabase.from('sessions').update({ status: 'done' }).eq('id', sessionId);
    setAllSessions(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = next[k].map(s => s.id === sessionId ? { ...s, status: 'done' } : s);
      });
      return next;
    });
    setMarkingId(null);
  };

  const isToday = d => d.toDateString() === today.toDateString();
  const isSelected = d => d.toDateString() === selectedDate.toDateString();
  const selectedKey = toDateStr(selectedDate);
  const selectedSessions = allSessions[selectedKey] || [];

  // Dot indicator: has sessions on that day?
  const hasSessions = d => !!(allSessions[toDateStr(d)]?.length);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#1a1a1c] via-[#0d0d0d] to-[#000000]">

      {/* HEADER */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Lịch tập</p>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">
            {weekDays[0].getDate()}/{weekDays[0].getMonth()+1} –{' '}
            {weekDays[6].getDate()}/{weekDays[6].getMonth()+1}/{weekDays[6].getFullYear()}
          </h1>
          <div className="flex gap-1.5">
            <button
              onClick={() => { setWeekStart(addDays(weekStart, -7)); }}
              className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => { setWeekStart(getWeekStart(today)); setSelectedDate(today); }}
              className="px-3 py-1 bg-white/[0.05] rounded-full text-[10px] font-black text-neutral-400 uppercase tracking-wider hover:bg-white/10 transition-colors"
            >
              Hôm nay
            </button>
            <button
              onClick={() => { setWeekStart(addDays(weekStart, 7)); }}
              className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* WEEK ROW */}
      <div className="px-5 mb-4 shrink-0">
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d, i) => (
            <button
              key={i}
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center py-2.5 rounded-[14px] transition-all ${
                isSelected(d)
                  ? 'bg-white'
                  : isToday(d)
                  ? 'bg-blue-500/15 border border-blue-500/30'
                  : 'bg-white/[0.03] border border-white/[0.05]'
              }`}
            >
              <span className={`text-[8px] font-black uppercase ${isSelected(d) ? 'text-black/40' : isToday(d) ? 'text-blue-400' : 'text-neutral-600'}`}>
                {DAY_VI[d.getDay()]}
              </span>
              <span className={`text-sm font-bold mt-0.5 ${isSelected(d) ? 'text-black' : isToday(d) ? 'text-blue-300' : 'text-neutral-400'}`}>
                {d.getDate()}
              </span>
              {/* dot if has sessions */}
              <div className={`w-1 h-1 rounded-full mt-1 transition-all ${
                hasSessions(d)
                  ? isSelected(d) ? 'bg-black/40' : 'bg-blue-400'
                  : 'bg-transparent'
              }`} />
            </button>
          ))}
        </div>
      </div>

      {/* SESSIONS LIST */}
      <div className="px-5 mb-2 shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-white">
            {DAY_FULL[selectedDate.getDay()]}, {selectedDate.getDate()}/{selectedDate.getMonth()+1}
          </p>
          {!loading && (
            <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest mt-0.5">
              {selectedSessions.length > 0 ? `${selectedSessions.length} buổi tập` : 'Không có buổi nào'}
            </p>
          )}
        </div>
        {loading && <RefreshCw className="w-3.5 h-3.5 text-neutral-600 animate-spin" />}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 hide-scrollbar">
        {!loading && selectedSessions.length === 0 && (
          <div className="text-center py-16">
            <Dumbbell className="w-8 h-8 mx-auto mb-3 text-neutral-800" />
            <p className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">Ngày rảnh</p>
          </div>
        )}

        <div className="space-y-2.5">
          {selectedSessions.map(s => {
            const isDone = s.status === 'done';
            const avatar = s.client?.avatar_url ||
              `https://api.dicebear.com/7.x/notionists/svg?seed=${s.client?.name}&backgroundColor=eceff4`;
            return (
              <div
                key={s.id}
                className={`rounded-[18px] border px-4 py-3 flex items-center gap-3 transition-all ${
                  isDone ? 'bg-white/[0.02] border-white/[0.04] opacity-50' : 'bg-white/[0.04] border-white/[0.08]'
                }`}
              >
                {/* Time */}
                <div className="w-10 shrink-0 text-center">
                  <p className="text-white font-bold text-sm leading-tight">{s.scheduled_time?.slice(0,5)}</p>
                  {s.end_time && <p className="text-neutral-700 text-[9px]">{s.end_time.slice(0,5)}</p>}
                </div>

                <div className="w-px h-7 bg-white/[0.07] shrink-0" />

                <img src={avatar} className="w-8 h-8 rounded-full border border-white/10 bg-white shrink-0" alt="" />

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.client?.name || '—'}</p>
                  <p className="text-[9px] text-neutral-600 font-black uppercase tracking-wider">Buổi #{s.session_number}</p>
                </div>

                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500/60 shrink-0" />
                ) : (
                  <button
                    onClick={() => markDone(s.id)}
                    disabled={markingId === s.id}
                    className="shrink-0 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-400 active:scale-90 transition-all disabled:opacity-50"
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

export default CalendarView;
