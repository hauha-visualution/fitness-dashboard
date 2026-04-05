import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { notifyPackageCreated, fetchClientNotifInfo } from '../../../utils/notificationUtils';
import {
  MEAL_PREP_GROUP_OPTIONS,
  MEAL_PREP_UNIT_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  buildMealPrepPaymentDetail,
  getMealPrepProductOptions,
  getServiceTypeConfig,
  parseServiceMeta,
  serializeServiceMeta,
} from '../../../utils/serviceUtils';

const DAY_LABELS = [
  { day: 1, short: 'M', full: 'Monday' },
  { day: 2, short: 'T', full: 'Tuesday' },
  { day: 3, short: 'W', full: 'Wednesday' },
  { day: 4, short: 'T', full: 'Thursday' },
  { day: 5, short: 'F', full: 'Friday' },
  { day: 6, short: 'S', full: 'Saturday' },
  { day: 0, short: 'S', full: 'Sunday' },
];
const DURATIONS = [45, 60, 75, 90];
const DAY_VI = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const createMealPrepItem = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  foodGroup: '',
  productName: '',
  unit: 'g',
  quantity: '',
  amount: '',
});

const generateSessionDates = (startDate, schedule, totalCount) => {
  if (!startDate || !schedule.length || totalCount <= 0) return [];
  const sessions = [];
  const start = new Date(startDate + 'T00:00:00');
  let current = new Date(start);
  let safety = 0;
  while (sessions.length < totalCount && safety < 730) {
    const slot = schedule.find((item) => item.day === current.getDay());
    if (slot) {
      sessions.push({ number: sessions.length + 1, date: new Date(current), time: slot.time });
    }
    current.setDate(current.getDate() + 1);
    safety += 1;
  }
  return sessions;
};

const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const day = DAY_VI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${day} ${dd}/${mm}`;
};

const formatDots = (raw) => {
  const digits = raw.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const addMinutes = (timeStr, minutes) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
};

const FieldBlock = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">{label}</span>
    {children}
  </div>
);

const CreatePackageModal = ({
  clientId,
  packageNumber,
  existingPackage = null,
  onClose,
  onCreated,
}) => {
  const existingMeta = useMemo(
    () => (existingPackage ? parseServiceMeta(existingPackage.note) : null),
    [existingPackage]
  );
  const isEditing = Boolean(existingPackage);

  const [step, setStep] = useState(existingMeta?.serviceType === 'meal_prep' ? 2 : 1);
  const [serviceType, setServiceType] = useState(existingMeta?.serviceType || 'training');
  const [serviceDetail, setServiceDetail] = useState(existingMeta?.serviceDetail || '');
  const [buyCount, setBuyCount] = useState(existingPackage ? String(existingPackage.session_count || 0) : '');
  const [bonusCount, setBonusCount] = useState(existingPackage ? String(existingPackage.bonus_sessions || 0) : '');
  const [priceInput, setPriceInput] = useState(
    existingPackage?.price ? formatDots(String(existingPackage.price)) : ''
  );
  const [packageNote, setPackageNote] = useState(existingMeta?.coachNote || '');
  const [mealPrepItems, setMealPrepItems] = useState(() => {
    if (existingMeta?.mealPrepItems?.length) {
      return existingMeta.mealPrepItems.map((item, index) => ({
        id: `${existingPackage?.id || 'existing'}-${index}`,
        foodGroup: item.foodGroup || '',
        productName: item.productName || '',
        unit: item.unit || 'g',
        quantity: item.quantity || '',
        amount: item.amount ? String(item.amount) : '',
      }));
    }
    return [createMealPrepItem()];
  });

  const [startDate, setStartDate] = useState(() => {
    if (existingPackage?.start_date) return existingPackage.start_date;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [schedule, setSchedule] = useState(existingPackage?.weekly_schedule || []);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  const selectedServiceType = getServiceTypeConfig(serviceType);
  const isTraining = serviceType === 'training';
  const isSketching = serviceType === 'sketching';
  const isMealPrep = serviceType === 'meal_prep';

  const hasMealPrepRows = mealPrepItems.some(
    (item) => item.foodGroup || item.productName || item.quantity || Number(item.amount || 0) > 0
  );
  const mealPrepAmount = mealPrepItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const sessionCount = isMealPrep ? mealPrepItems.filter((item) => item.productName || item.foodGroup).length : (parseInt(buyCount, 10) || 0);
  const bonusSessions = isMealPrep ? 0 : (parseInt(bonusCount, 10) || 0);
  const totalSessions = sessionCount + bonusSessions;
  const priceRawDigits = isMealPrep ? String(mealPrepAmount) : priceInput.replace(/\D/g, '');
  const priceVND = Number(priceRawDigits || 0);
  const priceFormatted = priceRawDigits ? formatDots(priceRawDigits) : '';

  const previewSessions = useMemo(
    () => (isTraining ? generateSessionDates(startDate, schedule, totalSessions) : []),
    [isTraining, startDate, schedule, totalSessions]
  );

  const step1Valid = isMealPrep
    ? true
    : sessionCount >= 1 && sessionCount <= 200;
  const step2Valid = isTraining
    ? Boolean(startDate) && schedule.length > 0 && previewSessions.length === totalSessions
    : isSketching
      ? sessionCount >= 1
      : hasMealPrepRows;

  const toggleDay = (day) => {
    setSchedule((prev) => {
      const exists = prev.find((item) => item.day === day);
      if (exists) return prev.filter((item) => item.day !== day);
      return [...prev, { day, time: '07:00' }].sort((a, b) => {
        const da = a.day === 0 ? 7 : a.day;
        const db = b.day === 0 ? 7 : b.day;
        return da - db;
      });
    });
  };

  const updateDayTime = (day, time) => {
    setSchedule((prev) => prev.map((item) => (item.day === day ? { ...item, time } : item)));
  };

  const isDaySelected = (day) => schedule.some((item) => item.day === day);

  const updateMealPrepItem = (id, key, value) => {
    setMealPrepItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const addMealPrepItem = () => {
    setMealPrepItems((prev) => [...prev, createMealPrepItem()]);
  };

  const removeMealPrepItem = (id) => {
    setMealPrepItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const basePackagePayload = {
    client_id: clientId,
    package_number: packageNumber,
    session_count: sessionCount,
    bonus_sessions: bonusSessions,
    total_sessions: totalSessions,
    price: priceVND,
    start_date: isTraining || isSketching ? startDate : null,
    weekly_schedule: isTraining ? schedule : [],
    note: serializeServiceMeta({
      serviceType,
      serviceDetail,
      coachNote: packageNote,
      mealPrepItems: isMealPrep ? mealPrepItems : [],
    }),
    status: existingPackage?.status || 'active',
  };

  const createLinkedPayment = async (pkg) => {
    if (priceVND <= 0) return;

    const title =
      serviceType === 'training'
        ? `Package #${String(packageNumber).padStart(2, '0')}`
        : `${selectedServiceType.label} #${String(packageNumber).padStart(2, '0')}`;
    const detailNote = isMealPrep
      ? buildMealPrepPaymentDetail(mealPrepItems, packageNote)
      : packageNote.trim() || null;

    const { error } = await supabase.from('payments').insert([{
      client_id: clientId,
      package_id: pkg.id,
      package_number: packageNumber,
      amount: priceVND,
      status: 'pending',
      payment_type: selectedServiceType.paymentType,
      title,
      detail_note: detailNote,
      payment_method: 'bank_transfer',
      created_by: 'coach',
    }]);

    if (error) console.warn('Payment record error:', error.message);
  };

  const handleSave = async () => {
    if (!step2Valid || isSaving) return;
    setIsSaving(true);

    try {
      let pkg = existingPackage;

      if (isEditing) {
        const { data, error } = await supabase
          .from('packages')
          .update(basePackagePayload)
          .eq('id', existingPackage.id)
          .select()
          .single();

        if (error) {
          alert(`Unable to update service: ${error.message}`);
          setIsSaving(false);
          return;
        }
        pkg = data;
      } else {
        const { data, error } = await supabase
          .from('packages')
          .insert([basePackagePayload])
          .select()
          .single();

        if (error) {
          alert(`Unable to create service: ${error.message}`);
          setIsSaving(false);
          return;
        }
        pkg = data;
      }

      if (!isEditing && isTraining) {
        const rows = previewSessions.map((session) => ({
          client_id: clientId,
          package_id: pkg.id,
          session_number: session.number,
          scheduled_date: `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`,
          scheduled_time: session.time,
          status: 'scheduled',
          session_kind: 'fixed',
        }));

        if (rows.length > 0) {
          const { error } = await supabase.from('sessions').insert(rows);
          if (error) {
            alert(`Unable to create schedule: ${error.message}`);
            setIsSaving(false);
            return;
          }
        }
      }

      if (!isEditing && (isTraining || isSketching)) {
        await createLinkedPayment(pkg);
      }

      onCreated?.();
      onClose?.();

      // ─── Notify trainee: package created (fire-and-forget) ──
      if (!isEditing && pkg) {
        void (async () => {
          const clientInfo = await fetchClientNotifInfo(clientId);
          if (clientInfo?.auth_user_id) {
            await notifyPackageCreated({
              clientAuthUserId: clientInfo.auth_user_id,
              packageNumber: pkg.package_number,
              totalSessions: pkg.total_sessions,
            });
          }
        })();
      }
      // ────────────────────────────────────────────────────────
    } catch (error) {
      alert(`Error: ${error.message}`);
      setIsSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm animate-fade-in" style={{ paddingTop: 50 }}>
      <div
        ref={scrollRef}
        className="flex h-full w-full flex-col overflow-hidden rounded-t-[32px] border-t border-white/10 bg-[var(--app-bg-dialog)] animate-modal-in"
      >
        <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[rgba(13,27,46,0.95)] px-5 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    item <= step ? 'bg-white' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              Service #{String(packageNumber).padStart(2, '0')} · {step === 1 ? 'Setup' : 'Flow'}
              <span className="ml-1 normal-case tracking-normal text-neutral-400">· {selectedServiceType.shortLabel}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] p-1.5 text-neutral-500 transition-all active:scale-90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {step === 1 && (
          <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-6">
            <div className="flex flex-col gap-5 pt-4">
              <FieldBlock label="Service Type">
                <select
                  value={serviceType}
                  onChange={(event) => setServiceType(event.target.value)}
                  className="w-full rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white outline-none transition-all focus:border-white/30"
                >
                  {SERVICE_TYPE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id} className="bg-[#101010]">
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500">{selectedServiceType.helper}</p>
              </FieldBlock>

              <FieldBlock label="Service Detail">
                <input
                  type="text"
                  placeholder={selectedServiceType.detailPlaceholder}
                  value={serviceDetail}
                  onChange={(event) => setServiceDetail(event.target.value)}
                  maxLength={80}
                  className="w-full rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white outline-none transition-all placeholder:text-neutral-700 focus:border-white/30"
                />
              </FieldBlock>

              {!isMealPrep && (
                <>
                  <div className="flex items-end gap-2">
                    <FieldBlock label={selectedServiceType.quantityLabel}>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        placeholder="0"
                        value={buyCount}
                        onChange={(event) => setBuyCount(event.target.value)}
                        className="w-full rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-center text-xl font-semibold text-white outline-none transition-all focus:border-white/30"
                      />
                    </FieldBlock>
                    <div className="shrink-0 pb-2.5 text-lg font-light text-neutral-600">+</div>
                    <FieldBlock label={selectedServiceType.bonusLabel}>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        placeholder="0"
                        value={bonusCount}
                        onChange={(event) => setBonusCount(event.target.value)}
                        className="w-full rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-center text-xl font-semibold text-purple-400 outline-none transition-all focus:border-purple-400/30"
                      />
                    </FieldBlock>
                    <div className="shrink-0 pb-2.5 text-lg font-light text-neutral-600">=</div>
                    <FieldBlock label={selectedServiceType.totalLabel}>
                      <div className="rounded-[14px] border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-center">
                        <span className="text-xl font-bold text-white">{totalSessions || '—'}</span>
                      </div>
                    </FieldBlock>
                  </div>

                  <FieldBlock label="Service Value (VND)">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Example: 15.000.000"
                        value={priceInput}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/\D/g, '');
                          setPriceInput(raw ? formatDots(raw) : '');
                        }}
                        className="w-full rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 pr-12 text-base font-medium text-white outline-none transition-all focus:border-white/30"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-700">₫</span>
                    </div>
                    {priceFormatted && (
                      <div className="mt-1.5 flex items-center gap-2 px-1">
                        <span className="text-[10px] text-neutral-600">→</span>
                        <span className="text-sm font-semibold text-emerald-400">{priceFormatted} ₫</span>
                      </div>
                    )}
                  </FieldBlock>
                </>
              )}

              {isMealPrep && (
                <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Meal Prep Flow</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
                    Build the item list first, update it as needed, then create payment separately when the checklist is ready to send.
                  </p>
                </div>
              )}

              <FieldBlock label="Service Note (Optional)">
                <input
                  type="text"
                  placeholder="VD: Chapter 1, Cutting, Bulking…"
                  value={packageNote}
                  onChange={(event) => setPackageNote(event.target.value)}
                  maxLength={120}
                  className="w-full rounded-[14px] border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white outline-none transition-all placeholder:text-neutral-700 focus:border-white/30"
                />
              </FieldBlock>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-[18px] bg-white py-4 font-bold text-black shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isMealPrep ? 'Build Checklist' : isSketching ? 'Review Flow' : 'Set Schedule'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-6">
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <div className="flex flex-1 items-center gap-4">
                  {!isMealPrep && (
                    <>
                      <div className="text-center">
                        <p className="text-base font-bold text-white">{sessionCount}</p>
                        <p className="text-[8px] uppercase text-neutral-600">{selectedServiceType.quantityLabel}</p>
                      </div>
                      {bonusSessions > 0 && (
                        <>
                          <span className="text-neutral-700">+</span>
                          <div className="text-center">
                            <p className="text-base font-bold text-purple-400">{bonusSessions}</p>
                            <p className="text-[8px] uppercase text-neutral-600">Bonus</p>
                          </div>
                        </>
                      )}
                      <span className="text-neutral-700">=</span>
                    </>
                  )}
                  <div className="text-center">
                    <p className="text-base font-bold text-white">{isMealPrep ? mealPrepItems.length : totalSessions}</p>
                    <p className="text-[8px] uppercase text-emerald-500">{isMealPrep ? 'Rows' : selectedServiceType.totalLabel}</p>
                  </div>
                </div>
                {priceFormatted && (
                  <span className="text-xs font-semibold text-emerald-400">{priceFormatted} ₫</span>
                )}
              </div>

              <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Service Summary</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedServiceType.label}</p>
                {serviceDetail.trim() && <p className="mt-1 text-[11px] text-neutral-400">{serviceDetail.trim()}</p>}
                {packageNote.trim() && <p className="mt-2 text-[11px] text-neutral-500">Coach note: {packageNote.trim()}</p>}
              </div>

              {isTraining && (
                <>
                  <FieldBlock label="Start Date">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      min={(() => {
                        const d = new Date();
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      })()}
                      className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    />
                  </FieldBlock>

                  <FieldBlock label="Session Length">
                    <div className="grid grid-cols-4 gap-2">
                      {DURATIONS.map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          onClick={() => setSessionDuration(duration)}
                          className={`rounded-[12px] py-2.5 text-xs font-black transition-all active:scale-95 ${
                            sessionDuration === duration
                              ? 'bg-white text-black'
                              : 'border border-white/[0.08] bg-white/[0.04] text-neutral-400'
                          }`}
                        >
                          {duration}'
                        </button>
                      ))}
                    </div>
                  </FieldBlock>

                  <FieldBlock label="Weekly Training Days">
                    <div className="mb-3 grid grid-cols-7 gap-1.5">
                      {DAY_LABELS.map(({ day, short }) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`rounded-[12px] py-2.5 text-[11px] font-black transition-all active:scale-90 ${
                            isDaySelected(day)
                              ? 'bg-white text-black'
                              : 'border border-white/[0.08] bg-white/[0.04] text-neutral-500'
                          }`}
                        >
                          {short}
                        </button>
                      ))}
                    </div>

                    {schedule.length > 0 && (
                      <div className="space-y-2">
                        {schedule.map(({ day, time }) => {
                          const dayInfo = DAY_LABELS.find((item) => item.day === day);
                          return (
                            <div
                              key={day}
                              className="flex items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-4 py-2.5"
                            >
                              <span className="w-12 shrink-0 text-[11px] font-black text-white">{dayInfo?.short}</span>
                              <input
                                type="time"
                                value={time}
                                onChange={(event) => updateDayTime(day, event.target.value)}
                                className="bg-transparent text-sm font-medium text-white outline-none"
                              />
                              <span className="text-[10px] text-neutral-600">→</span>
                              <span className="text-[11px] font-medium text-neutral-400">{addMinutes(time, sessionDuration)}</span>
                              <span className="ml-auto text-[9px] text-neutral-700">{sessionDuration}'</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </FieldBlock>

                  {previewSessions.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">
                          Preview · {previewSessions.length} sessions
                        </span>
                        {previewSessions.length === totalSessions && (
                          <span className="text-[9px] font-black text-emerald-400">Ready · {totalSessions} sessions</span>
                        )}
                      </div>
                      <div className="hide-scrollbar max-h-[160px] space-y-1.5 overflow-y-auto">
                        {previewSessions.map((session) => (
                          <div
                            key={session.number}
                            className="flex items-center gap-3 rounded-[10px] bg-white/[0.02] px-3 py-2"
                          >
                            <span className="w-6 shrink-0 text-[10px] font-black text-neutral-600">#{session.number}</span>
                            <span className="flex-1 text-xs text-white">{formatDate(session.date)}</span>
                            <span className="text-[11px] text-neutral-500">{session.time}</span>
                            <span className="text-[10px] text-neutral-700">→ {addMinutes(session.time, sessionDuration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {schedule.length === 0 && (
                    <div className="py-6 text-center text-neutral-700">
                      <Calendar className="mx-auto mb-2 h-7 w-7 opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Pick training days to preview the schedule
                      </p>
                    </div>
                  )}
                </>
              )}

              {isSketching && (
                <div className="space-y-3">
                  <FieldBlock label="Service Start">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    />
                  </FieldBlock>
                  <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Manual Review Flow</p>
                      <p className="mt-2 text-[11px] leading-relaxed text-neutral-400">
                      This service will not create a fixed schedule now. After saving, use the Sessions tab to add each sketching session manually, similar to an extra session.
                    </p>
                  </div>
                </div>
              )}

              {isMealPrep && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Meal Prep Checklist</p>
                    <button
                      type="button"
                      onClick={addMealPrepItem}
                      className="inline-flex items-center gap-1.5 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white"
                    >
                      <Plus className="h-3 w-3" />
                      Add Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {mealPrepItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="space-y-3 rounded-[16px] border border-white/[0.06] bg-white/[0.03] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            Row {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeMealPrepItem(item.id)}
                            disabled={mealPrepItems.length === 1}
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] p-2 text-neutral-400 disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <FieldBlock label="Food Group">
                            <>
                              <input
                                list={`meal-prep-groups-${item.id}`}
                                type="text"
                                value={item.foodGroup}
                                onChange={(event) => {
                                  const nextGroup = event.target.value;
                                  updateMealPrepItem(item.id, 'foodGroup', nextGroup);

                                  const allowedProducts = getMealPrepProductOptions(nextGroup);
                                  if (item.productName && !allowedProducts.includes(item.productName)) {
                                    updateMealPrepItem(item.id, 'productName', '');
                                  }
                                }}
                                placeholder="Choose or type a food group"
                                className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                              />
                              <datalist id={`meal-prep-groups-${item.id}`}>
                                {MEAL_PREP_GROUP_OPTIONS.map((group) => (
                                  <option key={group} value={group} />
                                ))}
                              </datalist>
                            </>
                          </FieldBlock>
                          <FieldBlock label="Product Name">
                            <>
                              <input
                                list={`meal-prep-products-${item.id}`}
                                type="text"
                                value={item.productName}
                                onChange={(event) => updateMealPrepItem(item.id, 'productName', event.target.value)}
                                placeholder="Choose or type a product"
                                className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                              />
                              <datalist id={`meal-prep-products-${item.id}`}>
                                {getMealPrepProductOptions(item.foodGroup).map((product) => (
                                  <option key={`${item.id}-${product}`} value={product} />
                                ))}
                              </datalist>
                            </>
                          </FieldBlock>
                          <div className="grid grid-cols-[1fr_1fr] gap-3">
                            <FieldBlock label="Unit">
                              <select
                                value={item.unit}
                                onChange={(event) => updateMealPrepItem(item.id, 'unit', event.target.value)}
                                className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                              >
                                {MEAL_PREP_UNIT_OPTIONS.map((unit) => (
                                  <option key={unit} value={unit} className="bg-[#101010]">
                                    {unit}
                                  </option>
                                ))}
                              </select>
                            </FieldBlock>
                            <FieldBlock label="Quantity">
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(event) => updateMealPrepItem(item.id, 'quantity', event.target.value)}
                                placeholder="0"
                                className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                              />
                            </FieldBlock>
                          </div>
                          <FieldBlock label="Amount (₫)">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.amount ? formatDots(String(item.amount)) : ''}
                              onChange={(event) => {
                                const raw = event.target.value.replace(/\D/g, '');
                                updateMealPrepItem(item.id, 'amount', raw);
                              }}
                              placeholder="0"
                              className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                            />
                          </FieldBlock>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Current Total</span>
                      <span className="text-sm font-semibold text-emerald-400">{formatDots(String(mealPrepAmount || 0))} ₫</span>
                    </div>
                    <p className="mt-2 text-[11px] text-neutral-500">
                      Save this service first. Later, use “Create Payment” from the active service card when the checklist is ready to bill.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-none rounded-[18px] border border-white/[0.08] bg-white/[0.04] px-5 py-3.5 text-sm font-bold text-white transition-all active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!step2Valid || isSaving}
                  className="flex-1 rounded-[18px] bg-white py-3.5 font-bold text-black shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {isEditing ? 'Saving...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {isEditing ? 'Save Service' : 'Create Service'}
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CreatePackageModal;
