import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Pause, Play, Plus, RefreshCw, Target, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { toast } from '../../../utils/toast';
import {
  notifyMissionAssigned,
  notifyMissionCompleted,
} from '../../../utils/notificationUtils';

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatDate = (value) => {
  if (!value) return '--';
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const statusMeta = {
  assigned: { label: 'Assigned', className: 'border-white/[0.08] bg-white/[0.04] text-white/45' },
  in_progress: { label: 'In Progress', className: 'border-blue-500/25 bg-blue-500/10 text-blue-300' },
  paused: { label: 'Paused', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  completed: { label: 'Completed', className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' },
};

const MISSION_UNITS = ['phút', 'km', 'rep', 'set'];

const getMissionQuantityLabel = (mission) =>
  `${mission.duration_minutes} ${mission.duration_unit || 'phút'}`;

const parseDateMs = (value) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const getMissionElapsedSeconds = (mission, nowMs = Date.now()) => {
  const storedSeconds = Math.max(0, Number(mission.elapsed_seconds) || 0);
  if (mission.status !== 'in_progress') return storedSeconds;

  const startedMs = parseDateMs(mission.started_at);
  if (!startedMs) return storedSeconds;

  return storedSeconds + Math.max(0, Math.floor((nowMs - startedMs) / 1000));
};

const getMissionTargetSeconds = (mission) => (
  (mission.duration_unit || 'phút') === 'phút'
    ? Math.max(0, Number(mission.duration_minutes) || 0) * 60
    : null
);

const formatElapsedTime = (totalSeconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
};

const getTimerLabel = (mission, nowMs) => {
  const elapsed = getMissionElapsedSeconds(mission, nowMs);
  const target = getMissionTargetSeconds(mission);
  if (!target) return formatElapsedTime(elapsed);
  return `${formatElapsedTime(elapsed)} / ${formatElapsedTime(target)}`;
};

const emptyDraft = () => ({
  exercise_type: 'Cardio',
  title: '',
  duration_minutes: '20',
  duration_unit: 'phút',
  perform_time: '07:00',
  start_date: todayKey(),
  end_date: todayKey(),
});

const MissionStatusPill = ({ status }) => {
  const meta = statusMeta[status] || statusMeta.assigned;
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const MissionActionButton = ({ icon, label, disabled, variant = 'ghost', onClick }) => {
  const IconComponent = icon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[14px] px-2.5 py-2 text-[11px] font-bold transition-all active:scale-[0.98] disabled:opacity-35 ${
        variant === 'primary'
          ? 'app-cta-button text-black'
          : 'app-ghost-button border border-white/[0.08] text-white'
      }`}
    >
      <IconComponent className="h-3.5 w-3.5" />
      {label}
    </button>
  );
};

const MissionCard = ({
  mission,
  isSelected,
  readOnly,
  nowMs,
  isSaving,
  onOpenDetail,
  onCloseDetail,
  onStatusChange,
}) => {
  const elapsed = getMissionElapsedSeconds(mission, nowMs);
  const targetSeconds = getMissionTargetSeconds(mission);
  const progress = targetSeconds ? Math.min((elapsed / targetSeconds) * 100, 100) : 0;
  const canStart = readOnly && mission.status !== 'completed' && mission.status !== 'in_progress';
  const canPause = readOnly && mission.status === 'in_progress';
  const canDone = readOnly && mission.status !== 'completed';

  return (
    <div
      className={`w-full rounded-[20px] border p-4 text-left transition-all ${
        isSelected
          ? 'border-red-400/35 bg-red-500/[0.08]'
          : 'border-white/[0.06] bg-white/[0.025]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpenDetail} className="min-w-0 flex-1 text-left">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-300/80">{mission.exercise_type}</p>
          <h3 className="mt-1 truncate text-sm font-bold text-white">{mission.title}</h3>
        </button>
        <MissionStatusPill status={mission.status} />
      </div>

      <button
        type="button"
        onClick={onOpenDetail}
        className="mt-3 grid w-full grid-cols-1 gap-2 text-left text-[10px] font-semibold text-white/45 sm:grid-cols-2"
      >
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          {getMissionQuantityLabel(mission)} · {mission.perform_time?.slice(0, 5) || '--:--'}
        </span>
        <span className="inline-flex items-center gap-1.5 sm:justify-end sm:text-right">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(mission.start_date)} - {formatDate(mission.end_date)}
        </span>
      </button>

      {readOnly ? (
        <>
          <div className="mt-3 rounded-[16px] border border-white/[0.06] bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Timer</span>
              <span className="font-mono text-sm font-bold text-white">{getTimerLabel(mission, nowMs)}</span>
            </div>
            {targetSeconds ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${progress}%` }} />
              </div>
            ) : null}
          </div>

          {isSelected ? (
            <div className="mt-3 rounded-[16px] border border-red-400/15 bg-red-500/[0.06] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-widest text-red-200/55">Nội dung coach giao</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-white">{mission.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                    {mission.exercise_type} · {getMissionQuantityLabel(mission)} · {mission.perform_time?.slice(0, 5) || '--:--'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseDetail}
                  className="app-ghost-button inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-white/70"
                  aria-label="Close mission detail"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MissionActionButton
              icon={Play}
              label={mission.status === 'paused' ? 'Resume' : 'Start'}
              disabled={!canStart || isSaving}
              onClick={() => onStatusChange(mission, 'in_progress')}
            />
            <MissionActionButton
              icon={Pause}
              label="Pause"
              disabled={!canPause || isSaving}
              onClick={() => onStatusChange(mission, 'paused')}
            />
            <MissionActionButton
              icon={CheckCircle2}
              label="Done"
              variant="primary"
              disabled={!canDone || isSaving}
              onClick={() => onStatusChange(mission, 'completed')}
            />
          </div>
        </>
      ) : null}
    </div>
  );
};

const CoachMissionComposer = ({ client, onCreated }) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);

  const updateDraft = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = draft.title.trim();
    const exerciseType = draft.exercise_type.trim();
    const duration = Number.parseInt(draft.duration_minutes, 10);

    if (!title || !exerciseType || !duration || duration <= 0 || !draft.start_date || !draft.end_date) {
      toast.error('Điền đủ loại bài, tên, số lượng, đơn vị, ngày bắt đầu và ngày kết thúc.');
      return;
    }

    if (draft.end_date < draft.start_date) {
      toast.error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
      return;
    }

    setIsSaving(true);
    const { data: authData } = await supabase.auth.getSession();
    const authUser = authData?.session?.user;

    const payload = {
      coach_email: client.coach_email || authUser?.email,
      coach_auth_user_id: authUser?.id || null,
      client_id: client.id,
      exercise_type: exerciseType,
      title,
      duration_minutes: duration,
      duration_unit: MISSION_UNITS.includes(draft.duration_unit) ? draft.duration_unit : 'phút',
      perform_time: draft.perform_time || null,
      start_date: draft.start_date,
      end_date: draft.end_date,
    };

    const { data, error } = await supabase
      .from('missions')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      toast.error(`Không giao được mission: ${error.message}`);
      setIsSaving(false);
      return;
    }

    await notifyMissionAssigned({ clientAuthUserId: client.auth_user_id, mission: data });
    toast.success('Đã giao mission cho trainee.');
    setDraft(emptyDraft());
    setIsSaving(false);
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit} className="app-bento-card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-red-300/80">Assign Exercise</p>
          <h3 className="mt-1 text-sm font-bold text-white">Mission mới</h3>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="app-cta-button inline-flex h-10 w-10 items-center justify-center rounded-[16px] text-black disabled:opacity-50"
          aria-label="Assign mission"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={draft.exercise_type}
          onChange={(event) => updateDraft('exercise_type', event.target.value)}
          placeholder="Loại bài tập"
          className="rounded-[16px] border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-red-400/45"
        />
        <input
          value={draft.title}
          onChange={(event) => updateDraft('title', event.target.value)}
          placeholder="Tên bài / mission"
          className="rounded-[16px] border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-red-400/45"
        />
        <div className="flex overflow-hidden rounded-[16px] border border-white/[0.08] bg-black/40 transition-all focus-within:border-red-400/45">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft.duration_minutes}
            onChange={(event) => updateDraft('duration_minutes', event.target.value.replace(/\D/g, ''))}
            placeholder="Số lượng"
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none"
          />
          <select
            value={draft.duration_unit}
            onChange={(event) => updateDraft('duration_unit', event.target.value)}
            className="w-[92px] border-l border-white/[0.08] bg-black/50 px-2 py-3 text-sm font-semibold text-white outline-none"
            aria-label="Mission unit"
          >
            {MISSION_UNITS.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
        <input
          type="time"
          value={draft.perform_time}
          onChange={(event) => updateDraft('perform_time', event.target.value)}
          className="rounded-[16px] border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-red-400/45"
        />
        <input
          type="date"
          value={draft.start_date}
          onChange={(event) => updateDraft('start_date', event.target.value)}
          className="rounded-[16px] border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-red-400/45"
        />
        <input
          type="date"
          value={draft.end_date}
          onChange={(event) => updateDraft('end_date', event.target.value)}
          className="rounded-[16px] border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-red-400/45"
        />
      </div>
    </form>
  );
};

const MissionDetail = ({ mission, nowMs, onClose }) => {
  if (!mission) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center px-4 py-4 lg:items-center">
      <button
        type="button"
        aria-label="Dismiss overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 max-h-[min(82dvh,680px)] w-full max-w-[440px] overflow-y-auto rounded-[28px] border border-white/10 bg-[var(--app-bg-dialog)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-300/80">Mission Detail</p>
            <h2 className="mt-1 text-lg font-bold text-white">{mission.title}</h2>
            <p className="mt-1 text-[11px] font-semibold text-white/42">{mission.exercise_type}</p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="app-ghost-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-white/70"
            aria-label="Close mission detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-[18px] border border-red-400/15 bg-red-500/[0.06] p-4">
          <p className="text-[8px] font-black uppercase tracking-widest text-red-200/55">Nội dung coach giao</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-white">{mission.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            {mission.exercise_type} · {getMissionQuantityLabel(mission)} · {mission.perform_time?.slice(0, 5) || '--:--'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Quantity</p>
            <p className="mt-1 text-sm font-bold text-white">{getMissionQuantityLabel(mission)}</p>
          </div>
          <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Time</p>
            <p className="mt-1 text-sm font-bold text-white">{mission.perform_time?.slice(0, 5) || '--:--'}</p>
          </div>
          <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">From</p>
            <p className="mt-1 text-sm font-bold text-white">{formatDate(mission.start_date)}</p>
          </div>
          <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/30">To</p>
            <p className="mt-1 text-sm font-bold text-white">{formatDate(mission.end_date)}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Status</span>
          <MissionStatusPill status={mission.status} />
        </div>

        <div className="mt-4 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Timer</span>
            <span className="font-mono text-sm font-bold text-white">{getTimerLabel(mission, nowMs)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MissionTab = ({ client, readOnly = false }) => {
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingMissionId, setSavingMissionId] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const clientId = client?.id;

  const fetchMissions = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('client_id', clientId)
      .order('start_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(`Không tải được missions: ${error.message}`);
      setMissions([]);
    } else {
      setMissions(data || []);
    }
    setIsLoading(false);
  }, [clientId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchMissions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchMissions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const grouped = useMemo(() => {
    const active = missions.filter((mission) => mission.status !== 'completed');
    const completed = missions.filter((mission) => mission.status === 'completed');
    return { active, completed };
  }, [missions]);

  const handleUpdated = (updatedMission) => {
    setMissions((prev) => prev.map((item) => (item.id === updatedMission.id ? updatedMission : item)));
    setSelectedMission(updatedMission);
  };

  const updateMissionStatus = async (mission, status) => {
    setSavingMissionId(mission.id);
    const nowIso = new Date().toISOString();
    const elapsedSeconds = getMissionElapsedSeconds(mission, Date.now());
    const patch = {
      status,
      updated_at: nowIso,
      elapsed_seconds: elapsedSeconds,
    };

    if (status === 'in_progress') {
      patch.started_at = nowIso;
      patch.paused_at = null;
    }

    if (status === 'paused') {
      patch.started_at = null;
      patch.paused_at = nowIso;
    }

    if (status === 'completed') {
      patch.started_at = null;
      patch.paused_at = null;
      patch.completed_at = mission.completed_at || nowIso;
    }

    let response = await supabase
      .from('missions')
      .update(patch)
      .eq('id', mission.id)
      .select('*')
      .single();

    if (response.error && response.error.message?.includes('elapsed_seconds')) {
      const fallbackPatch = { ...patch };
      delete fallbackPatch.elapsed_seconds;
      response = await supabase
        .from('missions')
        .update(fallbackPatch)
        .eq('id', mission.id)
        .select('*')
        .single();
    }

    const { data, error } = response;

    if (error) {
      toast.error(`Không cập nhật được mission: ${error.message}`);
      setSavingMissionId(null);
      return;
    }

    if (status === 'completed' && mission.status !== 'completed') {
      await notifyMissionCompleted({
        coachAuthUserId: data.coach_auth_user_id,
        clientName: client?.name,
        mission: data,
      });
      toast.success('Mission đã done. Coach đã nhận thông báo.');
    } else {
      toast.success('Đã cập nhật mission.');
    }

    handleUpdated(data);
    setSavingMissionId(null);
  };

  return (
    <div className="space-y-4 animate-tab-in">
      {!readOnly ? (
        <CoachMissionComposer client={client} onCreated={fetchMissions} />
      ) : null}

      {isLoading ? (
        <div className="app-bento-card flex items-center justify-center p-8">
          <RefreshCw className="h-5 w-5 animate-spin text-white/35" />
        </div>
      ) : missions.length === 0 ? (
        <div className="app-bento-card px-5 py-8 text-center">
          <Target className="mx-auto h-6 w-6 text-white/20" />
          <p className="mt-3 text-sm font-semibold text-white">No missions yet</p>
          <p className="mt-1 text-[11px] text-white/42">
            {readOnly ? 'Mission được coach giao sẽ xuất hiện ở đây.' : 'Giao bài tập đầu tiên cho trainee từ form phía trên.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="space-y-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Active · {grouped.active.length}</p>
            {grouped.active.length > 0 ? grouped.active.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                readOnly={readOnly}
                nowMs={nowMs}
                isSaving={savingMissionId === mission.id}
                isSelected={selectedMission?.id === mission.id}
                onOpenDetail={() => setSelectedMission(mission)}
                onCloseDetail={() => setSelectedMission(null)}
                onStatusChange={updateMissionStatus}
              />
            )) : (
              <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[11px] text-white/35">
                Không còn mission đang mở.
              </div>
            )}
          </section>

          {grouped.completed.length > 0 ? (
            <section className="space-y-2.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Completed · {grouped.completed.length}</p>
              {grouped.completed.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  readOnly={readOnly}
                  nowMs={nowMs}
                  isSaving={savingMissionId === mission.id}
                  isSelected={selectedMission?.id === mission.id}
                  onOpenDetail={() => setSelectedMission(mission)}
                  onCloseDetail={() => setSelectedMission(null)}
                  onStatusChange={updateMissionStatus}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}

      {selectedMission && !readOnly ? (
        <MissionDetail
          mission={selectedMission}
          nowMs={nowMs}
          onClose={() => setSelectedMission(null)}
        />
      ) : null}
    </div>
  );
};

export default MissionTab;
