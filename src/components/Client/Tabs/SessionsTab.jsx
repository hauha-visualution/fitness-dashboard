import React, { useState, useEffect, useCallback } from 'react';
import { Dumbbell, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// ─── Helpers ─────────────────────────────────────────────────
const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const formatSessionDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = DAY_VI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return { dayLabel: day, full: `${dd}/${mm}/${yyyy}`, short: `${dd}/${mm}` };
};

const localDateStr = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const isToday = (dateStr) => {
  return dateStr === localDateStr(new Date());
};

const isPast = (dateStr) => {
  return dateStr < localDateStr(new Date());
};

// ─── SessionsTab ─────────────────────────────────────────────
const SessionsTab = ({ clientId, readOnly = false }) => {
  const [packages, setPackages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPkg, setExpandedPkg] = useState('active'); // default expand active
  const [markingId, setMarkingId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);

    const [{ data: pkgs }, { data: sess }] = await Promise.all([
      supabase.from('packages').select('id, package_number, total_sessions, status').eq('client_id', clientId).order('package_number'),
      supabase.from('sessions').select('*').eq('client_id', clientId).order('scheduled_date').order('scheduled_time'),
    ]);

    setPackages(pkgs ?? []);
    setSessions(sess ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Mark session as completed
  const markDone = async (sessionId) => {
    setMarkingId(sessionId);
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (!error) {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'completed', completed_at: new Date().toISOString() } : s));
      // Check if this was the last session → auto-complete the package
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        const pkgSessions = sessions.filter(s => s.package_id === session.package_id);
        const willBeAllDone = pkgSessions.filter(s => s.id !== sessionId && s.status !== 'completed').length === 0;
        if (willBeAllDone) {
          await supabase.from('packages').update({ status: 'completed' }).eq('id', session.package_id);
          setPackages(prev => prev.map(p => p.id === session.package_id ? { ...p, status: 'completed' } : p));
        }
      }
    }
    setMarkingId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );

  if (sessions.length === 0) return (
    <div className="text-center py-20 space-y-3 animate-slide-up">
      <Dumbbell className="w-12 h-12 mx-auto text-neutral-800" />
      <p className="text-neutral-600 text-xs font-black uppercase tracking-widest">Chưa có buổi tập</p>
    </div>
  );

  return (
    <div className="space-y-3 animate-slide-up">

      {packages.map(pkg => {
        const pkgSessions = sessions.filter(s => s.package_id === pkg.id);
        if (!pkgSessions.length) return null;

        const completedCount = pkgSessions.filter(s => s.status === 'completed').length;
        const isActive = pkg.status === 'active';
        const isExpanded = expandedPkg === pkg.id || (expandedPkg === 'active' && isActive);

        // Find next upcoming session
        const nextSession = pkgSessions.find(s => s.status === 'scheduled');
        const upcomingSessions = pkgSessions.filter(s => s.status === 'scheduled');
        const doneSessions = pkgSessions.filter(s => s.status === 'completed');

        return (
          <div key={pkg.id} className={`rounded-[24px] overflow-hidden border ${isActive ? 'border-white/10 bg-white/[0.02]' : 'border-white/[0.05] bg-white/[0.01]'}`}>

            {/* Package header */}
            <button
              onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-400' : 'text-neutral-600'}`}>
                  Gói #{String(pkg.package_number).padStart(2, '0')}
                </span>
                <span className="text-xs text-neutral-600">{completedCount}/{pkg.total_sessions} buổi</span>
                {isActive && nextSession && (
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Đang tập
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Mini progress */}
                <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isActive ? 'bg-blue-500' : 'bg-neutral-700'}`}
                    style={{ width: `${pkg.total_sessions > 0 ? (completedCount / pkg.total_sessions) * 100 : 0}%` }}
                  />
                </div>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-neutral-600" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />}
              </div>
            </button>

            {/* Sessions list */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-1.5">

                {/* Upcoming sessions */}
                {upcomingSessions.length > 0 && (
                  <>
                    {isActive && (
                      <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest py-2 px-1">
                        Sắp tới · {upcomingSessions.length} buổi
                      </p>
                    )}
                    {upcomingSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      const today = isToday(sess.scheduled_date);
                      const past = isPast(sess.scheduled_date);

                      return (
                        <div
                          key={sess.id}
                          className={`flex items-center gap-3 rounded-[16px] px-4 py-3 transition-all ${
                            today ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-white/[0.02]'
                          }`}
                        >
                          {/* Session number */}
                          <span className="text-[10px] font-black text-neutral-600 w-6 text-center">
                            {String(sess.session_number).padStart(2, '0')}
                          </span>

                          {/* Day chip */}
                          <span className={`text-[10px] font-black w-6 text-center ${today ? 'text-blue-400' : 'text-neutral-500'}`}>
                            {dayLabel}
                          </span>

                          {/* Date & time */}
                          <div className="flex-1">
                            <p className={`text-xs font-medium ${today ? 'text-blue-300' : 'text-white'}`}>
                              {short} {today && <span className="text-[9px] font-black text-blue-400 ml-1">HÔM NAY</span>}
                            </p>
                            <p className="text-[10px] text-neutral-600">{sess.scheduled_time?.slice(0, 5)}</p>
                          </div>

                          {/* Mark done button (coach only) */}
                          {!readOnly && (
                            <button
                              onClick={() => markDone(sess.id)}
                              disabled={markingId === sess.id}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 ${
                                past || today
                                  ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                                  : 'bg-white/[0.04] border border-white/[0.08] text-neutral-600'
                              }`}
                            >
                              {markingId === sess.id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <CheckCircle2 className="w-3 h-3" />
                              }
                              Done
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Completed sessions */}
                {doneSessions.length > 0 && (
                  <>
                    <p className="text-[9px] font-black text-neutral-700 uppercase tracking-widest py-2 px-1 mt-2">
                      Đã hoàn thành · {doneSessions.length} buổi
                    </p>
                    {doneSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      return (
                        <div key={sess.id} className="flex items-center gap-3 rounded-[16px] px-4 py-3 bg-white/[0.01] opacity-50">
                          <span className="text-[10px] font-black text-neutral-700 w-6 text-center">
                            {String(sess.session_number).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-black text-neutral-700 w-6 text-center">{dayLabel}</span>
                          <div className="flex-1">
                            <p className="text-xs text-neutral-500">{short}</p>
                            <p className="text-[10px] text-neutral-700">{sess.scheduled_time?.slice(0, 5)}</p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SessionsTab;