import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Dumbbell, CheckCircle2, Clock, ChevronDown, ChevronUp, Plus, X, CalendarDays } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { getServiceTypeLabel, parseServiceBooking, parseServiceMeta } from '../../../utils/serviceUtils';
import { notifyExtraSessionAdded, notifySessionScheduleUpdated, fetchClientNotifInfo } from '../../../utils/notificationUtils';
import { toast } from '../../../utils/toast';

// ─── Helpers ─────────────────────────────────────────────────
const DAY_VI = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_OPTIONS = [
  { day: 1, label: 'M' }, { day: 2, label: 'T' }, { day: 3, label: 'W' },
  { day: 4, label: 'T' }, { day: 5, label: 'F' }, { day: 6, label: 'S' }, { day: 0, label: 'S' },
];

const formatSessionDate = (dateStr) => {
  // Session dates are calendar dates. Parse them in UTC at noon so a browser
  // timezone can never shift the displayed day backwards or forwards.
  const [yyyy, mm, dd] = String(dateStr).slice(0, 10).split('-').map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12));
  const day = DAY_VI[d.getUTCDay()];
  const paddedDay = String(dd).padStart(2, '0');
  const paddedMonth = String(mm).padStart(2, '0');
  return { dayLabel: day, full: `${paddedDay}/${paddedMonth}/${yyyy}`, short: `${paddedDay}/${paddedMonth}` };
};

const localDateStr = (d) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const isToday = (dateStr) => {
  return dateStr === localDateStr(new Date());
};

const isSessionTimeReached = (sessionItem, nowMs = Date.now()) => {
  const date = String(sessionItem?.scheduled_date || '').slice(0, 10);
  const time = String(sessionItem?.scheduled_time || '').slice(0, 5);
  if (!date || !time) return false;

  const scheduledMs = new Date(`${date}T${time}:00`).getTime();
  return !Number.isNaN(scheduledMs) && nowMs >= scheduledMs;
};

const formatBookingWindow = (sessionItem) => {
  const booking = parseServiceBooking(sessionItem.notes);
  const start = sessionItem.scheduled_time?.slice(0, 5) || '--:--';
  const end = booking.endTime || '';
  const location = booking.location || '';

  return {
    timeLabel: end ? `${start} - ${end}` : start,
    locationLabel: location,
  };
};

// ─── SessionsTab ─────────────────────────────────────────────
const SessionsTab = ({
  clientId,
  client,
  readOnly = false,
  allowStretchingBooking = false,
  allowTraineeComplete = false,
  onOpenQuickLog,
  refreshKey = 0,
}) => {
  const [packages, setPackages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPkg, setExpandedPkg] = useState(null);
  const [expandedCompletedPackages, setExpandedCompletedPackages] = useState({});
  const [expandedCancelledPackages, setExpandedCancelledPackages] = useState({});
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraPackage, setExtraPackage] = useState(null);
  const [extraServiceType, setExtraServiceType] = useState('training');
  const [extraDate, setExtraDate] = useState('');
  const [extraTime, setExtraTime] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [schedulePackage, setSchedulePackage] = useState(null);
  const [scheduleEffectiveDate, setScheduleEffectiveDate] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [completingSessionId, setCompletingSessionId] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const canScheduleStretching = !readOnly || allowStretchingBooking;

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);

    const [{ data: pkgs }, { data: sess }] = await Promise.all([
      supabase.from('packages').select('id, package_number, total_sessions, status, note, weekly_schedule').eq('client_id', clientId).order('package_number'),
      supabase.from('sessions').select('*').eq('client_id', clientId).order('scheduled_date').order('scheduled_time'),
    ]);

    const loadedPackages = pkgs ?? [];
    setPackages(loadedPackages);
    setSessions(sess ?? []);
    // Auto-expand the first active package by default
    if (loadedPackages.length > 0) {
      const firstActive = loadedPackages.find(p => p.status === 'active') ?? loadedPackages[0];
      setExpandedPkg((current) => current ?? firstActive.id);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchData, refreshKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const openExtraModal = (pkg, pkgSessions, serviceType = 'training') => {
    const activeSessions = pkgSessions
      .filter(sessionItem => ['scheduled', 'in_progress'].includes(sessionItem.status))
      .sort((a, b) => a.session_number - b.session_number || a.scheduled_date.localeCompare(b.scheduled_date) || a.scheduled_time.localeCompare(b.scheduled_time));

    if (serviceType === 'training' && activeSessions.length === 0) {
      toast.info('There are no active sessions left in this package to insert an extra one.');
      return;
    }

    const firstActiveSession = activeSessions[0];
    setExtraPackage(pkg);
    setExtraServiceType(serviceType);
    setExtraDate(firstActiveSession?.scheduled_date || localDateStr(new Date()));
    setExtraTime(firstActiveSession?.scheduled_time?.slice(0, 5) || '07:00');
    setExtraNote('');
    setShowExtraModal(true);
  };

  const openScheduleModal = (pkg) => {
    const now = new Date();
    setSchedulePackage(pkg);
    setScheduleEffectiveDate(localDateStr(now));
    setWeeklySchedule(pkg.weekly_schedule || []);
  };

  const toggleScheduleDay = (day) => {
    setWeeklySchedule((current) => {
      const exists = current.some((item) => item.day === day);
      if (exists) return current.filter((item) => item.day !== day);
      return [...current, { day, time: '07:00' }].sort((a, b) => (a.day || 7) - (b.day || 7));
    });
  };

  const updateScheduleTime = (day, time) => {
    setWeeklySchedule((current) => current.map((item) => item.day === day ? { ...item, time } : item));
  };

  const handleApplySchedule = async () => {
    if (!schedulePackage || !scheduleEffectiveDate || weeklySchedule.length === 0) return;
    setSavingSchedule(true);
    const previousUpcoming = new Map(
      sessions
        .filter((sessionItem) => sessionItem.package_id === schedulePackage.id && ['scheduled', 'in_progress'].includes(sessionItem.status))
        .map((sessionItem) => [sessionItem.id, `${sessionItem.scheduled_date}|${sessionItem.scheduled_time || ''}`])
    );
    const { data, error } = await supabase.rpc('apply_package_schedule', {
      p_package_id: schedulePackage.id,
      p_effective_date: scheduleEffectiveDate,
      p_weekly_schedule: weeklySchedule,
    });
    setSavingSchedule(false);
    if (error) {
      toast.error(`Unable to update schedule: ${error.message}`);
      return;
    }
    setSchedulePackage(null);
    toast.success('Upcoming sessions have been updated.');
    void fetchData();

    const changedCount = (data || []).filter((sessionItem) => {
      const previousSlot = previousUpcoming.get(sessionItem.session_id);
      return !previousSlot || previousSlot !== `${sessionItem.scheduled_date}|${sessionItem.scheduled_time || ''}`;
    }).length;
    if (changedCount > 0) {
      void (async () => {
        const clientInfo = await fetchClientNotifInfo(clientId);
        await notifySessionScheduleUpdated({
          clientAuthUserId: clientInfo?.auth_user_id,
          effectiveDate: scheduleEffectiveDate,
          changedCount,
          upcomingCount: (data || []).length,
        });
      })();
    }
  };

  const handleCompleteSession = async (sessionId) => {
    if (!sessionId || completingSessionId) return;
    setCompletingSessionId(sessionId);
    const { error } = await supabase.rpc('complete_session_without_exercises', { p_session_id: sessionId });
    setCompletingSessionId(null);
    if (error) {
      toast.error(`Unable to complete session: ${error.message}`);
      return;
    }
    toast.success('Session marked complete. Great work!');
    void fetchData();
  };

  const handleCreateExtraSession = async () => {
    if (!extraPackage || !extraDate || !extraTime) return;

    setAddingExtra(true);

    let error = null;

    if (extraServiceType === 'stretching') {
      const packageSessions = sessions.filter((sessionItem) => sessionItem.package_id === extraPackage.id);
      const activeNonCancelledCount = packageSessions.filter((sessionItem) => sessionItem.status !== 'cancelled').length;

      if (activeNonCancelledCount >= extraPackage.total_sessions) {
        toast.error('All included sessions have already been scheduled for this service.');
        setAddingExtra(false);
        return;
      }

      const nextSessionNumber = packageSessions.reduce((max, sessionItem) => Math.max(max, sessionItem.session_number || 0), 0) + 1;
      const response = await supabase.from('sessions').insert([{
        client_id: clientId,
        package_id: extraPackage.id,
        session_number: nextSessionNumber,
        scheduled_date: extraDate,
        scheduled_time: extraTime,
        status: 'scheduled',
        notes: extraNote.trim() || null,
        session_kind: 'manual',
      }]);
      error = response.error;
    } else {
      const response = await supabase.rpc('insert_extra_package_session', {
        p_package_id: extraPackage.id,
        p_scheduled_date: extraDate,
        p_scheduled_time: extraTime,
        p_notes: extraNote,
      });
      error = response.error;
    }

    if (error) {
      toast.error(`Unable to add ${extraServiceType === 'stretching' ? 'session' : 'extra session'}: ${error.message}`);
      setAddingExtra(false);
      return;
    }

    setShowExtraModal(false);
    setExtraPackage(null);
    setAddingExtra(false);
    void fetchData();

    // ─── Notify trainee: extra session added (fire-and-forget) ──
    void (async () => {
      const clientInfo = await fetchClientNotifInfo(clientId);
      if (clientInfo?.auth_user_id) {
        await notifyExtraSessionAdded({
          clientAuthUserId: clientInfo.auth_user_id,
          scheduledDate: extraDate,
          scheduledTime: extraTime,
        });
      }
    })();
    // ────────────────────────────────────────────────────────────
  };

  const serviceGroups = React.useMemo(() => {
    const groups = {};
    packages.forEach((pkg) => {
      const pkgMetaRaw = parseServiceMeta(pkg.note);
      const type = pkgMetaRaw.serviceType || 'training';
      if (!groups[type]) groups[type] = [];
      groups[type].push(pkg);
    });
    return groups;
  }, [packages]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );

  if (packages.length === 0) return (
    <div className="text-center py-20 space-y-3 animate-slide-up">
      <Dumbbell className="w-12 h-12 mx-auto text-neutral-800" />
      <p className="text-neutral-600 text-xs font-black uppercase tracking-widest">No Services Yet</p>
    </div>
  );

  return (
    <div className="animate-slide-up space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:items-start">
      {Object.entries(serviceGroups).map(([serviceType, pkgs]) => {
        const serviceLabel = getServiceTypeLabel(serviceType);

        return (
          <div key={serviceType} className="space-y-4">
            <h3 className="hidden lg:block text-[10px] px-1 font-black uppercase tracking-widest text-neutral-500 mb-1">
              {serviceLabel}
            </h3>
            
            <div className="space-y-4">
              {pkgs.map((pkg) => {
                const pkgSessions = sessions.filter((s) => s.package_id === pkg.id);
                const completedCount = pkgSessions.filter((s) => s.status === 'completed').length;
                const isActive = pkg.status === 'active';
                const isExpanded = expandedPkg === pkg.id;
                const remainingCount = Math.max((pkg.total_sessions || 0) - pkgSessions.filter((s) => s.status !== 'cancelled').length, 0);

                // Find next relevant session
                const nextSession =
                  pkgSessions.find((s) => s.status === 'in_progress' && (s.session_kind ?? 'fixed') === 'fixed') ||
                  pkgSessions.find((s) => s.status === 'scheduled' && (s.session_kind ?? 'fixed') === 'fixed');
                const upcomingSessions = pkgSessions
                  .filter((s) => ['scheduled', 'in_progress'].includes(s.status))
                  .sort(
                    (a, b) =>
                      a.session_number - b.session_number ||
                      a.scheduled_date.localeCompare(b.scheduled_date) ||
                      a.scheduled_time.localeCompare(b.scheduled_time)
                  );
                const doneSessions = pkgSessions.filter((s) => s.status === 'completed');
                const isCompletedExpanded = Boolean(expandedCompletedPackages[pkg.id]);
                const isCancelledExpanded = Boolean(expandedCancelledPackages[pkg.id]);
                const cancelledSessions = pkgSessions
                  .filter((s) => s.status === 'cancelled' && s.cancel_reason !== 'overflow_by_extra_session')
                  .sort((a, b) => {
                    const aCancelledAt = a.cancelled_at ? new Date(a.cancelled_at).getTime() : 0;
                    const bCancelledAt = b.cancelled_at ? new Date(b.cancelled_at).getTime() : 0;
                    if (aCancelledAt !== bCancelledAt) return bCancelledAt - aCancelledAt;
                    return b.session_number - a.session_number;
                  });

                return (
                  <div
                    key={pkg.id}
                    className={`overflow-hidden rounded-[22px] border lg:rounded-[24px] ${
                      isActive ? 'border-white/10 bg-white/[0.02]' : 'border-white/[0.05] bg-white/[0.01]'
                    }`}
                  >
                    {/* Package header */}
                    <button
                      onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <p
                          className={`text-[12px] font-black uppercase tracking-wide lg:hidden ${
                            isActive ? 'text-blue-400' : 'text-neutral-500'
                          }`}
                        >
                          {serviceLabel}
                        </p>
                        <p
                          className={`text-[12px] font-black uppercase tracking-wide hidden lg:block ${
                            isActive ? 'text-white' : 'text-neutral-500'
                          }`}
                        >
                          Package #{String(pkg.package_number).padStart(2, '0')}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
                          <span className="shrink-0">
                            {completedCount}/{pkg.total_sessions} used
                          </span>
                          {serviceType === 'stretching' ? (
                            <>
                              <span className="text-neutral-700">•</span>
                              <span className="truncate">{remainingCount} left to book</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive && nextSession ? (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black text-emerald-300">
                            Active
                          </span>
                        ) : null}
                        <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isActive ? 'bg-blue-500' : 'bg-neutral-700'}`}
                            style={{
                              width: `${pkg.total_sessions > 0 ? (completedCount / pkg.total_sessions) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-neutral-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Sessions list */}
                    <div className={`space-y-1.5 px-4 pb-4 lg:px-5 lg:pb-5 ${isExpanded ? 'block' : 'hidden'}`}>

                {isActive && serviceType === 'training' && !readOnly && (
                  <button
                    type="button"
                    onClick={() => openScheduleModal(pkg)}
                    className="mb-2 flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase text-white"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {pkg.weekly_schedule?.length ? 'Update schedule' : 'Set schedule'}
                  </button>
                )}

                {/* Upcoming sessions */}
                {upcomingSessions.length > 0 && (
                  <>
                    {isActive && (
                      <div className="flex items-center justify-between gap-3 py-2 px-1">
                        <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
                          Upcoming · {upcomingSessions.length} sessions
                        </p>
                        {((!readOnly && serviceType === 'training' && nextSession) || (canScheduleStretching && serviceType === 'stretching')) && (
                          <button
                            onClick={() => openExtraModal(pkg, pkgSessions, serviceType)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[10px] font-black uppercase transition-all active:scale-90 bg-white/[0.05] border border-white/[0.08] text-white"
                          >
                            <Plus className="w-3 h-3" />
                            {serviceType === 'stretching' ? 'Schedule' : 'Add Extra Session'}
                          </button>
                        )}
                      </div>
                    )}
                    {upcomingSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      const today = isToday(sess.scheduled_date);
                      const isInProgress = sess.status === 'in_progress';
                      const bookingMeta = formatBookingWindow(sess);
                      const traineeCanComplete = isSessionTimeReached(sess, nowMs);
                      const completeDisabled = completingSessionId === sess.id || (readOnly && !traineeCanComplete);

                      return (
                        <div
                          key={sess.id}
                          className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] px-3.5 py-3 transition-all lg:grid-cols-[28px_minmax(0,1fr)_auto] lg:gap-4 lg:px-5 lg:py-3.5 ${
                            isInProgress ? 'bg-blue-500/12 border border-blue-500/25' : today ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-white/[0.02]'
                          }`}
                        >
                          {/* Session number */}
                          <span className="text-center text-[10px] font-black tabular-nums text-neutral-600">
                            {String(sess.session_number).padStart(2, '0')}
                          </span>

                          {/* Date & time */}
                          <div className="min-w-0">
                            <p className={`flex items-center gap-1.5 text-xs font-medium ${today || isInProgress ? 'text-blue-300' : 'text-white'}`}>
                              <span className={`text-[10px] font-black uppercase tracking-wide ${today ? 'text-blue-400' : 'text-neutral-500'}`}>{dayLabel}</span>
                              <span>{short}</span>
                              {today && <span className="text-[9px] font-black text-blue-400 ml-1">TODAY</span>}
                              {isInProgress && <span className="text-[9px] font-black text-blue-400 ml-1">LIVE</span>}
                            </p>
                            <p className="truncate text-[10px] text-neutral-600">
                              {bookingMeta.timeLabel}{bookingMeta.locationLabel ? ` · ${bookingMeta.locationLabel}` : ''}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {!readOnly && (
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
                                aria-label="Record workout"
                                title="Record workout"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-blue-500/20 bg-blue-500/10 text-blue-300 transition-transform active:scale-95"
                              >
                                <Clock className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {(!readOnly || allowTraineeComplete) && (
                              readOnly && !traineeCanComplete && completingSessionId !== sess.id ? (
                                <span
                                  title={`Available after ${bookingMeta.timeLabel}`}
                                  className="inline-flex h-11 items-center gap-1.5 rounded-[12px] border border-blue-500/25 bg-blue-500/10 px-3 text-[10px] font-black uppercase text-blue-300"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  Booked
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteSession(sess.id)}
                                  disabled={completeDisabled}
                                  title="Complete session"
                                  className="inline-flex h-11 items-center gap-1.5 rounded-[12px] border border-emerald-300/30 bg-emerald-400 px-3 text-[10px] font-black uppercase text-emerald-950 transition-transform active:scale-95 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {completingSessionId === sess.id ? 'Saving' : 'Complete'}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {isActive && serviceType === 'stretching' && upcomingSessions.length === 0 && doneSessions.length === 0 && (
                  <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">No bookings yet</p>
                    <p className="mt-2 text-[11px] text-neutral-500">Set the first booking when needed.</p>
                    {canScheduleStretching && remainingCount > 0 && (
                      <button
                        onClick={() => openExtraModal(pkg, pkgSessions, serviceType)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase text-white"
                      >
                        <Plus className="h-3 w-3" />
                        Schedule
                      </button>
                    )}
                  </div>
                )}

                {/* Completed sessions */}
                {doneSessions.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedCompletedPackages((current) => ({
                        ...current,
                        [pkg.id]: !current[pkg.id],
                      }))}
                      aria-expanded={isCompletedExpanded}
                      className="mt-2 flex w-full items-center justify-between rounded-[12px] px-1 py-2 text-left"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-700">
                        Completed · {doneSessions.length} sessions
                      </span>
                      {isCompletedExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-neutral-600" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-neutral-600" />
                      )}
                    </button>
                    {isCompletedExpanded && doneSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      const canReviewLog = typeof onOpenQuickLog === 'function';
                      const bookingMeta = formatBookingWindow(sess);
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
                          className={`w-full flex items-center gap-3 rounded-[16px] px-4 py-3 border text-left transition-all lg:gap-4 lg:px-5 lg:py-3.5 ${
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
                            <p className="text-[10px] text-neutral-700">{bookingMeta.timeLabel}</p>
                            {bookingMeta.locationLabel ? (
                              <p className="text-[10px] text-neutral-700">{bookingMeta.locationLabel}</p>
                            ) : null}
                          </div>
                          {canReviewLog ? (
                            <span className="text-[9px] font-black uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                              View
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
                    <button
                      type="button"
                      onClick={() => setExpandedCancelledPackages((current) => ({
                        ...current,
                        [pkg.id]: !current[pkg.id],
                      }))}
                      aria-expanded={isCancelledExpanded}
                      className="mt-2 flex w-full items-center justify-between rounded-[12px] px-1 py-2 text-left"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400/70">
                        Cancelled · {cancelledSessions.length} sessions
                      </span>
                      {isCancelledExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-red-300/60" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-red-300/60" />
                      )}
                    </button>
                    {isCancelledExpanded && cancelledSessions.map(sess => {
                      const { dayLabel, short } = formatSessionDate(sess.scheduled_date);
                      const bookingMeta = formatBookingWindow(sess);
                      return (
                        <div key={sess.id} className="flex items-center gap-3 rounded-[16px] border border-red-500/[0.12] bg-red-500/[0.05] px-4 py-3 lg:gap-4 lg:px-5 lg:py-3.5">
                          <span className="text-[10px] font-black text-red-300/80 w-6 text-center">
                            {String(sess.session_number).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-black text-red-300/80 w-6 text-center">{dayLabel}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-red-200/90 line-through">{short}</p>
                            <p className="text-[10px] text-red-200/50">{bookingMeta.timeLabel}</p>
                            {bookingMeta.locationLabel ? (
                              <p className="text-[10px] text-red-200/50">{bookingMeta.locationLabel}</p>
                            ) : null}
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
            </div>
          );
        })}
            </div>
          </div>
        );
      })}
      {showExtraModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[220] flex items-end justify-center px-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[560px] rounded-t-[28px] border border-white/10 bg-[#111113] p-5 pb-8 animate-modal-in lg:rounded-[28px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
                  {extraServiceType === 'stretching' ? 'Schedule Booking' : 'Extra Session'}
                </p>
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
                  {extraServiceType === 'stretching'
                    ? 'Choose the date and time for this stretching booking. Each booking is added manually when needed.'
                    : 'Choose the date and time for a session outside the fixed schedule. The system will place it after the nearest previous session and shift the following ones forward.'}
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
                {addingExtra ? 'Adding...' : extraServiceType === 'stretching' ? 'Schedule' : 'Add Session'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {schedulePackage && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[560px] rounded-t-[28px] border border-white/10 bg-[#111113] p-5 pb-8 animate-modal-in lg:rounded-[28px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Flexible schedule</p>
                <h3 className="text-lg font-semibold text-white">Package #{String(schedulePackage.package_number).padStart(2, '0')}</h3>
              </div>
              <button onClick={() => setSchedulePackage(null)} className="rounded-full bg-white/5 p-2 text-neutral-400"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-4 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[11px] leading-relaxed text-neutral-400">
              All unfinished sessions, including missed sessions, will move to the new schedule from the effective date. Completed sessions remain unchanged.
            </p>
            <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-600">Effective from</label>
            <input type="date" value={scheduleEffectiveDate} onChange={(event) => setScheduleEffectiveDate(event.target.value)} className="mt-2 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none" />
            <p className="mb-2 mt-5 text-[9px] font-black uppercase tracking-widest text-neutral-600">Weekly training days</p>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_OPTIONS.map(({ day, label }) => {
                const selected = weeklySchedule.some((item) => item.day === day);
                return <button key={day} type="button" onClick={() => toggleScheduleDay(day)} className={`rounded-[12px] py-2.5 text-[11px] font-black ${selected ? 'bg-white text-black' : 'border border-white/[0.08] bg-white/[0.04] text-neutral-500'}`}>{label}</button>;
              })}
            </div>
            {weeklySchedule.length > 0 && <div className="mt-3 space-y-2">
              {weeklySchedule.map(({ day, time }) => <div key={day} className="flex items-center justify-between rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-4 py-2.5"><span className="text-xs font-bold text-white">{DAY_VI[day]}</span><input type="time" value={time} onChange={(event) => updateScheduleTime(day, event.target.value)} className="bg-transparent text-sm text-white outline-none" /></div>)}
            </div>}
            <div className="mt-5 flex gap-3"><button onClick={() => setSchedulePackage(null)} className="flex-1 rounded-[16px] border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-bold text-white">Cancel</button><button onClick={handleApplySchedule} disabled={savingSchedule || !scheduleEffectiveDate || weeklySchedule.length === 0} className="flex-1 rounded-[16px] bg-white py-3.5 text-sm font-bold text-black disabled:opacity-50">{savingSchedule ? 'Updating...' : 'Apply schedule'}</button></div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default SessionsTab;
