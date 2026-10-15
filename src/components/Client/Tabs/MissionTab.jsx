import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Flame, Pause, Pencil, Play, Plus, RefreshCw, Target, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { toast } from '../../../utils/toast';
import {
  notifyMissionAssigned,
  notifyMissionCreatedByTrainee,
  notifyMissionCompleted,
  fetchCoachAuthUserId,
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

const formatShortDate = (value) => {
  if (!value) return '--/--';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).formatToParts(date);
    const day = parts.find((part) => part.type === 'day')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    return day && month ? `${day}/${month}` : '--/--';
  }
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getMonthKey = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (monthKey) => {
  if (monthKey === 'Unknown') return 'Unknown';
  const [year, month] = monthKey.split('-');
  return `Tháng ${Number(month)}/${year}`;
};

const getWeekOfMonth = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Week ?';
  return `Tuần ${Math.ceil(date.getDate() / 7)}`;
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

const getCompletionRate = (completedCount, totalCount) => {
  if (!totalCount) return 0;
  return Math.round((completedCount / totalCount) * 100);
};

const getDurationDeltaLabel = (actualSeconds, targetSeconds) => {
  const delta = Math.max(0, actualSeconds - targetSeconds);
  return `+${formatElapsedTime(delta)}`;
};

const getMissionCompletionStreak = (missions) => (
  missions.filter((mission) => mission.status === 'completed').length
);

const getNextStreakMilestone = (streak) => [3, 7, 14, 30].find((milestone) => milestone > streak) || null;

const emptyDraft = () => ({
  exercise_type: 'Cardio',
  title: '',
  duration_minutes: '20',
  duration_unit: 'phút',
  perform_time: '07:00',
  start_date: todayKey(),
  end_date: todayKey(),
});

const missionToDraft = (mission) => ({
  exercise_type: mission?.exercise_type || 'Cardio',
  title: mission?.title || '',
  duration_minutes: String(mission?.duration_minutes || '20'),
  duration_unit: MISSION_UNITS.includes(mission?.duration_unit) ? mission.duration_unit : 'phút',
  perform_time: mission?.perform_time?.slice(0, 5) || '07:00',
  start_date: mission?.start_date || todayKey(),
  end_date: mission?.end_date || mission?.start_date || todayKey(),
});

const isMissionEditableByCoach = (mission) => (
  mission?.status === 'assigned'
  && getMissionElapsedSeconds(mission) === 0
  && !mission.started_at
  && !mission.completed_at
);

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
  canEdit,
  canTraineeManage,
  nowMs,
  isSaving,
  onEdit,
  onOpenDetail,
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
        <button type="button" onClick={readOnly ? undefined : onOpenDetail} className="min-w-0 flex-1 text-left" disabled={readOnly}>
          <p className="text-[9px] font-black uppercase tracking-widest text-red-300/80">{mission.exercise_type}</p>
          <h3 className="mt-1 truncate text-sm font-bold text-white">{mission.title}</h3>
        </button>
        <div className="flex items-center gap-2">
          <MissionStatusPill status={mission.status} />
          {canTraineeManage ? (
            <button
              type="button"
              onClick={onEdit}
              className="app-ghost-button inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-white/65"
              aria-label="Edit my mission"
              title="Chỉnh mission"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={readOnly ? undefined : onOpenDetail}
        disabled={readOnly}
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
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold text-white/35">
            {canEdit ? 'Editable until trainee starts' : 'Locked after start'}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="app-ghost-button inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border border-white/[0.08] px-3 text-[10px] font-black uppercase tracking-wide text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            {canEdit ? 'Edit' : 'Manage'}
          </button>
        </div>
      )}
    </div>
  );
};

const CompletedMissionRow = ({ mission }) => {
  const actualSeconds = getMissionElapsedSeconds(mission);
  const targetSeconds = getMissionTargetSeconds(mission);
  const actualLabel = formatElapsedTime(actualSeconds);
  const targetLabel = targetSeconds ? formatElapsedTime(targetSeconds) : getMissionQuantityLabel(mission);
  const completedLabel = formatDateTime(mission.completed_at);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-10 shrink-0 text-[10px] font-bold tabular-nums text-[var(--app-accent)]">
        {formatShortDate(mission.completed_at || mission.start_date)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-white">{mission.title}</p>
        <p className="mt-0.5 truncate text-[9px] text-white/35">
          {mission.exercise_type} · Target {targetLabel}{completedLabel ? ` · Done ${completedLabel}` : ''}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[10px] font-semibold text-white/85">
        {actualSeconds > 0 ? actualLabel : targetLabel}
      </span>
    </div>
  );
};

const CompletedMissionGroups = ({ groups }) => (
  <div className="space-y-3">
    {groups.map((monthGroup) => (
      <div key={monthGroup.key} className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/38">{monthGroup.label}</p>
          <span className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-300">
            {monthGroup.count} done
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {monthGroup.weeks.map((weekGroup) => (
            <div key={`${monthGroup.key}-${weekGroup.key}`} className="space-y-2">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/28">{weekGroup.key} · {weekGroup.items.length}</p>
              <div className="overflow-hidden rounded-[14px] border border-white/[0.06] bg-black/15 divide-y divide-white/[0.06]">
                {weekGroup.items.map((mission) => (
                  <CompletedMissionRow key={mission.id} mission={mission} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const CompletedMissionReport = ({ completedGroups, missions }) => {
  const latestMonth = completedGroups[0];
  if (!latestMonth) return null;

  const monthMissions = missions.filter((mission) => getMonthKey(mission.start_date) === latestMonth.key);
  const completionRate = getCompletionRate(latestMonth.count, monthMissions.length);
  const actualSeconds = latestMonth.weeks.flatMap((week) => week.items)
    .reduce((total, mission) => total + getMissionElapsedSeconds(mission), 0);
  const targetSeconds = latestMonth.weeks.flatMap((week) => week.items)
    .reduce((total, mission) => total + (getMissionTargetSeconds(mission) || 0), 0);
  const streak = getMissionCompletionStreak(missions);
  const nextMilestone = getNextStreakMilestone(streak);
  const headline = completionRate === 100 ? 'Hoàn thành tất cả mission' : 'Kết quả mission tháng này';
  const totalLabel = monthMissions.length ? `${latestMonth.count}/${monthMissions.length}` : String(latestMonth.count);

  return (
    <section className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(135deg,rgba(9,31,39,0.94),rgba(10,19,38,0.95))]">
      <div className="border-b border-white/[0.07] px-4 pb-4 pt-3.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{latestMonth.label}</p>
        <h3 className="mt-1.5 text-[17px] font-medium tracking-[-0.015em] text-white">{headline}</h3>
        <div className="mt-4 grid grid-cols-[94px_minmax(0,1fr)] items-center gap-4">
          <div className="relative grid h-[94px] w-[94px] place-items-center rounded-full bg-[conic-gradient(var(--app-accent)_0deg_360deg,rgba(255,255,255,0.08)_360deg)]">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#0a1b27] text-[21px] font-medium tracking-[-0.04em] text-white">
              {totalLabel}
            </div>
          </div>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--app-accent)]">
              <Flame className="h-3.5 w-3.5" /> Streak {streak} mission
            </p>
            <p className="mt-1 text-[17px] font-medium text-white">{getDurationDeltaLabel(actualSeconds, targetSeconds)} vượt chỉ tiêu</p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/48">
              {nextMilestone
                ? `Còn ${nextMilestone - streak} mission để mở khoá mốc ${nextMilestone}.`
                : 'Bạn đã chạm mốc Streak cao nhất.'}
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="rounded-[13px] bg-white/[0.045] px-2.5 py-2.5"><p className="text-[15px] font-medium text-white">{completionRate}%</p><p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/35">Hoàn thành</p></div>
        <div className="rounded-[13px] bg-white/[0.045] px-2.5 py-2.5"><p className="truncate text-[13px] font-medium text-white">{formatElapsedTime(actualSeconds)}</p><p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/35">Tập thực tế</p></div>
        <div className="rounded-[13px] bg-white/[0.045] px-2.5 py-2.5"><p className="truncate text-[13px] font-medium text-white">{formatElapsedTime(targetSeconds)}</p><p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/35">Chỉ tiêu</p></div>
      </div>
    </section>
  );
};

const CoachMissionComposer = ({ client, editingMission, onCancelEdit, onCancelCreate, onDeleted, onSaved, creator = 'coach' }) => {
  const isEditing = Boolean(editingMission?.id);
  const isTraineeCreator = creator === 'trainee';
  const [draft, setDraft] = useState(() => (isEditing ? missionToDraft(editingMission) : emptyDraft()));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

    if (isEditing && !isTraineeCreator && !isMissionEditableByCoach(editingMission)) {
      toast.error('Mission đã được start nên không thể chỉnh sửa.');
      onCancelEdit?.();
      return;
    }

    setIsSaving(true);
    const { data: authData } = await supabase.auth.getSession();
    const authUser = authData?.session?.user;

    const payload = {
      coach_email: client.coach_email || authUser?.email || null,
      coach_auth_user_id: isTraineeCreator ? null : (authUser?.id || null),
      client_id: client.id,
      created_by: creator,
      exercise_type: exerciseType,
      title,
      duration_minutes: duration,
      duration_unit: MISSION_UNITS.includes(draft.duration_unit) ? draft.duration_unit : 'phút',
      perform_time: draft.perform_time || null,
      start_date: draft.start_date,
      end_date: draft.end_date,
    };

    const query = isEditing
      ? isTraineeCreator
        ? supabase
          .from('missions')
          .update({ ...payload, created_by: 'trainee', updated_at: new Date().toISOString() })
          .eq('id', editingMission.id)
          .eq('created_by', 'trainee')
          .select('*')
          .maybeSingle()
        : supabase
          .from('missions')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingMission.id)
          .eq('status', 'assigned')
          .eq('elapsed_seconds', 0)
          .is('started_at', null)
          .select('*')
          .maybeSingle()
      : supabase
        .from('missions')
        .insert(payload)
        .select('*')
        .single();

    const { data, error } = await query;

    if (error) {
      toast.error(`${isEditing ? 'Không cập nhật được mission' : 'Không giao được mission'}: ${error.message}`);
      setIsSaving(false);
      return;
    }

    if (!data) {
      toast.error('Mission đã được start nên không thể chỉnh sửa.');
      setIsSaving(false);
      onCancelEdit?.();
      return;
    }

    if (!isEditing) {
      if (isTraineeCreator) {
        const coachAuthUserId = await fetchCoachAuthUserId(client.coach_email);
        await notifyMissionCreatedByTrainee({ coachAuthUserId, clientName: client.name, mission: data });
      } else {
        await notifyMissionAssigned({ clientAuthUserId: client.auth_user_id, mission: data });
      }
    }

    toast.success(isEditing ? 'Đã cập nhật mission.' : isTraineeCreator ? 'Đã tạo mission.' : 'Đã giao mission cho trainee.');
    setDraft(emptyDraft());
    setIsSaving(false);
    onSaved?.(data);
    if (isEditing) onCancelEdit?.();
  };

  const handleDelete = async () => {
    if (!isEditing || isDeleting) return;
    if (!window.confirm('Xoá mission này? Hành động này không thể hoàn tác.')) return;

    setIsDeleting(true);
    let query = supabase
      .from('missions')
      .delete()
      .eq('id', editingMission.id);

    if (isTraineeCreator) query = query.eq('created_by', 'trainee');
    const { error } = await query;
    setIsDeleting(false);

    if (error) {
      toast.error(`Không thể xoá mission: ${error.message}`);
      return;
    }

    toast.success('Đã xoá mission.');
    onDeleted?.(editingMission.id);
  };

  return (
    <form onSubmit={handleSubmit} className="app-bento-card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-red-300/80">
            {isEditing ? 'Edit Exercise' : isTraineeCreator ? 'My Mission' : 'Assign Exercise'}
          </p>
          <h3 className="mt-1 text-sm font-bold text-white">
            {isEditing ? 'Chỉnh mission trước khi start' : isTraineeCreator ? 'Tạo mission cho tôi' : 'Mission mới'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isEditing || isTraineeCreator ? (
            <button
              type="button"
              onClick={isEditing ? onCancelEdit : onCancelCreate}
              className="app-ghost-button inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/[0.08] text-white/70"
              aria-label={isEditing ? 'Cancel edit' : 'Close new mission form'}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isSaving}
            className="app-cta-button inline-flex h-10 w-10 items-center justify-center rounded-[16px] text-black disabled:opacity-50"
            aria-label={isEditing ? 'Update mission' : isTraineeCreator ? 'Create mission' : 'Assign mission'}
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : isEditing ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
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

      {isEditing ? (
        <button
          type="button"
          onClick={() => { void handleDelete(); }}
          disabled={isSaving || isDeleting}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[14px] border border-red-400/25 bg-red-500/[0.08] px-4 text-[10px] font-black uppercase tracking-wide text-red-300 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          {isDeleting ? 'Deleting' : 'Delete mission'}
        </button>
      ) : null}
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
  const [editingMission, setEditingMission] = useState(null);
  const [showTraineeComposer, setShowTraineeComposer] = useState(false);
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
    const completed = missions
      .filter((mission) => mission.status === 'completed')
      .sort((left, right) => {
        const leftTime = parseDateMs(left.completed_at || left.updated_at || left.created_at) || 0;
        const rightTime = parseDateMs(right.completed_at || right.updated_at || right.created_at) || 0;
        return rightTime - leftTime;
      });
    return { active, completed };
  }, [missions]);

  const completedGroups = useMemo(() => {
    const monthMap = new Map();

    grouped.completed.forEach((mission) => {
      const completedAt = mission.completed_at || mission.updated_at || mission.created_at;
      const monthKey = getMonthKey(completedAt);
      const weekKey = getWeekOfMonth(completedAt);

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          key: monthKey,
          label: getMonthLabel(monthKey),
          count: 0,
          weekMap: new Map(),
        });
      }

      const monthGroup = monthMap.get(monthKey);
      monthGroup.count += 1;

      if (!monthGroup.weekMap.has(weekKey)) {
        monthGroup.weekMap.set(weekKey, { key: weekKey, items: [] });
      }

      monthGroup.weekMap.get(weekKey).items.push(mission);
    });

    return Array.from(monthMap.values()).map((monthGroup) => ({
      key: monthGroup.key,
      label: monthGroup.label,
      count: monthGroup.count,
      weeks: Array.from(monthGroup.weekMap.values()),
    }));
  }, [grouped.completed]);

  const handleUpdated = (updatedMission) => {
    setMissions((prev) => prev.map((item) => (item.id === updatedMission.id ? updatedMission : item)));
    setSelectedMission(updatedMission);
    if (editingMission?.id === updatedMission.id && !isMissionEditableByCoach(updatedMission)) {
      setEditingMission(null);
    }
  };

  const handleCoachSaved = (savedMission) => {
    setMissions((prev) => {
      const exists = prev.some((item) => item.id === savedMission.id);
      if (!exists) return [savedMission, ...prev];
      return prev.map((item) => (item.id === savedMission.id ? savedMission : item));
    });
    setSelectedMission((prev) => (prev?.id === savedMission.id ? savedMission : prev));
    setEditingMission(null);
  };

  const handleMissionDeleted = (missionId) => {
    setMissions((prev) => prev.filter((mission) => mission.id !== missionId));
    setSelectedMission((prev) => (prev?.id === missionId ? null : prev));
    setEditingMission(null);
    setShowTraineeComposer(false);
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
      patch.completed_at = nowIso;
    }

    const response = await supabase
      .from('missions')
      .update(patch)
      .eq('id', mission.id)
      .select('*')
      .single();

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
      {!readOnly || showTraineeComposer || (readOnly && editingMission) ? (
        <CoachMissionComposer
          key={editingMission?.id || `new-mission-${showTraineeComposer}`}
          client={client}
          editingMission={editingMission}
          onCancelEdit={() => {
            setEditingMission(null);
            if (readOnly) setShowTraineeComposer(false);
          }}
          onCancelCreate={() => setShowTraineeComposer(false)}
          onDeleted={handleMissionDeleted}
          onSaved={(savedMission) => {
            handleCoachSaved(savedMission);
            if (readOnly) setShowTraineeComposer(false);
          }}
          creator={readOnly ? 'trainee' : 'coach'}
        />
      ) : null}

      {isLoading ? (
        <div className="app-bento-card flex items-center justify-center p-8">
          <RefreshCw className="h-5 w-5 animate-spin text-white/35" />
        </div>
      ) : missions.length === 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Active · 0</p>
            {readOnly && !showTraineeComposer ? (
              <button
                type="button"
                onClick={() => setShowTraineeComposer(true)}
                className="app-cta-button inline-flex h-10 w-10 items-center justify-center rounded-full text-black shadow-[0_0_20px_rgba(200,245,63,0.18)] transition-transform active:scale-95"
                aria-label="Create mission"
                title="Tạo mission"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
            ) : null}
          </div>
          <div className="app-bento-card px-5 py-8 text-center">
            <Target className="mx-auto h-6 w-6 text-white/20" />
            <p className="mt-3 text-sm font-semibold text-white">No missions yet</p>
            <p className="mt-1 text-[11px] text-white/42">
              {readOnly ? 'Tạo mission đầu tiên cho chính bạn bằng nút +.' : 'Giao bài tập đầu tiên cho trainee từ form phía trên.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Active · {grouped.active.length}</p>
              {readOnly && !showTraineeComposer ? (
                <button
                  type="button"
                  onClick={() => setShowTraineeComposer(true)}
                  className="app-cta-button inline-flex h-10 w-10 items-center justify-center rounded-full text-black shadow-[0_0_20px_rgba(200,245,63,0.18)] transition-transform active:scale-95"
                  aria-label="Create mission"
                  title="Tạo mission"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>
              ) : null}
            </div>
            {grouped.active.length > 0 ? grouped.active.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                readOnly={readOnly}
                canEdit={!readOnly && isMissionEditableByCoach(mission)}
                canTraineeManage={readOnly && mission.created_by === 'trainee'}
                nowMs={nowMs}
                isSaving={savingMissionId === mission.id}
                isSelected={selectedMission?.id === mission.id}
                onEdit={() => {
                  setEditingMission(mission);
                  setSelectedMission(null);
                  if (readOnly) setShowTraineeComposer(true);
                }}
                onOpenDetail={() => setSelectedMission(mission)}
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
              <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Completed history · {grouped.completed.length}</p>
              <CompletedMissionReport completedGroups={completedGroups} missions={missions} />
              <CompletedMissionGroups groups={completedGroups} />
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
