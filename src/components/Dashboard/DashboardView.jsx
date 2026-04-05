import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Dumbbell, RefreshCw, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import ClientAvatar from '../shared/ClientAvatar';
import { parseServiceMeta } from '../../utils/serviceUtils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SESSION_PALETTES = [
  {
    dot: '#c8f53f',
    badgeBg: 'rgba(200,245,63,0.15)',
    badgeText: '#c8f53f',
  },
  {
    dot: '#60b4ff',
    badgeBg: 'rgba(96,180,255,0.15)',
    badgeText: '#60b4ff',
  },
  {
    dot: '#b39dff',
    badgeBg: 'rgba(180,160,255,0.15)',
    badgeText: '#b39dff',
  },
  {
    dot: '#ffaa55',
    badgeBg: 'rgba(255,160,80,0.15)',
    badgeText: '#ffaa55',
  },
];

const toLocalISOString = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDayMonth = (date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

const getMonthStart = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getMonthEnd = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatMonthLabel = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

const isSameDate = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getDateHash = (value = '') =>
  value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const getSessionPalette = (sessionItem) => {
  if (sessionItem.status === 'completed') return SESSION_PALETTES[0];
  if (sessionItem.status === 'in_progress') return SESSION_PALETTES[1];
  return SESSION_PALETTES[getDateHash(sessionItem.client?.name || sessionItem.id || '') % SESSION_PALETTES.length];
};

const getDaySessionState = (daySessions = []) => {
  const activeSessions = daySessions.filter((sessionItem) => sessionItem.status !== 'cancelled');

  if (activeSessions.length === 0) return 'none';
  if (activeSessions.some((sessionItem) => sessionItem.status === 'in_progress')) return 'in_progress';
  if (activeSessions.some((sessionItem) => sessionItem.status !== 'completed')) return 'scheduled';
  return 'completed';
};

const getDayStateVisuals = (dayState) => {
  switch (dayState) {
    case 'completed':
      return {
        fill: 'rgba(200,245,63,0.78)',
        dot: 'var(--app-accent)',
        countClassName: 'app-accent-text',
      };
    case 'in_progress':
      return {
        fill: 'rgba(96,180,255,0.82)',
        dot: 'var(--app-blue)',
        countClassName: 'app-blue-text',
      };
    case 'scheduled':
      return {
        fill: 'rgba(255,255,255,0.32)',
        dot: 'rgba(255,255,255,0.72)',
        countClassName: 'text-white/60',
      };
    default:
      return {
        fill: 'rgba(255,255,255,0)',
        dot: 'transparent',
        countClassName: 'text-white/28',
      };
  }
};

const buildQuickLogSelection = (sessionItem) => ({
  sessionId: sessionItem.id,
  clientId: sessionItem.client_id,
  clientName: sessionItem.client?.name,
  scheduledDate: sessionItem.scheduled_date,
  scheduledTime: sessionItem.scheduled_time,
  packageId: sessionItem.package_id,
  workoutTemplateId: sessionItem.workout_template_id,
  sessionKind: sessionItem.session_kind,
  manualMode: false,
});

const getSessionServiceLabel = (sessionItem) => {
  const serviceType = sessionItem.packageMeta?.serviceType || 'training';
  const sessionNumber = sessionItem.session_number ?? '--';

  switch (serviceType) {
    case 'sketching':
      return `Sketching #${sessionNumber}`;
    case 'meal_prep':
      return `Meal Prep #${sessionNumber}`;
    case 'training':
    default:
      return `Workout #${sessionNumber}`;
  }
};

const buildCalendarDays = (displayedMonth, sessionMap, selectedDate, today) => {
  const monthStart = getMonthStart(displayedMonth);
  const monthEnd = getMonthEnd(displayedMonth);
  const monthEndIndex = (monthEnd.getDay() + 6) % 7;
  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const totalCells = leadingBlanks + monthEnd.getDate() + (6 - monthEndIndex);
  const gridStart = addDays(monthStart, -leadingBlanks);

  return Array.from({ length: totalCells }, (_, index) => {
    const date = addDays(gridStart, index);
    const iso = toLocalISOString(date);
    const daySessions = sessionMap[iso] || [];
    const dayState = getDaySessionState(daySessions);
    const visuals = getDayStateVisuals(dayState);

    return {
      iso,
      date,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: isSameDate(date, selectedDate),
      isToday: isSameDate(date, today),
      hasSessions: dayState !== 'none',
      dayState,
      dotColor: visuals.dot,
    };
  });
};

const DashboardView = ({ session, coachProfile, refreshKey, onSelectClient, onOpenQuickLog, onLogout, onOpenProfile }) => {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayedMonth, setDisplayedMonth] = useState(getMonthStart(today));
  const [stats, setStats] = useState({
    activeTrainees: 0,
    todayTotal: 0,
    todayRemaining: 0,
    weeklyTotal: 0,
    previousWeeklyTotal: 0,
    monthlyTotal: 0,
    previousMonthlyTotal: 0,
    completionRate: 0,
  });
  const [sessionMap, setSessionMap] = useState({});
  const [loading, setLoading] = useState(true);

  const currentWeekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)),
    [currentWeekStart]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    const coachEmail = session?.user?.email;

    if (!coachEmail) {
      setLoading(false);
      return;
    }

    const monthStart = getMonthStart(displayedMonth);
    const monthEnd = getMonthEnd(displayedMonth);
    const prevMonthStart = getMonthStart(addDays(monthStart, -1));
    const prevMonthEnd = getMonthEnd(prevMonthStart);
    const previousWeekStart = addDays(currentWeekStart, -7);
    const currentWeekEnd = weekDays[6];
    const rangeStart = prevMonthStart < previousWeekStart ? prevMonthStart : previousWeekStart;
    const rangeEnd = monthEnd > currentWeekEnd ? monthEnd : currentWeekEnd;

    const [{ data: clientsRows, error: clientsError }, { data: rangeSessions, error: sessionsError }] = await Promise.all([
      supabase.from('clients').select('id, name, avatar_url, goal').eq('coach_email', coachEmail),
      supabase
        .from('sessions')
        .select('*')
        .gte('scheduled_date', toLocalISOString(rangeStart))
        .lte('scheduled_date', toLocalISOString(rangeEnd))
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true }),
    ]);

    if (clientsError || sessionsError) {
      console.error('Dashboard load error:', clientsError?.message || sessionsError?.message);
      setLoading(false);
      return;
    }

    const clientList = clientsRows || [];
    if (clientList.length === 0) {
      setSessionMap({});
      setStats({
        activeTrainees: 0,
        todayTotal: 0,
        todayRemaining: 0,
        weeklyTotal: 0,
        previousWeeklyTotal: 0,
        monthlyTotal: 0,
        previousMonthlyTotal: 0,
        completionRate: 0,
      });
      setLoading(false);
      return;
    }

    const clientIds = new Set(clientList.map((clientItem) => clientItem.id));
    const clientMap = clientList.reduce((acc, clientItem) => {
      acc[clientItem.id] = clientItem;
      return acc;
    }, {});

    const relevantSessions = (rangeSessions || []).filter((sessionItem) => clientIds.has(sessionItem.client_id));
    const packageIds = Array.from(new Set(relevantSessions.map((sessionItem) => sessionItem.package_id).filter(Boolean)));
    let packageMetaById = {};

    if (packageIds.length > 0) {
      const { data: packageRows, error: packageError } = await supabase
        .from('packages')
        .select('id, note')
        .in('id', packageIds);

      if (packageError) {
        console.error('Dashboard package meta load error:', packageError.message);
      } else {
        packageMetaById = (packageRows || []).reduce((acc, packageItem) => {
          acc[packageItem.id] = parseServiceMeta(packageItem.note);
          return acc;
        }, {});
      }
    }

    const groupedSessions = {};
    relevantSessions.forEach((sessionItem) => {
      const key = sessionItem.scheduled_date;
      if (!groupedSessions[key]) groupedSessions[key] = [];
      groupedSessions[key].push({
        ...sessionItem,
        client: clientMap[sessionItem.client_id],
        packageMeta: packageMetaById[sessionItem.package_id] || null,
      });
    });

    const todayKey = toLocalISOString(today);
    const monthStartStr = toLocalISOString(monthStart);
    const monthEndStr = toLocalISOString(monthEnd);
    const prevMonthStartStr = toLocalISOString(prevMonthStart);
    const prevMonthEndStr = toLocalISOString(prevMonthEnd);
    const currentWeekStartStr = toLocalISOString(currentWeekStart);
    const currentWeekEndStr = toLocalISOString(currentWeekEnd);
    const previousWeekStartStr = toLocalISOString(previousWeekStart);
    const previousWeekEndStr = toLocalISOString(addDays(currentWeekStart, -1));
    const currentMonthSessions = relevantSessions.filter(
      (sessionItem) => sessionItem.scheduled_date >= monthStartStr && sessionItem.scheduled_date <= monthEndStr
    );
    const previousMonthSessions = relevantSessions.filter(
      (sessionItem) => sessionItem.scheduled_date >= prevMonthStartStr && sessionItem.scheduled_date <= prevMonthEndStr
    );
    const nonCancelledMonthSessions = currentMonthSessions.filter((sessionItem) => sessionItem.status !== 'cancelled');
    const completedMonthSessions = nonCancelledMonthSessions.filter((sessionItem) => sessionItem.status === 'completed');
    const currentWeekSessions = relevantSessions.filter(
      (sessionItem) =>
        sessionItem.scheduled_date >= currentWeekStartStr &&
        sessionItem.scheduled_date <= currentWeekEndStr &&
        sessionItem.status !== 'cancelled'
    );
    const previousWeekSessions = relevantSessions.filter(
      (sessionItem) =>
        sessionItem.scheduled_date >= previousWeekStartStr &&
        sessionItem.scheduled_date <= previousWeekEndStr &&
        sessionItem.status !== 'cancelled'
    );
    const completionRate = nonCancelledMonthSessions.length > 0
      ? Math.round((completedMonthSessions.length / nonCancelledMonthSessions.length) * 100)
      : 0;

    setSessionMap(groupedSessions);
    setStats({
      activeTrainees: clientList.length,
      todayTotal: (groupedSessions[todayKey] || []).filter((sessionItem) => sessionItem.status !== 'cancelled').length,
      todayRemaining: (groupedSessions[todayKey] || []).filter(
        (sessionItem) => sessionItem.status !== 'completed' && sessionItem.status !== 'cancelled'
      ).length,
      weeklyTotal: currentWeekSessions.length,
      previousWeeklyTotal: previousWeekSessions.length,
      monthlyTotal: nonCancelledMonthSessions.length,
      previousMonthlyTotal: previousMonthSessions.filter((sessionItem) => sessionItem.status !== 'cancelled').length,
      completionRate,
    });
    setLoading(false);
  }, [currentWeekStart, displayedMonth, session, today, weekDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const selectedKey = toLocalISOString(selectedDate);
  const selectedSessions = sessionMap[selectedKey] || [];
  const selectedDateLabel = `${DAY_LABELS[selectedDate.getDay()]} ${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  const sessionsCardTitle = isSameDate(selectedDate, today) ? "Today's Sessions" : `Sessions on ${selectedDateLabel}`;
  const weekRangeLabel = `This week: ${formatDayMonth(weekDays[0])} - ${formatDayMonth(weekDays[6])}`;
  const calendarDays = useMemo(
    () => buildCalendarDays(displayedMonth, sessionMap, selectedDate, today),
    [displayedMonth, selectedDate, sessionMap, today]
  );

  const weekBars = useMemo(() => {
    const workWeek = weekDays.slice(0, 5);
    const counts = workWeek.map((day) => {
      const iso = toLocalISOString(day);
      const daySessions = sessionMap[iso] || [];
      const dayState = getDaySessionState(daySessions);
      const visuals = getDayStateVisuals(dayState);

      return {
        label: CALENDAR_DAY_LABELS[(day.getDay() + 6) % 7],
        count: daySessions.filter((sessionItem) => sessionItem.status !== 'cancelled').length,
        dayState,
        fill: visuals.fill,
        countClassName: visuals.countClassName,
        isSelectedWeekDay: isSameDate(day, selectedDate),
      };
    });
    const maxCount = Math.max(...counts.map((item) => item.count), 1);

    return counts.map((item) => ({
      ...item,
      width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 12 : 0)}%`,
    }));
  }, [selectedDate, sessionMap, weekDays]);

  const metricCards = [
    {
      label: 'Active Trainees',
      value: stats.activeTrainees,
      tone: 'app-accent-text',
      delta: `${stats.activeTrainees > 0 ? '+' : ''}${stats.activeTrainees} trainees`,
      deltaClassName: 'bg-[rgba(200,245,63,0.12)] text-[var(--app-accent)]',
      glow: 'radial-gradient(circle, rgba(200,245,63,0.25), transparent 70%)',
      isHighlight: true,
    },
    {
      label: 'Sessions Today',
      value: stats.todayTotal,
      tone: 'app-blue-text',
      delta: `${stats.todayRemaining} remaining`,
      deltaClassName: 'bg-[rgba(96,180,255,0.12)] text-[var(--app-blue)]',
      glow: 'radial-gradient(circle, rgba(96,180,255,0.2), transparent 70%)',
    },
    {
      label: 'Sessions This Month',
      value: stats.monthlyTotal,
      tone: 'app-purple-text',
      delta: `vs ${stats.previousMonthlyTotal} last month`,
      deltaClassName: 'bg-white/[0.06] text-white/35',
      glow: 'radial-gradient(circle, rgba(180,160,255,0.2), transparent 70%)',
    },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate}%`,
      tone: 'app-accent-text',
      delta: stats.completionRate > 0 ? `up ${Math.max(stats.completionRate - 80, 1)}%` : 'no data yet',
      deltaClassName: 'bg-[rgba(200,245,63,0.12)] text-[var(--app-accent)]',
      glow: 'radial-gradient(circle, rgba(200,245,63,0.18), transparent 70%)',
    },
  ];

  return (
    <div className="app-screen-shell relative z-10 flex h-screen flex-col overflow-hidden lg:h-full">

      <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-32 lg:px-8 lg:pb-8">
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-[20px] border p-4 lg:min-h-[170px] lg:rounded-[22px] lg:p-5 ${card.isHighlight ? 'bg-[linear-gradient(135deg,rgba(200,245,63,0.10),rgba(120,240,160,0.06))] border-[rgba(200,245,63,0.22)]' : 'app-glass-panel'}`}
            >
              <div
                className="absolute -top-5 -right-5 w-[78px] h-[78px] rounded-full pointer-events-none"
                style={{ background: card.glow }}
              />
              <p className="text-[9px] font-black uppercase tracking-[0.16em] app-label mb-2">{card.label}</p>
              <p className={`text-[34px] leading-none font-light lg:text-[42px] ${card.tone}`}>{card.value}</p>
              <div className={`inline-flex items-center mt-3 px-2.5 py-1 rounded-full text-[9px] font-black ${card.deltaClassName}`}>
                {card.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 overflow-hidden rounded-[22px] border app-glass-panel lg:rounded-[24px]">
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <div>
              <p className="text-[14px] font-black text-white">{sessionsCardTitle}</p>
              <p className="text-[10px] font-semibold app-subtle-text mt-1">{selectedDateLabel}</p>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-8 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 app-label animate-spin" />
            </div>
          ) : selectedSessions.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Dumbbell className="w-8 h-8 mx-auto mb-3 text-white/15" />
              <p className="app-label text-[10px] font-black uppercase tracking-widest">No sessions scheduled</p>
            </div>
          ) : (
            <div>
              {selectedSessions.map((sessionItem) => {
                const isCompleted = sessionItem.status === 'completed';
                const isCancelled = sessionItem.status === 'cancelled';
                const isInProgress = sessionItem.status === 'in_progress';
                const canOpenQuickLog = !isCancelled;
                const palette = getSessionPalette(sessionItem);

                return (
                  <div
                    key={sessionItem.id}
                    role={canOpenQuickLog ? 'button' : undefined}
                    tabIndex={canOpenQuickLog ? 0 : undefined}
                    onClick={canOpenQuickLog ? () => onOpenQuickLog?.(buildQuickLogSelection(sessionItem)) : undefined}
                    onKeyDown={canOpenQuickLog ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenQuickLog?.(buildQuickLogSelection(sessionItem));
                      }
                    } : undefined}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] transition-all ${
                      canOpenQuickLog ? 'cursor-pointer active:scale-[0.995]' : ''
                    } ${isCancelled ? 'opacity-70' : ''}`}
                  >
                    <div className="min-w-[52px] flex items-center gap-2 text-[11px] font-bold text-white/40">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: isCancelled ? 'rgba(255,107,107,0.6)' : palette.dot }} />
                      <span className={isCancelled ? 'line-through text-red-300/70' : ''}>{sessionItem.scheduled_time?.slice(0, 5)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sessionItem.client && onSelectClient?.(sessionItem.client);
                      }}
                      className="shrink-0 active:scale-95 transition-all"
                    >
                      <ClientAvatar
                        name={sessionItem.client?.name}
                        avatarUrl={sessionItem.client?.avatar_url || sessionItem.client?.avatar}
                        sizeClassName="w-9 h-9"
                        ringClassName="border-transparent"
                        className="shadow-none"
                        textClassName="text-[10px] font-black"
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className={`text-[15px] font-bold truncate ${isCancelled ? 'text-red-300' : 'text-white'}`}>
                        {sessionItem.client?.name || 'Unknown'}
                      </p>
                      <p className="text-[10px] font-bold app-subtle-text mt-0.5">{getSessionServiceLabel(sessionItem)}</p>
                    </div>

                    {isCompleted && (
                      <div className="px-3 py-1.5 rounded-full border border-[rgba(200,245,63,0.2)] bg-[rgba(200,245,63,0.12)] text-[10px] font-black uppercase tracking-wide app-accent-text">
                        View
                      </div>
                    )}
                    {isInProgress && (
                      <div className="px-3 py-1.5 rounded-full border border-[rgba(96,180,255,0.2)] bg-[rgba(96,180,255,0.12)] text-[10px] font-black uppercase tracking-wide app-blue-text">
                        In Progress
                      </div>
                    )}
                    {isCancelled && (
                      <div className="px-3 py-1.5 rounded-full border border-red-500/20 bg-red-500/10 text-[10px] font-black uppercase tracking-wide text-red-400">
                        Cancelled
                      </div>
                    )}
                    {!isCompleted && !isInProgress && !isCancelled && (
                      <div className="px-3 py-1.5 rounded-full border border-white/[0.07] bg-white/[0.05] text-[10px] font-black uppercase tracking-wide text-white/32">
                        Not Started
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-4">
          <div className="overflow-hidden rounded-[22px] border app-glass-panel lg:flex lg:min-h-[360px] lg:flex-col lg:rounded-[24px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
              <div>
                <p className="text-[14px] font-black text-white">Sessions This Week</p>
                <p className="text-[10px] font-semibold app-subtle-text mt-1">{weekRangeLabel}</p>
              </div>
              <p className="text-[10px] font-black tracking-wide text-[rgba(200,245,63,0.72)]">
                {stats.weeklyTotal} <span className="text-white/22">· vs {stats.previousWeeklyTotal}</span>
              </p>
            </div>

            <div className="space-y-3 px-4 py-4 lg:flex-1 lg:space-y-4 lg:py-5">
              {weekBars.map((bar) => (
                <div
                  key={bar.label}
                  className={`flex items-center gap-3 rounded-[12px] transition-all ${
                    bar.isSelectedWeekDay ? 'bg-white/[0.03] px-2 py-1 -mx-2' : ''
                  }`}
                >
                  <div className="min-w-[18px] text-[9px] font-black uppercase tracking-wide text-white/24">{bar.label}</div>
                  <div className="flex-1 h-[10px] rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: bar.width, background: bar.fill }}
                    />
                  </div>
                  <div className={`min-w-[12px] text-right text-[10px] font-black ${bar.count > 0 ? bar.countClassName : 'text-white/28'}`}>
                    {bar.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border app-glass-panel lg:flex lg:min-h-[360px] lg:flex-col lg:rounded-[24px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
              <p className="text-[14px] font-black text-white">
                {formatMonthLabel(displayedMonth)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const previousMonth = getMonthStart(addDays(displayedMonth, -1));
                    setDisplayedMonth(previousMonth);
                    setSelectedDate(previousMonth);
                  }}
                  className="w-8 h-8 rounded-[10px] border border-white/[0.07] bg-white/[0.05] flex items-center justify-center text-white/45"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextMonth = getMonthStart(addDays(getMonthEnd(displayedMonth), 1));
                    setDisplayedMonth(nextMonth);
                    setSelectedDate(nextMonth);
                  }}
                  className="w-8 h-8 rounded-[10px] border border-white/[0.07] bg-white/[0.05] flex items-center justify-center text-white/45"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-4 pb-3 lg:flex-1 lg:pt-5">
              <div className="grid grid-cols-7 gap-y-2 mb-2">
                {CALENDAR_DAY_LABELS.map((label) => (
                  <div key={label} className="text-center text-[8px] font-black uppercase tracking-wide text-white/20">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => {
                      setDisplayedMonth(getMonthStart(day.date));
                      setSelectedDate(day.date);
                    }}
                    className={`aspect-square rounded-[10px] flex items-center justify-center relative text-[11px] font-bold transition-all ${
                      day.isSelected
                        ? 'bg-[rgba(200,245,63,0.15)] border border-[rgba(200,245,63,0.28)] text-[var(--app-accent)]'
                        : day.isCurrentMonth
                          ? 'text-white/38'
                          : 'text-white/14'
                    }`}
                  >
                    {day.date.getDate()}
                    {day.hasSessions && (
                      <span
                        className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full"
                        style={{ background: day.dotColor }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 px-4 pb-4 lg:pt-1 lg:pb-5">
              <div className="flex items-center gap-2 text-[9px] font-bold text-white/24">
                <span className="w-2 h-2 rounded-full bg-[var(--app-accent)]" />
                Done
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-white/24">
                <span className="w-2 h-2 rounded-full bg-[var(--app-blue)]" />
                In Progress
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-white/24">
                <span className="w-2 h-2 rounded-full bg-white/60" />
                Scheduled
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-white/24">
                <span className="w-2 h-2 rounded-full bg-[rgba(200,245,63,0.35)] border border-[rgba(200,245,63,0.5)]" />
                Selected Day
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
