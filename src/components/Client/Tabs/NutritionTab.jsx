import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  RefreshCw,
  Save,
  ShoppingCart,
  Target,
  Utensils,
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import {
  NUTRITION_ARCHIVE_FIELDS,
  buildNutritionProfileFromSource,
  buildNutritionSyncAudit,
  buildPhoneCandidates,
  createDefaultNutritionCheckin,
  ensureNutritionPlan,
  ensureNutritionPrep,
  ensureNutritionTargets,
  normalizeSurveyResponseRecord,
} from '../../../utils/nutritionUtils';

const SCORE_OPTIONS = [
  { value: '1', label: '1/5' },
  { value: '2', label: '2/5' },
  { value: '3', label: '3/5' },
  { value: '4', label: '4/5' },
  { value: '5', label: '5/5' },
];

const SYNC_STATUS_META = {
  synced: {
    label: 'Khớp',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  },
  mismatch: {
    label: 'Lệch',
    className: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
  },
  missing_in_client: {
    label: 'Thiếu ở client',
    className: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
  },
  missing_in_form: {
    label: 'Thiếu ở form',
    className: 'border-orange-500/20 bg-orange-500/10 text-orange-200',
  },
  empty: {
    label: 'Trống',
    className: 'border-white/10 bg-white/[0.03] text-neutral-500',
  },
};

const isFilled = (value) => String(value ?? '').trim().length > 0;

const parseNumberOrNull = (value) => {
  if (!isFilled(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDateLabel = (value) => {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTimestampLabel = (value) => {
  if (!value) return 'Chưa sync';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const SectionCard = ({ icon, title, subtitle, accentClassName = 'text-white', children, action }) => (
  <div className="overflow-hidden rounded-[30px] border border-white/[0.06] bg-white/[0.02] shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-sm">
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.05] px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/[0.08] bg-black/30">
          {React.createElement(icon, { className: `h-5 w-5 ${accentClassName}` })}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-600">{title}</p>
          {subtitle && <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

const MetricCard = ({ label, value, hint, tone = 'text-white' }) => (
  <div className="rounded-[22px] border border-white/[0.06] bg-black/25 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
    <p className={`mt-2 text-2xl font-light ${tone}`}>{value === null || value === undefined || value === '' ? '--' : value}</p>
    {hint && <p className="mt-2 text-[11px] text-neutral-500">{hint}</p>}
  </div>
);

const InputField = ({ label, value, onChange, placeholder, type = 'text', min, max, disabled = false }) => (
  <label className="space-y-2">
    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</span>
    <input
      type={type}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-[16px] border border-white/[0.08] bg-black/35 px-4 py-3 text-sm text-white outline-none transition-all focus:border-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
);

const TextAreaField = ({ label, value, onChange, placeholder, rows = 3, disabled = false }) => (
  <label className="space-y-2">
    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</span>
    <textarea
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full resize-none rounded-[16px] border border-white/[0.08] bg-black/35 px-4 py-3 text-sm leading-relaxed text-white outline-none transition-all focus:border-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
);

const ReadOnlyBlock = ({ label, value, placeholder = '--' }) => (
  <div className="space-y-2 rounded-[18px] border border-white/[0.05] bg-black/20 p-4">
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
    <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">{isFilled(value) ? value : placeholder}</p>
  </div>
);

const ScoreField = ({ label, value, onChange, disabled = false }) => (
  <label className="space-y-2">
    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="w-full rounded-[16px] border border-white/[0.08] bg-black/35 px-4 py-3 text-sm text-white outline-none transition-all focus:border-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {SCORE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const SaveButton = ({ onClick, isSaving, label = 'Lưu thay đổi', className = '' }) => (
  <button
    onClick={onClick}
    disabled={isSaving}
    className={`inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
    {label}
  </button>
);

const NutritionTab = ({ client, readOnly = false }) => {
  const [archive, setArchive] = useState(() => buildNutritionProfileFromSource(client));
  const [targets, setTargets] = useState(() => ensureNutritionTargets(client?.nutrition_targets));
  const [plan, setPlan] = useState(() => ensureNutritionPlan(client?.nutrition_plan));
  const [prep, setPrep] = useState(() => ensureNutritionPrep(client?.nutrition_prep));
  const [checkins, setCheckins] = useState([]);
  const [checkinForm, setCheckinForm] = useState(createDefaultNutritionCheckin());

  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isSavingPrep, setIsSavingPrep] = useState(false);
  const [isSavingCheckin, setIsSavingCheckin] = useState(false);

  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [syncAudit, setSyncAudit] = useState(null);
  const [surveyProfile, setSurveyProfile] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [checkinError, setCheckinError] = useState('');
  const [nutritionSyncedAt, setNutritionSyncedAt] = useState(client?.nutrition_profile_synced_at || '');

  useEffect(() => {
    setArchive(buildNutritionProfileFromSource(client));
    setTargets(ensureNutritionTargets(client?.nutrition_targets));
    setPlan(ensureNutritionPlan(client?.nutrition_plan));
    setPrep(ensureNutritionPrep(client?.nutrition_prep));
    setNutritionSyncedAt(client?.nutrition_profile_synced_at || '');
  }, [client]);

  const fetchCheckins = useCallback(async () => {
    if (!client?.id) return;
    const { data, error } = await supabase
      .from('nutrition_checkins')
      .select('*')
      .eq('client_id', client.id)
      .order('checkin_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(readOnly ? 6 : 12);

    if (error) {
      const message = String(error.message || '');
      if (message.includes('nutrition_checkins')) {
        setCheckinError('Bảng nutrition_checkins chưa có. Cần chạy migration SQL phần nutrition trước.');
      } else {
        setCheckinError(message);
      }
      setCheckins([]);
      return;
    }

    setCheckinError('');
    setCheckins(data || []);
  }, [client?.id, readOnly]);

  const runSyncAudit = useCallback(async () => {
    if (readOnly || !client?.phone) return;
    setIsCheckingSync(true);
    setSyncError('');

    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .in('phone', buildPhoneCandidates(client.phone))
        .limit(10);

      if (error) throw error;

      const matchedRow = (data || [])[0];
      if (!matchedRow) {
        setSurveyProfile(null);
        setSyncAudit(null);
        setSyncError('Không tìm thấy response trong survey_responses cho số điện thoại hiện tại.');
        return;
      }

      const normalizedSurvey = normalizeSurveyResponseRecord(matchedRow);
      const surveyArchive = buildNutritionProfileFromSource(normalizedSurvey);

      setSurveyProfile(surveyArchive);
      setSyncAudit(buildNutritionSyncAudit(archive, surveyArchive));
    } catch (error) {
      setSyncError(error.message || 'Không thể kiểm tra đồng bộ với survey.');
    } finally {
      setIsCheckingSync(false);
    }
  }, [archive, client?.phone, readOnly]);

  useEffect(() => {
    void fetchCheckins();
  }, [fetchCheckins]);

  useEffect(() => {
    if (!readOnly) {
      void runSyncAudit();
    }
  }, [readOnly, runSyncAudit]);

  const saveClientJsonFields = async (payload, onSuccess, setSaving) => {
    if (!client?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({
        ...payload,
        nutrition_updated_at: new Date().toISOString(),
      })
      .eq('id', client.id);

    setSaving(false);

    if (error) {
      const message = String(error.message || '');
      if (message.includes('nutrition_')) {
        alert('Thiếu cột nutrition mới trong bảng clients. Hãy chạy migration SQL phần nutrition trước.');
      } else {
        alert(`Không thể lưu: ${message}`);
      }
      return;
    }

    onSuccess?.();
    alert('Đã lưu thay đổi.');
  };

  const handleSaveTargets = () => {
    void saveClientJsonFields(
      { nutrition_targets: targets },
      () => setTargets({ ...targets }),
      setIsSavingTargets,
    );
  };

  const handleSavePlan = () => {
    void saveClientJsonFields(
      { nutrition_plan: plan },
      () => setPlan(ensureNutritionPlan(plan)),
      setIsSavingPlan,
    );
  };

  const handleSavePrep = () => {
    void saveClientJsonFields(
      { nutrition_prep: prep },
      () => setPrep({ ...prep }),
      setIsSavingPrep,
    );
  };

  const handleResyncFromSurvey = async () => {
    if (!client?.id || !surveyProfile) return;
    setIsResyncing(true);

    const payload = Object.entries(surveyProfile).reduce((acc, [key, value]) => {
      if (isFilled(value)) acc[key] = value;
      return acc;
    }, {});
    const syncedAt = new Date().toISOString();

    const { error } = await supabase
      .from('clients')
      .update({
        ...payload,
        nutrition_profile_synced_at: syncedAt,
      })
      .eq('id', client.id);

    setIsResyncing(false);

    if (error) {
      alert(`Không thể resync dữ liệu từ Google Form: ${error.message}`);
      return;
    }

    const mergedArchive = { ...archive, ...payload };
    setArchive(mergedArchive);
    setNutritionSyncedAt(syncedAt);
    setSyncAudit(buildNutritionSyncAudit(mergedArchive, surveyProfile));
    alert('Đã copy lại dữ liệu intake từ Google Form sang hồ sơ client.');
  };

  const handleSaveCheckin = async () => {
    if (!client?.id) return;
    setIsSavingCheckin(true);

    const payload = {
      client_id: client.id,
      coach_email: client.coach_email || null,
      checkin_date: checkinForm.checkin_date,
      avg_weight: parseNumberOrNull(checkinForm.avg_weight),
      adherence_score: parseNumberOrNull(checkinForm.adherence_score),
      calories_avg: parseNumberOrNull(checkinForm.calories_avg),
      protein_avg: parseNumberOrNull(checkinForm.protein_avg),
      steps_avg: parseNumberOrNull(checkinForm.steps_avg),
      water_liters: parseNumberOrNull(checkinForm.water_liters),
      hunger_score: parseNumberOrNull(checkinForm.hunger_score),
      energy_score: parseNumberOrNull(checkinForm.energy_score),
      digestion_score: parseNumberOrNull(checkinForm.digestion_score),
      sleep_score: parseNumberOrNull(checkinForm.sleep_score),
      wins: checkinForm.wins.trim() || null,
      blockers: checkinForm.blockers.trim() || null,
      coach_adjustments: checkinForm.coach_adjustments.trim() || null,
    };

    const { error } = await supabase.from('nutrition_checkins').insert([payload]);
    setIsSavingCheckin(false);

    if (error) {
      alert(`Không thể lưu check-in: ${error.message}`);
      return;
    }

    setCheckinForm(createDefaultNutritionCheckin());
    await fetchCheckins();
    alert('Đã lưu nutrition check-in.');
  };

  const latestCheckin = checkins[0] || null;
  const filledPlanDays = useMemo(
    () =>
      (plan.days || []).filter((day) =>
        [day.context, day.breakfast, day.lunch, day.dinner, day.snack].some((value) => isFilled(value)),
      ),
    [plan.days],
  );

  const updatePlanDay = (index, field, value) => {
    setPlan((prev) => ({
      ...prev,
      days: prev.days.map((day, dayIndex) => (dayIndex === index ? { ...day, [field]: value } : day)),
    }));
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {!readOnly && (
        <SectionCard
          icon={ClipboardList}
          title="Google Form Sync"
          subtitle="Luồng hiện tại là copy dữ liệu từ survey_responses sang clients theo số điện thoại, không phải đồng bộ realtime. Phần này giúp kiểm tra lệch dữ liệu intake trước khi coach lên plan."
          accentClassName="text-blue-300"
          action={
            <button
              onClick={() => void runSyncAudit()}
              disabled={isCheckingSync}
              className="inline-flex items-center gap-2 rounded-[16px] border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-blue-200 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCheckingSync ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Check Sync
            </button>
          }
        >
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Lần sync gần nhất" value={formatTimestampLabel(nutritionSyncedAt)} tone="text-blue-200 text-base" />
            <MetricCard label="Khớp" value={syncAudit?.counts.synced ?? '--'} tone="text-emerald-300" />
            <MetricCard label="Lệch" value={syncAudit?.counts.mismatch ?? '--'} tone="text-yellow-200" />
            <MetricCard label="Thiếu ở client" value={syncAudit?.counts.missingInClient ?? '--'} tone="text-blue-200" />
          </div>

          {syncError && (
            <div className="mt-4 rounded-[20px] border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
              {syncError}
            </div>
          )}

          {syncAudit?.items?.length > 0 && (
            <div className="mt-5 space-y-3">
              {syncAudit.items.map((item) => {
                const meta = SYNC_STATUS_META[item.status];
                return (
                  <div key={item.key} className="rounded-[20px] border border-white/[0.05] bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[16px] border border-white/[0.05] bg-white/[0.02] p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600">Client</p>
                        <p className="mt-2 text-sm leading-relaxed text-white">{isFilled(item.clientValue) ? item.clientValue : '--'}</p>
                      </div>
                      <div className="rounded-[16px] border border-white/[0.05] bg-white/[0.02] p-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600">Google Form</p>
                        <p className="mt-2 text-sm leading-relaxed text-white">{isFilled(item.surveyValue) ? item.surveyValue : '--'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleResyncFromSurvey}
                  disabled={isResyncing || !surveyProfile}
                  className="inline-flex items-center gap-2 rounded-[16px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Resync Hồ Sơ Intake
                </button>
                <p className="text-xs text-neutral-500">
                  App chỉ ghi đè các field có dữ liệu từ form, không xóa những ghi chú coach đã thêm sau này.
                </p>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard
        icon={Target}
        title="Macro & Target"
        subtitle="Target trung tâm cho giai đoạn hiện tại. Đây là phần coach cập nhật trước, sau đó meal plan và check-in sẽ bám theo."
        accentClassName="text-emerald-300"
        action={!readOnly ? <SaveButton onClick={handleSaveTargets} isSaving={isSavingTargets} /> : null}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Calories" value={targets.calories ? `${targets.calories}` : '--'} hint="kcal/ngày" tone="text-orange-200" />
          <MetricCard label="Protein" value={targets.protein ? `${targets.protein}` : '--'} hint="g/ngày" tone="text-blue-200" />
          <MetricCard label="Carbs" value={targets.carbs ? `${targets.carbs}` : '--'} hint="g/ngày" tone="text-white" />
          <MetricCard label="Fat" value={targets.fat ? `${targets.fat}` : '--'} hint="g/ngày" tone="text-yellow-200" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {readOnly ? (
            <>
              <ReadOnlyBlock label="Chất xơ" value={targets.fiber ? `${targets.fiber} g/ngày` : ''} />
              <ReadOnlyBlock label="Nước" value={targets.water ? `${targets.water} l/ngày` : ''} />
              <ReadOnlyBlock label="Số bữa / ngày" value={targets.mealsPerDay} />
              <ReadOnlyBlock label="Step target" value={targets.stepTarget} />
              <ReadOnlyBlock label="Supplement protocol" value={targets.supplementsPlan} />
              <ReadOnlyBlock label="Nutrition strategy" value={targets.strategyNotes} />
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField label="Calories" value={targets.calories} onChange={(value) => setTargets((prev) => ({ ...prev, calories: value }))} placeholder="Ví dụ 2100" type="number" />
                <InputField label="Protein (g)" value={targets.protein} onChange={(value) => setTargets((prev) => ({ ...prev, protein: value }))} placeholder="Ví dụ 150" type="number" />
                <InputField label="Carbs (g)" value={targets.carbs} onChange={(value) => setTargets((prev) => ({ ...prev, carbs: value }))} placeholder="Ví dụ 220" type="number" />
                <InputField label="Fat (g)" value={targets.fat} onChange={(value) => setTargets((prev) => ({ ...prev, fat: value }))} placeholder="Ví dụ 55" type="number" />
                <InputField label="Fiber (g)" value={targets.fiber} onChange={(value) => setTargets((prev) => ({ ...prev, fiber: value }))} placeholder="Ví dụ 25" type="number" />
                <InputField label="Water (l)" value={targets.water} onChange={(value) => setTargets((prev) => ({ ...prev, water: value }))} placeholder="Ví dụ 3" type="number" />
                <InputField label="Meals / day" value={targets.mealsPerDay} onChange={(value) => setTargets((prev) => ({ ...prev, mealsPerDay: value }))} placeholder="Ví dụ 4" type="number" />
                <InputField label="Step target" value={targets.stepTarget} onChange={(value) => setTargets((prev) => ({ ...prev, stepTarget: value }))} placeholder="Ví dụ 8000-10000" />
              </div>
              <div className="space-y-4">
                <TextAreaField label="Supplement protocol" value={targets.supplementsPlan} onChange={(value) => setTargets((prev) => ({ ...prev, supplementsPlan: value }))} placeholder="Ví dụ: whey post-workout, creatine 5g/ngày..." />
                <TextAreaField label="Nutrition strategy" value={targets.strategyNotes} onChange={(value) => setTargets((prev) => ({ ...prev, strategyNotes: value }))} placeholder="Ví dụ: ưu tiên carb quanh giờ tập, giữ bữa tối nhẹ, 1 refeed meal cuối tuần..." rows={5} />
              </div>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={ChefHat}
        title="Meal Plan"
        subtitle="Plan theo ngày trong tuần. Ưu tiên giữ cấu trúc rõ để client nhìn là làm được ngay, không phải đọc quá nhiều ghi chú rời rạc."
        accentClassName="text-pink-300"
        action={!readOnly ? <SaveButton onClick={handleSavePlan} isSaving={isSavingPlan} /> : null}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {readOnly ? (
            <>
              <ReadOnlyBlock label="Mục tiêu tuần này" value={plan.focus} />
              <ReadOnlyBlock label="Coach notes" value={plan.coachingNotes} />
            </>
          ) : (
            <>
              <TextAreaField label="Mục tiêu tuần này" value={plan.focus} onChange={(value) => setPlan((prev) => ({ ...prev, focus: value }))} placeholder="Ví dụ: giữ deficit ổn định, ưu tiên protein đủ, giảm ăn vặt sau 9PM..." />
              <TextAreaField label="Coach notes" value={plan.coachingNotes} onChange={(value) => setPlan((prev) => ({ ...prev, coachingNotes: value }))} placeholder="Các lưu ý về ăn ngoài, lịch tập, ngày social meal, refeed..." />
            </>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {(readOnly ? filledPlanDays : plan.days).map((day, index) => (
            <div key={day.day} className="rounded-[24px] border border-white/[0.05] bg-black/20 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{day.day}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Daily structure</p>
                </div>
                {isFilled(day.context) && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
                    {day.context}
                  </span>
                )}
              </div>

              {readOnly ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <ReadOnlyBlock label="Context" value={day.context} />
                  <ReadOnlyBlock label="Breakfast" value={day.breakfast} />
                  <ReadOnlyBlock label="Lunch" value={day.lunch} />
                  <ReadOnlyBlock label="Dinner" value={day.dinner} />
                  <ReadOnlyBlock label="Snack / Pre-post workout" value={day.snack} />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField label="Context" value={day.context} onChange={(value) => updatePlanDay(index, 'context', value)} placeholder="Training day / Rest day / Social meal..." />
                  <TextAreaField label="Breakfast" value={day.breakfast} onChange={(value) => updatePlanDay(index, 'breakfast', value)} placeholder="Ví dụ: Greek yogurt + berries + whey..." rows={3} />
                  <TextAreaField label="Lunch" value={day.lunch} onChange={(value) => updatePlanDay(index, 'lunch', value)} placeholder="Ví dụ: ức gà + cơm + rau xanh..." rows={3} />
                  <TextAreaField label="Dinner" value={day.dinner} onChange={(value) => updatePlanDay(index, 'dinner', value)} placeholder="Ví dụ: cá hồi + khoai + salad..." rows={3} />
                  <TextAreaField label="Snack / Pre-post workout" value={day.snack} onChange={(value) => updatePlanDay(index, 'snack', value)} placeholder="Ví dụ: chuối + whey / rice cake + peanut butter..." rows={3} />
                </div>
              )}
            </div>
          ))}

          {readOnly && filledPlanDays.length === 0 && (
            <div className="rounded-[24px] border border-white/[0.05] bg-black/20 px-5 py-10 text-center">
              <Utensils className="mx-auto h-10 w-10 text-neutral-700" />
              <p className="mt-3 text-sm text-neutral-500">Coach chưa lên meal plan chi tiết cho bạn.</p>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={CalendarDays}
        title="Nutrition Check-In"
        subtitle="Theo dõi mức bám plan, năng lượng, tiêu hóa và điều chỉnh của coach. Dùng phần này làm lịch sử vận hành thật, không để note thất lạc trong chat."
        accentClassName="text-yellow-200"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Latest weigh-in" value={latestCheckin?.avg_weight ? `${latestCheckin.avg_weight}` : '--'} hint="kg" tone="text-white" />
          <MetricCard label="Adherence" value={latestCheckin?.adherence_score ? `${latestCheckin.adherence_score}/5` : '--'} hint="mức tuân thủ" tone="text-emerald-300" />
          <MetricCard label="Protein avg" value={latestCheckin?.protein_avg ? `${latestCheckin.protein_avg}` : '--'} hint="g/ngày" tone="text-blue-200" />
          <MetricCard label="Water avg" value={latestCheckin?.water_liters ? `${latestCheckin.water_liters}` : '--'} hint="l/ngày" tone="text-cyan-200" />
        </div>

        {checkinError && (
          <div className="mt-4 rounded-[20px] border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
            {checkinError}
          </div>
        )}

        {!readOnly && (
          <div className="mt-5 rounded-[26px] border border-white/[0.05] bg-black/20 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Ngày check-in" value={checkinForm.checkin_date} onChange={(value) => setCheckinForm((prev) => ({ ...prev, checkin_date: value }))} type="date" />
              <InputField label="Cân nặng trung bình (kg)" value={checkinForm.avg_weight} onChange={(value) => setCheckinForm((prev) => ({ ...prev, avg_weight: value }))} type="number" />
              <InputField label="Calories avg" value={checkinForm.calories_avg} onChange={(value) => setCheckinForm((prev) => ({ ...prev, calories_avg: value }))} type="number" />
              <InputField label="Protein avg (g)" value={checkinForm.protein_avg} onChange={(value) => setCheckinForm((prev) => ({ ...prev, protein_avg: value }))} type="number" />
              <InputField label="Steps avg" value={checkinForm.steps_avg} onChange={(value) => setCheckinForm((prev) => ({ ...prev, steps_avg: value }))} type="number" />
              <InputField label="Water avg (l)" value={checkinForm.water_liters} onChange={(value) => setCheckinForm((prev) => ({ ...prev, water_liters: value }))} type="number" />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <ScoreField label="Tuân thủ" value={checkinForm.adherence_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, adherence_score: value }))} />
              <ScoreField label="Hunger" value={checkinForm.hunger_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, hunger_score: value }))} />
              <ScoreField label="Energy" value={checkinForm.energy_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, energy_score: value }))} />
              <ScoreField label="Digestion" value={checkinForm.digestion_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, digestion_score: value }))} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextAreaField label="Wins" value={checkinForm.wins} onChange={(value) => setCheckinForm((prev) => ({ ...prev, wins: value }))} placeholder="Điểm làm tốt: đủ protein, ăn đúng plan, ít thèm ngọt..." />
              <TextAreaField label="Blockers" value={checkinForm.blockers} onChange={(value) => setCheckinForm((prev) => ({ ...prev, blockers: value }))} placeholder="Vướng mắc: tiệc, stress, ngủ kém, đói đêm..." />
              <ScoreField label="Sleep" value={checkinForm.sleep_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, sleep_score: value }))} />
              <TextAreaField label="Coach adjustments" value={checkinForm.coach_adjustments} onChange={(value) => setCheckinForm((prev) => ({ ...prev, coach_adjustments: value }))} placeholder="Điều chỉnh tuần sau: tăng carb ngày tập, đổi snack, thêm meal prep..." />
            </div>

            <div className="mt-5">
              <SaveButton onClick={handleSaveCheckin} isSaving={isSavingCheckin} label="Lưu Check-In" className="bg-yellow-500/10 text-yellow-100 border-yellow-500/20" />
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {checkins.length === 0 ? (
            <div className="rounded-[24px] border border-white/[0.05] bg-black/20 px-5 py-10 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-neutral-700" />
              <p className="mt-3 text-sm text-neutral-500">
                {readOnly ? 'Chưa có nutrition check-in nào được lưu.' : 'Hãy lưu check-in đầu tiên để bắt đầu theo dõi dinh dưỡng.'}
              </p>
            </div>
          ) : (
            checkins.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/[0.05] bg-black/20 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{formatDateLabel(item.checkin_date)}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-600">Nutrition review</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.adherence_score && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                        Bám plan {item.adherence_score}/5
                      </span>
                    )}
                    {item.avg_weight && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
                        {item.avg_weight} kg
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <MetricCard label="Calories" value={item.calories_avg ? `${item.calories_avg}` : '--'} tone="text-orange-200" />
                  <MetricCard label="Protein" value={item.protein_avg ? `${item.protein_avg}` : '--'} tone="text-blue-200" />
                  <MetricCard label="Steps" value={item.steps_avg ? `${item.steps_avg}` : '--'} tone="text-white" />
                  <MetricCard label="Water" value={item.water_liters ? `${item.water_liters}` : '--'} tone="text-cyan-200" />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ReadOnlyBlock label="Wins" value={item.wins} />
                  <ReadOnlyBlock label="Blockers" value={item.blockers} />
                  <ReadOnlyBlock label="Coach adjustments" value={item.coach_adjustments} />
                  <ReadOnlyBlock
                    label="Recovery signals"
                    value={[
                      item.hunger_score ? `Hunger ${item.hunger_score}/5` : '',
                      item.energy_score ? `Energy ${item.energy_score}/5` : '',
                      item.digestion_score ? `Digestion ${item.digestion_score}/5` : '',
                      item.sleep_score ? `Sleep ${item.sleep_score}/5` : '',
                    ].filter(Boolean).join(' · ')}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={ShoppingCart}
        title="Shopping & Prep"
        subtitle="Quy về một chỗ toàn bộ shopping list, batch-cooking và rules thực tế để client bám được plan trong đời sống thường ngày."
        accentClassName="text-cyan-200"
        action={!readOnly ? <SaveButton onClick={handleSavePrep} isSaving={isSavingPrep} /> : null}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {readOnly ? (
            <>
              <ReadOnlyBlock label="Shopping list" value={prep.shoppingList} />
              <ReadOnlyBlock label="Batch cooking" value={prep.batchCooking} />
              <ReadOnlyBlock label="Pantry staples" value={prep.pantryStaples} />
              <ReadOnlyBlock label="Eating-out rules" value={prep.eatingOutRules} />
              <ReadOnlyBlock label="Coach notes" value={prep.coachNotes} />
            </>
          ) : (
            <>
              <TextAreaField label="Shopping list" value={prep.shoppingList} onChange={(value) => setPrep((prev) => ({ ...prev, shoppingList: value }))} placeholder="Ức gà, trứng, sữa chua Hy Lạp, rau xanh, berries..." rows={5} />
              <TextAreaField label="Batch cooking" value={prep.batchCooking} onChange={(value) => setPrep((prev) => ({ ...prev, batchCooking: value }))} placeholder="Chủ nhật prep 3 hộp lunch, luộc sẵn trứng, chia sẵn snack..." rows={5} />
              <TextAreaField label="Pantry staples" value={prep.pantryStaples} onChange={(value) => setPrep((prev) => ({ ...prev, pantryStaples: value }))} placeholder="Yến mạch, gạo, gia vị không đường, whey, tuna..." rows={5} />
              <TextAreaField label="Eating-out rules" value={prep.eatingOutRules} onChange={(value) => setPrep((prev) => ({ ...prev, eatingOutRules: value }))} placeholder="Ưu tiên món nướng/hấp, xin sauce riêng, 1 social meal/tuần..." rows={5} />
              <TextAreaField label="Coach notes" value={prep.coachNotes} onChange={(value) => setPrep((prev) => ({ ...prev, coachNotes: value }))} placeholder="Lưu ý logistics, budget, travel week, món thay thế nhanh..." rows={5} />
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={Archive}
        title="Intake Archive"
        subtitle="Bản tóm tắt gọn của thông tin client đã điền ban đầu. Mục này để lưu trữ và tham chiếu nhanh, không còn là trọng tâm chính của tab."
        accentClassName="text-neutral-300"
      >
        <div className="grid gap-3 md:grid-cols-2">
          {NUTRITION_ARCHIVE_FIELDS.map((field) => (
            <div key={field.key} className={`rounded-[20px] border border-white/[0.05] bg-black/20 p-4 ${field.key === 'favoritefoods' ? 'md:col-span-2' : ''}`}>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{field.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-white">{isFilled(archive[field.key]) ? archive[field.key] : '--'}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default NutritionTab;
