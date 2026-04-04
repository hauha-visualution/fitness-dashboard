import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Droplets,
  Edit3,
  Flame,
  Footprints,
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
  buildPhoneCandidates,
  countFilledNutritionFields,
  createDefaultNutritionCheckin,
  ensureNutritionPlan,
  ensureNutritionPrep,
  ensureNutritionTargets,
  hasNutritionColumnsInSurveyRow,
  normalizeSurveyResponseRecord,
} from '../../../utils/nutritionUtils';

const SCORE_OPTIONS = Array.from({ length: 10 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}/10`,
}));

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
  if (!value) return 'Chưa đồng bộ';
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
  <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-sm">
    <div className={`flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 ${subtitle ? 'py-4' : 'py-3'}`}>
      <div className="flex items-center gap-2.5">
        <div className={`flex items-center justify-center rounded-[16px] border border-white/[0.08] bg-black/30 ${subtitle ? 'h-10.5 w-10.5' : 'h-9.5 w-9.5'}`}>
          {React.createElement(icon, { className: `h-5 w-5 ${accentClassName}` })}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-600">{title}</p>
          {subtitle && <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="px-4 py-3.5">{children}</div>
  </div>
);

const MacroHeroCard = ({ icon: Icon, label, value, hint, tone }) => (
  <div className="min-h-[112px] rounded-[18px] border border-white/[0.06] bg-black/25 p-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
      <Icon className={`h-4 w-4 ${tone}`} />
    </div>
    <p className={`mt-2 text-[22px] font-light ${tone}`}>{value || '--'}</p>
    <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>
  </div>
);

const DataSquareCard = ({ label, value, hint, className = '' }) => (
  <div className={`flex min-h-[112px] flex-col rounded-[18px] border border-white/[0.06] bg-black/25 p-3 ${className}`}>
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
    <p className="mt-2 text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
      {isFilled(value) ? value : '--'}
    </p>
    {hint ? <p className="mt-auto pt-2 text-[11px] text-neutral-500">{hint}</p> : null}
  </div>
);

const EditableMetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  placeholder,
  onChange,
  type = 'text',
}) => (
  <div className="flex min-h-[112px] flex-col rounded-[18px] border border-white/[0.06] bg-black/25 p-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
      <Icon className={`h-4 w-4 ${tone}`} />
    </div>
    <input
      type={type}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`mt-2 w-full border-0 bg-transparent p-0 text-[22px] font-light ${tone} outline-none placeholder:text-neutral-600`}
    />
    <p className="mt-auto pt-2 text-[11px] text-neutral-500">{hint}</p>
  </div>
);

const EditableDataSquareCard = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline = false,
  type = 'text',
  className = '',
}) => (
  <div className={`flex min-h-[112px] flex-col rounded-[18px] border border-white/[0.06] bg-black/25 p-3 ${className}`}>
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
    {multiline ? (
      <textarea
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-white outline-none placeholder:text-neutral-600"
      />
    ) : (
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-neutral-600"
      />
    )}
    {hint ? <p className="mt-auto pt-2 text-[11px] text-neutral-500">{hint}</p> : null}
  </div>
);

const MetricCard = ({ label, value, hint, tone = 'text-white' }) => (
  <div className="rounded-[18px] border border-white/[0.06] bg-black/25 p-3">
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
    <p className={`mt-1.5 text-xl font-light ${tone}`}>{value === null || value === undefined || value === '' ? '--' : value}</p>
    {hint && <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>}
  </div>
);

const InputField = ({ label, value, onChange, placeholder, type = 'text', min, max, disabled = false }) => (
  <label className="space-y-1.5">
    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</span>
    <input
      type={type}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-[14px] border border-white/[0.08] bg-black/35 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
);

const TextAreaField = ({ label, value, onChange, placeholder, rows = 3, disabled = false }) => (
  <label className="space-y-1.5">
    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</span>
    <textarea
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full resize-none rounded-[14px] border border-white/[0.08] bg-black/35 px-3 py-2.5 text-sm leading-relaxed text-white outline-none transition-all focus:border-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
);

const ReadOnlyBlock = ({ label, value, placeholder = '--' }) => (
  <div className="space-y-1 rounded-[15px] border border-white/[0.05] bg-black/20 p-3">
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</p>
    <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">{isFilled(value) ? value : placeholder}</p>
  </div>
);

const ScoreField = ({ label, value, onChange, disabled = false }) => (
  <label className="space-y-1.5">
    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-600">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="w-full rounded-[14px] border border-white/[0.08] bg-black/35 px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {SCORE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const IconButton = ({ onClick, isSaving, icon: Icon = Save, className = '' }) => (
  <button
    onClick={onClick}
    disabled={isSaving}
    className={`inline-flex h-9.5 w-9.5 items-center justify-center rounded-[13px] border border-white/10 bg-white/[0.07] text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all hover:bg-white/[0.1] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
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
  const [isSyncingIntake, setIsSyncingIntake] = useState(false);

  const [checkinError, setCheckinError] = useState('');
  const [nutritionSyncedAt, setNutritionSyncedAt] = useState(client?.nutrition_profile_synced_at || '');
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [isEditingCheckin, setIsEditingCheckin] = useState(false);
  const [isCheckinHistoryOpen, setIsCheckinHistoryOpen] = useState(false);
  const [activeMealDayIndex, setActiveMealDayIndex] = useState(0);

  useEffect(() => {
    setArchive(buildNutritionProfileFromSource(client));
    setTargets(ensureNutritionTargets(client?.nutrition_targets));
    setPlan(ensureNutritionPlan(client?.nutrition_plan));
    setPrep(ensureNutritionPrep(client?.nutrition_prep));
    setNutritionSyncedAt(client?.nutrition_profile_synced_at || '');
    setIsEditingTargets(false);
    setIsEditingPlan(false);
    setIsEditingCheckin(false);
    setIsCheckinHistoryOpen(false);
    setActiveMealDayIndex(0);
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

  useEffect(() => {
    void fetchCheckins();
  }, [fetchCheckins]);

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
      return false;
    }

    onSuccess?.();
    alert('Đã lưu thay đổi.');
    return true;
  };

  const handleSyncIntakeProfile = async () => {
    if (readOnly || !client?.id || !client?.phone) return;
    setIsSyncingIntake(true);

    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .in('phone', buildPhoneCandidates(client.phone))
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const matchedRow = (data || [])[0];
      if (!matchedRow) {
        alert('Không tìm thấy dữ liệu form theo số điện thoại hiện tại.');
        setIsSyncingIntake(false);
        return;
      }

      const normalizedSurvey = normalizeSurveyResponseRecord(matchedRow);
      const surveyArchive = buildNutritionProfileFromSource(normalizedSurvey);
      const filledNutritionFields = countFilledNutritionFields(surveyArchive);
      const hasNutritionColumns = hasNutritionColumnsInSurveyRow(matchedRow);

      if (filledNutritionFields === 0) {
        alert(
          hasNutritionColumns
            ? 'Đã tìm thấy response mới nhất, nhưng phần nutrition trong form hiện đang trống.'
            : 'Đã tìm thấy response nhưng chưa map được field nutrition từ form.',
        );
        setIsSyncingIntake(false);
        return;
      }

      const payload = Object.entries(surveyArchive).reduce((acc, [key, value]) => {
        if (isFilled(value)) acc[key] = value;
        return acc;
      }, {});
      const syncedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          ...payload,
          nutrition_profile_synced_at: syncedAt,
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      setArchive((prev) => ({ ...prev, ...payload }));
      setNutritionSyncedAt(syncedAt);
      alert(`Đã đồng bộ lại ${filledNutritionFields}/9 trường intake từ form.`);
    } catch (error) {
      alert(`Không thể đồng bộ hồ sơ intake: ${error.message || 'Thử lại nhé'}`);
    }

    setIsSyncingIntake(false);
  };

  const handleSaveTargets = async () => {
    const saved = await saveClientJsonFields(
      { nutrition_targets: targets },
      () => setTargets({ ...targets }),
      setIsSavingTargets,
    );

    if (saved) {
      setIsEditingTargets(false);
    }
  };

  const handleSavePlan = async () => {
    const saved = await saveClientJsonFields(
      { nutrition_plan: plan },
      () => setPlan(ensureNutritionPlan(plan)),
      setIsSavingPlan,
    );

    if (saved) {
      setIsEditingPlan(false);
    }
  };

  const handleSavePrep = () => {
    void saveClientJsonFields(
      { nutrition_prep: prep },
      () => setPrep({ ...prep }),
      setIsSavingPrep,
    );
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
    setIsEditingCheckin(false);
    alert('Đã lưu nutrition check-in.');
  };

  const latestCheckin = checkins[0] || null;
  const archiveItems = useMemo(
    () => NUTRITION_ARCHIVE_FIELDS.filter((field) => isFilled(archive[field.key])),
    [archive],
  );
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

  const macroCards = [
    { label: 'Calories', value: targets.calories ? `${targets.calories}` : '--', hint: 'kcal/ngày', tone: 'text-orange-200', icon: Flame },
    { label: 'Protein', value: targets.protein ? `${targets.protein}` : '--', hint: 'g/ngày', tone: 'text-blue-200', icon: Target },
    { label: 'Water', value: targets.water ? `${targets.water}` : '--', hint: 'l/ngày', tone: 'text-cyan-200', icon: Droplets },
    { label: 'Step Target', value: targets.stepTarget || '--', hint: 'bám hoạt động nền', tone: 'text-emerald-200', icon: Footprints },
  ];
  const targetSummaryCards = [
    { label: 'Carbs', value: targets.carbs ? `${targets.carbs} g/ngày` : '' },
    { label: 'Fat', value: targets.fat ? `${targets.fat} g/ngày` : '' },
    { label: 'Chất xơ', value: targets.fiber ? `${targets.fiber} g/ngày` : '' },
    { label: 'Supplement Protocol', value: targets.supplementsPlan },
    { label: 'Nutrition Strategy', value: targets.strategyNotes },
  ];
  const mealPlanDays = plan.days || [];
  const activeMealDay = mealPlanDays[activeMealDayIndex] || mealPlanDays[0] || null;

  return (
    <div className="animate-slide-up lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start space-y-5 lg:space-y-0">
      {/* --- CỘT TRÁI --- */}
      <div className="space-y-5">
      <SectionCard
        icon={Target}
        title="Macro & Target"
        accentClassName="text-emerald-300"
        action={
          !readOnly ? (
            <IconButton
              onClick={isEditingTargets ? () => void handleSaveTargets() : () => setIsEditingTargets(true)}
              isSaving={isSavingTargets}
              icon={isEditingTargets ? Save : Edit3}
            />
          ) : null
        }
      >
        {readOnly || !isEditingTargets ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {macroCards.map((card) => (
                <MacroHeroCard
                  key={card.label}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                  tone={card.tone}
                />
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 xl:grid-cols-3">
    {targetSummaryCards.map((card) => (
      <DataSquareCard
        key={card.label}
        label={card.label}
        value={card.value}
        className={card.label === 'Nutrition Strategy' ? 'col-span-2' : ''}
      />
    ))}
            </div>
          </>
        ) : null}

        {!readOnly && isEditingTargets ? (
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
            <EditableMetricCard
              icon={Flame}
              label="Calories"
              value={targets.calories}
              hint="kcal/ngày"
              tone="text-orange-200"
              placeholder="Ví dụ 2100"
              type="number"
              onChange={(value) => setTargets((prev) => ({ ...prev, calories: value }))}
            />
            <EditableMetricCard
              icon={Target}
              label="Protein"
              value={targets.protein}
              hint="g/ngày"
              tone="text-blue-200"
              placeholder="Ví dụ 150"
              type="number"
              onChange={(value) => setTargets((prev) => ({ ...prev, protein: value }))}
            />
            <EditableMetricCard
              icon={Droplets}
              label="Water"
              value={targets.water}
              hint="l/ngày"
              tone="text-cyan-200"
              placeholder="Ví dụ 3"
              type="number"
              onChange={(value) => setTargets((prev) => ({ ...prev, water: value }))}
            />
            <EditableMetricCard
              icon={Footprints}
              label="Step Target"
              value={targets.stepTarget}
              hint="bám hoạt động nền"
              tone="text-emerald-200"
              placeholder="Ví dụ 8000-10000"
              onChange={(value) => setTargets((prev) => ({ ...prev, stepTarget: value }))}
            />
            <EditableDataSquareCard
              label="Carbs"
              value={targets.carbs}
              placeholder="Ví dụ 220"
              hint="g/ngày"
              type="number"
              onChange={(value) => setTargets((prev) => ({ ...prev, carbs: value }))}
            />
            <EditableDataSquareCard
              label="Fat"
              value={targets.fat}
              placeholder="Ví dụ 55"
              hint="g/ngày"
              type="number"
              onChange={(value) => setTargets((prev) => ({ ...prev, fat: value }))}
            />
            <EditableDataSquareCard
              label="Chất xơ"
              value={targets.fiber}
              placeholder="Ví dụ 25"
              hint="g/ngày"
              type="number"
              onChange={(value) => setTargets((prev) => ({ ...prev, fiber: value }))}
            />
            <EditableDataSquareCard
              label="Supplement Protocol"
              value={targets.supplementsPlan}
              placeholder="Ví dụ: whey post-workout, creatine 5g/ngày..."
              multiline
              onChange={(value) => setTargets((prev) => ({ ...prev, supplementsPlan: value }))}
            />
            <EditableDataSquareCard
              label="Nutrition Strategy"
              value={targets.strategyNotes}
              placeholder="Ví dụ: ưu tiên carb quanh giờ tập, giữ bữa tối nhẹ..."
              multiline
              className="col-span-2"
              onChange={(value) => setTargets((prev) => ({ ...prev, strategyNotes: value }))}
            />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        icon={ShoppingCart}
        title="Shopping & Prep"
        accentClassName="text-cyan-200"
        action={!readOnly ? <IconButton onClick={handleSavePrep} isSaving={isSavingPrep} /> : null}
      >
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {readOnly ? (
            <>
              <ReadOnlyBlock label="Shopping List" value={prep.shoppingList} />
              <ReadOnlyBlock label="Batch Cooking" value={prep.batchCooking} />
              <ReadOnlyBlock label="Pantry Staples" value={prep.pantryStaples} />
              <ReadOnlyBlock label="Eating-out Rules" value={prep.eatingOutRules} />
              <ReadOnlyBlock label="Coach Notes" value={prep.coachNotes} />
            </>
          ) : (
            <>
              <TextAreaField label="Shopping List" value={prep.shoppingList} onChange={(value) => setPrep((prev) => ({ ...prev, shoppingList: value }))} placeholder="Ức gà, trứng, sữa chua Hy Lạp, rau xanh, berries..." rows={4} />
              <TextAreaField label="Batch Cooking" value={prep.batchCooking} onChange={(value) => setPrep((prev) => ({ ...prev, batchCooking: value }))} placeholder="Chủ nhật prep 3 hộp lunch, luộc sẵn trứng, chia sẵn snack..." rows={4} />
              <TextAreaField label="Pantry Staples" value={prep.pantryStaples} onChange={(value) => setPrep((prev) => ({ ...prev, pantryStaples: value }))} placeholder="Yến mạch, gạo, gia vị không đường, whey, tuna..." rows={4} />
              <TextAreaField label="Eating-out Rules" value={prep.eatingOutRules} onChange={(value) => setPrep((prev) => ({ ...prev, eatingOutRules: value }))} placeholder="Ưu tiên món nướng/hấp, xin sauce riêng, 1 social meal/tuần..." rows={4} />
              <TextAreaField label="Coach Notes" value={prep.coachNotes} onChange={(value) => setPrep((prev) => ({ ...prev, coachNotes: value }))} placeholder="Lưu ý logistics, budget, travel week, món thay thế nhanh..." rows={4} />
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={Archive}
        title="Archive"
        accentClassName="text-neutral-300"
        action={!readOnly ? <IconButton onClick={handleSyncIntakeProfile} isSaving={isSyncingIntake} icon={RefreshCw} /> : null}
      >
        {archiveItems.length > 0 ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {archiveItems.map((field) => (
              <div key={field.key} className="rounded-[16px] border border-white/[0.05] bg-black/20 px-3.5 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-600">{field.label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white">{archive[field.key]}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border border-white/[0.05] bg-black/20 px-3.5 py-5 text-center text-sm text-neutral-500">
            Chưa có dữ liệu intake nào được lưu.
          </div>
        )}
      </SectionCard>
      </div>

      {/* --- CỘT PHẢI --- */}
      <div className="space-y-5">
      <SectionCard
        icon={ChefHat}
        title="Meal Plan"
        accentClassName="text-pink-300"
        action={
          !readOnly ? (
            <IconButton
              onClick={isEditingPlan ? () => void handleSavePlan() : () => setIsEditingPlan(true)}
              isSaving={isSavingPlan}
              icon={isEditingPlan ? Save : Edit3}
            />
          ) : null
        }
      >
        <div className="grid gap-2.5 md:grid-cols-2">
          {readOnly || !isEditingPlan ? (
            <>
              <ReadOnlyBlock label="Mục tiêu tuần này" value={plan.focus} />
              <ReadOnlyBlock label="Coach Notes" value={plan.coachingNotes} />
            </>
          ) : (
            <>
              <TextAreaField label="Mục tiêu tuần này" value={plan.focus} onChange={(value) => setPlan((prev) => ({ ...prev, focus: value }))} placeholder="Ví dụ: giữ deficit ổn định, ưu tiên protein đủ, giảm ăn vặt sau 9PM..." rows={3} />
              <TextAreaField label="Coach Notes" value={plan.coachingNotes} onChange={(value) => setPlan((prev) => ({ ...prev, coachingNotes: value }))} placeholder="Ăn ngoài, social meal, lưu ý lịch tập..." rows={2} />
            </>
          )}
        </div>

        <div className="mt-3.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {mealPlanDays.map((day, index) => (
              <button
              key={`chip-${day.day}`}
              type="button"
              onClick={() => setActiveMealDayIndex(index)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                index === activeMealDayIndex
                  ? 'border-pink-500/30 bg-pink-500/16 text-pink-100 shadow-[0_8px_18px_rgba(236,72,153,0.12)]'
                  : [day.context, day.breakfast, day.lunch, day.dinner, day.snack].some((value) => isFilled(value))
                    ? 'border-pink-500/20 bg-pink-500/10 text-pink-200'
                    : 'border-white/10 bg-white/[0.03] text-neutral-500'
              }`}
            >
              {day.day}
            </button>
          ))}
          </div>
        </div>

        <div className="mt-3.5">
          {activeMealDay ? (
            <div key={activeMealDay.day} className="rounded-[22px] border border-white/[0.05] bg-gradient-to-br from-white/[0.03] to-black/20 p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-2.5">
                <div>
                  <p className="text-base font-semibold text-white">{activeMealDay.day}</p>
                </div>
                {isFilled(activeMealDay.context) && (
                  <span className="rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-pink-200">
                    {activeMealDay.context}
                  </span>
                )}
              </div>

              {readOnly ? (
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  <ReadOnlyBlock label="Breakfast" value={activeMealDay.breakfast} />
                  <ReadOnlyBlock label="Lunch" value={activeMealDay.lunch} />
                  <ReadOnlyBlock label="Dinner" value={activeMealDay.dinner} />
                  <ReadOnlyBlock label="Snack / Pre-post Workout" value={activeMealDay.snack} />
                </div>
              ) : !isEditingPlan ? (
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  <ReadOnlyBlock label="Breakfast" value={activeMealDay.breakfast} />
                  <ReadOnlyBlock label="Lunch" value={activeMealDay.lunch} />
                  <ReadOnlyBlock label="Dinner" value={activeMealDay.dinner} />
                  <ReadOnlyBlock label="Snack / Pre-post Workout" value={activeMealDay.snack} />
                </div>
              ) : (
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  <InputField label="Context" value={activeMealDay.context} onChange={(value) => updatePlanDay(activeMealDayIndex, 'context', value)} placeholder="Training day / Rest day / Social meal..." />
                  <TextAreaField label="Breakfast" value={activeMealDay.breakfast} onChange={(value) => updatePlanDay(activeMealDayIndex, 'breakfast', value)} placeholder="Ví dụ: Greek yogurt + berries + whey..." rows={2} />
                  <TextAreaField label="Lunch" value={activeMealDay.lunch} onChange={(value) => updatePlanDay(activeMealDayIndex, 'lunch', value)} placeholder="Ví dụ: ức gà + cơm + rau xanh..." rows={2} />
                  <TextAreaField label="Dinner" value={activeMealDay.dinner} onChange={(value) => updatePlanDay(activeMealDayIndex, 'dinner', value)} placeholder="Ví dụ: cá hồi + khoai + salad..." rows={2} />
                  <TextAreaField label="Snack / Pre-post Workout" value={activeMealDay.snack} onChange={(value) => updatePlanDay(activeMealDayIndex, 'snack', value)} placeholder="Ví dụ: chuối + whey / rice cake + peanut butter..." rows={2} />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {readOnly && filledPlanDays.length === 0 && (
          <div className="mt-3.5 rounded-[22px] border border-white/[0.05] bg-black/20 px-4 py-8 text-center">
            <Utensils className="mx-auto h-10 w-10 text-neutral-700" />
            <p className="mt-3 text-sm text-neutral-500">Coach chưa lên meal plan chi tiết cho bạn.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={CalendarDays}
        title="Nutrition Review"
        accentClassName="text-yellow-200"
        action={
          !readOnly ? (
            <IconButton
              onClick={isEditingCheckin ? () => void handleSaveCheckin() : () => setIsEditingCheckin(true)}
              isSaving={isSavingCheckin}
              icon={isEditingCheckin ? Save : Edit3}
              className="border-yellow-500/20 bg-yellow-500/10 text-yellow-100"
            />
          ) : null
        }
      >
        <div className="grid gap-2.5 md:grid-cols-4">
          <MetricCard label="Latest weigh-in" value={latestCheckin?.avg_weight ? `${latestCheckin.avg_weight}` : '--'} hint="kg" tone="text-white" />
          <MetricCard label="Adherence" value={latestCheckin?.adherence_score ? `${latestCheckin.adherence_score}/10` : '--'} hint="mức tuân thủ" tone="text-emerald-300" />
          <MetricCard label="Protein avg" value={latestCheckin?.protein_avg ? `${latestCheckin.protein_avg}` : '--'} hint="g/ngày" tone="text-blue-200" />
          <MetricCard label="Water avg" value={latestCheckin?.water_liters ? `${latestCheckin.water_liters}` : '--'} hint="l/ngày" tone="text-cyan-200" />
        </div>

        {checkinError && (
          <div className="mt-3.5 rounded-[18px] border border-orange-500/20 bg-orange-500/10 px-3.5 py-2.5 text-sm text-orange-200">
            {checkinError}
          </div>
        )}

        {!readOnly && isEditingCheckin && (
          <div className="mt-3.5 rounded-[22px] border border-white/[0.05] bg-black/20 p-3.5">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              <InputField label="Ngày check-in" value={checkinForm.checkin_date} onChange={(value) => setCheckinForm((prev) => ({ ...prev, checkin_date: value }))} type="date" />
              <InputField label="Cân nặng trung bình (kg)" value={checkinForm.avg_weight} onChange={(value) => setCheckinForm((prev) => ({ ...prev, avg_weight: value }))} type="number" />
              <InputField label="Calories avg" value={checkinForm.calories_avg} onChange={(value) => setCheckinForm((prev) => ({ ...prev, calories_avg: value }))} type="number" />
              <InputField label="Protein avg (g)" value={checkinForm.protein_avg} onChange={(value) => setCheckinForm((prev) => ({ ...prev, protein_avg: value }))} type="number" />
              <InputField label="Steps avg" value={checkinForm.steps_avg} onChange={(value) => setCheckinForm((prev) => ({ ...prev, steps_avg: value }))} type="number" />
              <InputField label="Water avg (l)" value={checkinForm.water_liters} onChange={(value) => setCheckinForm((prev) => ({ ...prev, water_liters: value }))} type="number" />
            </div>

            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
              <ScoreField label="Tuân thủ" value={checkinForm.adherence_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, adherence_score: value }))} />
              <ScoreField label="Hunger" value={checkinForm.hunger_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, hunger_score: value }))} />
              <ScoreField label="Energy" value={checkinForm.energy_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, energy_score: value }))} />
              <ScoreField label="Digestion" value={checkinForm.digestion_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, digestion_score: value }))} />
              <ScoreField label="Sleep" value={checkinForm.sleep_score} onChange={(value) => setCheckinForm((prev) => ({ ...prev, sleep_score: value }))} />
            </div>

            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              <TextAreaField label="Wins" value={checkinForm.wins} onChange={(value) => setCheckinForm((prev) => ({ ...prev, wins: value }))} placeholder="Điểm làm tốt: đủ protein, ăn đúng plan, ít thèm ngọt..." rows={3} />
              <TextAreaField label="Blockers" value={checkinForm.blockers} onChange={(value) => setCheckinForm((prev) => ({ ...prev, blockers: value }))} placeholder="Vướng mắc: tiệc, stress, ngủ kém, đói đêm..." rows={3} />
              <TextAreaField label="Coach Adjustments" value={checkinForm.coach_adjustments} onChange={(value) => setCheckinForm((prev) => ({ ...prev, coach_adjustments: value }))} placeholder="Điều chỉnh tuần sau: tăng carb ngày tập, đổi snack, thêm meal prep..." rows={3} />
            </div>

          </div>
        )}

        {!isEditingCheckin && (
          <div className="mt-3.5 space-y-2.5">
            {checkins.length === 0 ? (
              <div className="rounded-[22px] border border-white/[0.05] bg-black/20 px-4 py-8 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-neutral-700" />
                <p className="mt-3 text-sm text-neutral-500">
                  {readOnly ? 'Chưa có nutrition check-in nào được lưu.' : 'Chưa có check-in nào. Bấm edit để tạo check-in đầu tiên.'}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-[20px] border border-white/[0.05] bg-black/20 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <p className="text-sm font-semibold text-white">{formatDateLabel(latestCheckin?.checkin_date)}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-600">Latest review</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {latestCheckin?.adherence_score && (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                          Bám plan {latestCheckin.adherence_score}/10
                        </span>
                      )}
                      {latestCheckin?.avg_weight && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
                          {latestCheckin.avg_weight} kg
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                    <ReadOnlyBlock label="Recovery Signals" value={[
                      latestCheckin?.hunger_score ? `Hunger ${latestCheckin.hunger_score}/10` : '',
                      latestCheckin?.energy_score ? `Energy ${latestCheckin.energy_score}/10` : '',
                      latestCheckin?.digestion_score ? `Digestion ${latestCheckin.digestion_score}/10` : '',
                      latestCheckin?.sleep_score ? `Sleep ${latestCheckin.sleep_score}/10` : '',
                    ].filter(Boolean).join(' · ')} />
                    <ReadOnlyBlock label="Wins" value={latestCheckin?.wins} />
                    <ReadOnlyBlock label="Blockers" value={latestCheckin?.blockers} />
                    <ReadOnlyBlock label="Coach Adjustments" value={latestCheckin?.coach_adjustments} />
                  </div>
                </div>

                {checkins.length > 1 && (
                  <div className="rounded-[20px] border border-white/[0.05] bg-black/20">
                    <button
                      type="button"
                      onClick={() => setIsCheckinHistoryOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-600">Check-in history</p>
                        <p className="mt-1 text-sm text-neutral-400">{checkins.length} lượt đã lưu</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${isCheckinHistoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCheckinHistoryOpen && (
                      <div className="border-t border-white/[0.05] px-3.5 py-3">
                        <div className="space-y-2">
                          {checkins.map((item) => (
                            <div key={item.id} className="rounded-[16px] border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium text-white">{formatDateLabel(item.checkin_date)}</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.adherence_score && (
                                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                                      {item.adherence_score}/10
                                    </span>
                                  )}
                                  {item.avg_weight && (
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neutral-300">
                                      {item.avg_weight} kg
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </SectionCard>

      </div>
    </div>
  );
};

export default NutritionTab;