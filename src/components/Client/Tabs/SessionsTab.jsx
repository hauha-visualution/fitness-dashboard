import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Dumbbell, CheckCircle2, Clock, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// ─── Helpers ─────────────────────────────────────────────────
const DAY_VI = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraPackage, setExtraPackage] = useState(null);
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

  const openExtraModal = (pkg, pkgSessions) => {
    const activeSessions = pkgSessions
      .filter(sessionItem => ['scheduled', 'in_progress'].includes(sessionItem.status))
      .sort((a, b) => a.session_number - b.session_number || a.scheduled_date.localeCompare(b.scheduled_date) || a.scheduled_time.localeCompare(b.scheduled_time));

    if (activeSessions.length === 0) {
      alert('There are no active sessions left in this package to insert an extra one.');
      return;
    }

    const firstActiveSession = activeSessions[0];
    setExtraPackage(pkg);
    setExtraDate(firstActiveSession.scheduled_date);
    setExtraTime(firstActiveSession.scheduled_time?.slice(0, 5) || '07:00');
    setExtraNote('');
    setShowExtraModal(true);
  };

  const handleCreateExtraSession = async () => {
    if (!extraPackage || !extraDate || !extraTime) return;

    setAddingExtra(true);
    const { error } = await supabase.rpc('insert_extra_package_session', {
      p_package_id: extraPackage.id,
      p_scheduled_date: extraDate,
      p_scheduled_time: extraTime,
      p_notes: extraNote,
    });

    if (error) {
      alert(`Unable to add extra session: ${error.message}`);
      setAddingExtra(false);
      return;
    }

    setShowExtraModal(false);
    setExtraPackage(null);
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
      <p className="text-neutral-600 text-xs font-black uppercase tracking-widest">No Sessions Yet</p>
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
        const nextSession = pkgSessions.find(s => s.status === 'in_progress' && (s.session_kind ?? 'fixed') === 'fixed')
          || pkgSessions.find(s => s.status === 'scheduled' && (s.session_kind ?? 'fixed') === 'fixed');
        const upcomingSessions = pkgSessions
          .filter(s => ['scheduled', 'in_progress'].includes(s.status))
          .sort((a, b) => a.session_number - b.session_number || a.scheduled_date.localeCompare(b.scheduled_date) || a.scheduled_time.localeCompare(b.scheduled_time));
        const doneSessions = pkgSessions.filter(s => s.status === 'completed');
        const cancelledSessions = pkgSessions
          .filter(s => s.status === 'cancelled' && s.cancel_reason !== 'overflow_by_extra_session')
          .sort((a, b) => {
            const aCancelledAt = a.cancelled_at ? new Date(a.cancelled_at).getTime() : 0;
            const bCancelledAt = b.cancelled_at ? new Date(b.cancelled_at).getTime() : 0;
            if (aCancelledAt !== bCancelledAt) return bCancelledAt - aCancelledAt;
            return b.session_number - a.session_number;
          });

        return (
          <div key={pkg.id} className={`rounded-[24px] overflow-hidden border ${isActive ? 'border-white/10 bg-white/[0.02]' : 'border-white/[0.05] bg-white/[0.01]'}`}>

            {/* Package header */}
            <button
              onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-400' : 'text-neutral-600'}`}>
                  Package #{String(pkg.package_number).padStart(2, '0')}
                </span>
                <span className="text-xs text-neutral-600">{completedCount}/{pkg.total_sessions} sessions</span>
                {isActive && nextSession && (
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Active
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
                          Upcoming · {upcomingSessions.length} sessions
                        </p>
                        {!readOnly && nextSession && (
                          <button
                            onClick={() => openExtraModal(pkg, pkgSessions)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 bg-white/[0.05] border border-white/[0.08] text-white"
                          >
                            <Plus className="w-3 h-3" />
                            Add Extra Session
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
                              {today && <span className="text-[9px] font-black text-blue-400 ml-1">TODAY</span>}
                              {isInProgress && <span className="text-[9px] font-black text-blue-400 ml-1">LIVE</span>}
                            </p>
                            <p className="text-[10px] text-neutral-600">{sess.scheduled_time?.slice(0, 5)}</p>
                          </div>

                          {/* Mark done button (coach only) */}
                          {!readOnly && (
                            <div className="flex items-center">
                              <button
                                onClick={() => onOpenQuickLog?.({
                                  sessionId: sess.id,
                                  clientId,
                                  clientName: client?.name,
                                  scheduledDate: sess.scheduled_date,
                                  scheduledTime: sess.scheduled_time,
                                  packageId: sess.package_id,
                                  workoutTemplateId: sess.workout_template_id,
                                  sessionKind: sess.session_kind,
                                  manualMode: false,
                                })}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 bg-blue-500/10 border border-blue-500/20 text-blue-400"
                              >
                                <Clock className="w-3 h-3" />
                                Record
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
                      Completed · {doneSessions.length} sessions
                    </p>
                    {doneSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      const canReviewLog = !readOnly && typeof onOpenQuickLog === 'function';
                      return (
                        <button
                          key={sess.id}
                          type="button"
                          onClick={() => canReviewLog && onOpenQuickLog({
                            sessionId: sess.id,
                            clientId,
                            clientName: client?.name,
                            scheduledDate: sess.scheduled_date,
                            scheduledTime: sess.scheduled_time,
                            packageId: sess.package_id,
                            workoutTemplateId: sess.workout_template_id,
                            sessionKind: sess.session_kind,
                            manualMode: false,
                          })}
                          disabled={!canReviewLog}
                          className={`w-full flex items-center gap-3 rounded-[16px] px-4 py-3 border transition-all text-left ${
                            canReviewLog
                              ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] active:scale-[0.995]'
                              : 'bg-white/[0.01] border-transparent opacity-50'
                          }`}
                        >
                          <span className="text-[10px] font-black text-neutral-700 w-6 text-center">
                            {String(sess.session_number).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-black text-neutral-700 w-6 text-center">{dayLabel}</span>
                          <div className="flex-1">
                            <p className="text-xs text-neutral-500">{short}</p>
                            <p className="text-[10px] text-neutral-700">{sess.scheduled_time?.slice(0, 5)}</p>
                          </div>
                          {canReviewLog ? (
                            <span className="text-[9px] font-black uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                              View Log
                            </span>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}

                {cancelledSessions.length > 0 && (
                  <>
                    <p className="text-[9px] font-black text-red-400/70 uppercase tracking-widest py-2 px-1 mt-2">
                      Cancelled · {cancelledSessions.length} sessions
                    </p>
                    {cancelledSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      return (
                        <div key={sess.id} className="flex items-center gap-3 rounded-[16px] px-4 py-3 bg-red-500/[0.05] border border-red-500/[0.12]">
                          <span className="text-[10px] font-black text-red-300/80 w-6 text-center">
                            {String(sess.session_number).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-black text-red-300/80 w-6 text-center">{dayLabel}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-red-200/90 line-through">{short}</p>
                            <p className="text-[10px] text-red-200/50">{sess.scheduled_time?.slice(0, 5)}</p>
                            {sess.cancel_reason && (
                              <p className="text-[10px] text-red-200/60 truncate mt-1">{sess.cancel_reason}</p>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase">
                            Cancelled
                          </span>
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
      {showExtraModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[220] flex items-end justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-[#111113] border border-white/10 rounded-t-[28px] p-5 pb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Extra Session</p>
                <h3 className="text-white font-semibold text-lg">
                  Package #{String(extraPackage?.package_number || '').padStart(2, '0')}
                </h3>
              </div>
              <button onClick={() => setShowExtraModal(false)} className="p-2 bg-white/5 rounded-full text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] px-4 py-3">
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Choose the date and time for a session outside the fixed schedule. The system will place it after the nearest previous session and shift the following ones forward.
                </p>
              </div>
              <div>
                <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Session Date</label>
                <input
                  type="date"
                  value={extraDate}
                  onChange={e => setExtraDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3 text-white text-sm outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Session Time</label>
                <input
                  type="time"
                  value={extraTime}
                  onChange={e => setExtraTime(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3 text-white text-sm outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Note</label>
                <input
                  type="text"
                  value={extraNote}
                  onChange={e => setExtraNote(e.target.value)}
                  placeholder="Example: Rescheduled business trip session"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3 text-white text-sm outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowExtraModal(false)}
                className="flex-1 py-3.5 rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExtraSession}
                disabled={addingExtra || !extraDate || !extraTime}
                className="flex-1 py-3.5 rounded-[16px] bg-white text-black font-bold text-sm disabled:opacity-50"
              >
                {addingExtra ? 'Adding...' : 'Add Session'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SessionsTab;
