import React, { useState, useEffect, useCallback } from 'react';
import { Dumbbell, CheckCircle2, Clock, ChevronDown, ChevronUp, RefreshCw, Plus, X } from 'lucide-react';
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
const SessionsTab = ({ clientId, client, readOnly = false, onOpenQuickLog, refreshKey = 0 }) => {
  const [packages, setPackages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPkg, setExpandedPkg] = useState('active'); // default expand active
  const [markingId, setMarkingId] = useState(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraAnchorSession, setExtraAnchorSession] = useState(null);
  const [extraDate, setExtraDate] = useState('');
  const [extraTime, setExtraTime] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchData, refreshKey]);

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
        const willBeAllDone = pkgSessions.filter(s => s.id !== sessionId && ['scheduled', 'in_progress'].includes(s.status)).length === 0;
        if (willBeAllDone) {
          await supabase.from('packages').update({ status: 'completed' }).eq('id', session.package_id);
          setPackages(prev => prev.map(p => p.id === session.package_id ? { ...p, status: 'completed' } : p));
        }
      }
    }
    setMarkingId(null);
  };

  const openExtraModal = (sessionItem) => {
    setExtraAnchorSession(sessionItem);
    setExtraDate(sessionItem.scheduled_date);
    setExtraTime(sessionItem.scheduled_time?.slice(0, 5) || '07:00');
    setExtraNote('');
    setShowExtraModal(true);
  };

  const handleCreateExtraSession = async () => {
    if (!extraAnchorSession || !extraDate || !extraTime) return;

    setAddingExtra(true);
    const { error } = await supabase.rpc('insert_extra_package_session', {
      p_anchor_session_id: extraAnchorSession.id,
      p_scheduled_date: extraDate,
      p_scheduled_time: extraTime,
      p_notes: extraNote,
    });

    if (error) {
      alert(`Không thể thêm buổi phát sinh: ${error.message}`);
      setAddingExtra(false);
      return;
    }

    setShowExtraModal(false);
    setExtraAnchorSession(null);
    setAddingExtra(false);
    void fetchData();
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

        // Find next relevant session
        const nextSession = pkgSessions.find(s => s.status === 'in_progress') || pkgSessions.find(s => s.status === 'scheduled');
        const upcomingSessions = pkgSessions
          .filter(s => ['scheduled', 'in_progress'].includes(s.status))
          .sort((a, b) => a.session_number - b.session_number || a.scheduled_date.localeCompare(b.scheduled_date) || a.scheduled_time.localeCompare(b.scheduled_time));
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
                      <div className="flex items-center justify-between gap-3 py-2 px-1">
                        <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
                          Sắp tới · {upcomingSessions.length} buổi
                        </p>
                        {!readOnly && nextSession && (
                          <button
                            onClick={() => openExtraModal(nextSession)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 bg-white/[0.05] border border-white/[0.08] text-white"
                          >
                            <Plus className="w-3 h-3" />
                            Thêm buổi phát sinh
                          </button>
                        )}
                      </div>
                    )}
                    {upcomingSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      const today = isToday(sess.scheduled_date);
                      const past = isPast(sess.scheduled_date);
                      const isInProgress = sess.status === 'in_progress';

                      return (
                        <div
                          key={sess.id}
                          className={`flex items-center gap-3 rounded-[16px] px-4 py-3 transition-all ${
                            isInProgress ? 'bg-blue-500/12 border border-blue-500/25' : today ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-white/[0.02]'
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
                            <p className={`text-xs font-medium ${today || isInProgress ? 'text-blue-300' : 'text-white'}`}>
                              {short}
                              {today && <span className="text-[9px] font-black text-blue-400 ml-1">HÔM NAY</span>}
                              {isInProgress && <span className="text-[9px] font-black text-blue-400 ml-1">ĐANG TẬP</span>}
                            </p>
                            <p className="text-[10px] text-neutral-600">{sess.scheduled_time?.slice(0, 5)}</p>
                          </div>

                          {/* Mark done button (coach only) */}
                          {!readOnly && (
                            <div className="flex items-center gap-2">
                              {sess.session_kind !== 'extra' && (
                                <button
                                  onClick={() => openExtraModal(sess)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 bg-white/[0.04] border border-white/[0.08] text-neutral-400"
                                >
                                  <Plus className="w-3 h-3" />
                                  Thêm buổi
                                </button>
                              )}
                              <button
                                onClick={() => onOpenQuickLog?.({
                                  sessionId: sess.id,
                                  clientId,
                                  clientName: client?.name,
                                  scheduledDate: sess.scheduled_date,
                                  scheduledTime: sess.scheduled_time,
                                  packageId: sess.package_id,
                                  sessionKind: sess.session_kind,
                                  manualMode: false,
                                })}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 bg-blue-500/10 border border-blue-500/20 text-blue-400"
                              >
                                <Clock className="w-3 h-3" />
                                Log
                              </button>
                              <button
                                onClick={() => markDone(sess.id)}
                                disabled={markingId === sess.id}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 ${
                                  past || today || isInProgress
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
                            </div>
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
      {showExtraModal && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-[#111113] border border-white/10 rounded-t-[28px] p-5 pb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Buổi phát sinh</p>
                <h3 className="text-white font-semibold text-lg">
                  Chèn trước buổi #{String(extraAnchorSession?.session_number || '').padStart(2, '0')}
                </h3>
              </div>
              <button onClick={() => setShowExtraModal(false)} className="p-2 bg-white/5 rounded-full text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Ngày tập phát sinh</label>
                <input
                  type="date"
                  value={extraDate}
                  onChange={e => setExtraDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3 text-white text-sm outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Giờ tập</label>
                <input
                  type="time"
                  value={extraTime}
                  onChange={e => setExtraTime(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3 text-white text-sm outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Ghi chú</label>
                <input
                  type="text"
                  value={extraNote}
                  onChange={e => setExtraNote(e.target.value)}
                  placeholder="VD: Bù buổi công tác"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3 text-white text-sm outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowExtraModal(false)}
                className="flex-1 py-3.5 rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white font-bold text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateExtraSession}
                disabled={addingExtra || !extraDate || !extraTime}
                className="flex-1 py-3.5 rounded-[16px] bg-white text-black font-bold text-sm disabled:opacity-50"
              >
                {addingExtra ? 'Đang thêm...' : 'Thêm buổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsTab;
