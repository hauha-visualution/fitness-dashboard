import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, RefreshCw,
  Calendar, Clock, Gift
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// ─── CONSTANTS ───────────────────────────────────────────────
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

// ─── UTILITIES ───────────────────────────────────────────────
const generateSessionDates = (startDate, schedule, totalCount) => {
  if (!startDate || !schedule.length || totalCount <= 0) return [];
  const sessions = [];
  const start = new Date(startDate + 'T00:00:00');
  let current = new Date(start);
  let safety = 0;
  while (sessions.length < totalCount && safety < 730) {
    const slot = schedule.find(s => s.day === current.getDay());
    if (slot) {
      sessions.push({ number: sessions.length + 1, date: new Date(current), time: slot.time });
    }
    current.setDate(current.getDate() + 1);
    safety++;
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

// price: coach gõ số đầy đủ, auto thêm "." cho dễ nhìn
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

// ─── FIELD: label on top, input/display below ─────────────────
const FieldBlock = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">{label}</span>
    {children}
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────
const CreatePackageModal = ({ clientId, packageNumber, onClose, onCreated }) => {
  // Step 1
  const [step, setStep] = useState(1);
  const [buyCount, setBuyCount] = useState('');
  const [bonusCount, setBonusCount] = useState('');
  const [priceInput, setPriceInput] = useState(''); // full VND value, raw digits
  const [packageNote, setPackageNote] = useState(''); // coach custom note

  // Step 2
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [schedule, setSchedule] = useState([]);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [isCreating, setIsCreating] = useState(false);
  const scrollRef = useRef(null);

  // Always scroll to top when step changes (animation starts from bottom)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  // Computed
  const sessionCount = parseInt(buyCount) || 0;
  const bonusSessions = parseInt(bonusCount) || 0;
  const totalSessions = sessionCount + bonusSessions;
  const priceRawDigits = priceInput.replace(/\D/g, '');
  const priceVND = parseInt(priceRawDigits || '0'); // full VND value, no multiplier
  const priceFormatted = priceRawDigits ? formatDots(priceRawDigits) : '';

  const previewSessions = useMemo(
    () => generateSessionDates(startDate, schedule, totalSessions),
    [startDate, schedule, totalSessions]
  );

  // ─── Schedule helpers ─────────────────────────────────────
  const toggleDay = (day) => {
    setSchedule(prev => {
      const exists = prev.find(s => s.day === day);
      if (exists) return prev.filter(s => s.day !== day);
      return [...prev, { day, time: '07:00' }].sort((a, b) => {
        const da = a.day === 0 ? 7 : a.day;
        const db = b.day === 0 ? 7 : b.day;
        return da - db;
      });
    });
  };
  const updateDayTime = (day, time) =>
    setSchedule(prev => prev.map(s => s.day === day ? { ...s, time } : s));
  const isDaySelected = (day) => schedule.some(s => s.day === day);

  // ─── Validation ───────────────────────────────────────────
  const step1Valid = sessionCount >= 1 && sessionCount <= 200;
  const step2Valid = startDate && schedule.length > 0 && previewSessions.length === totalSessions;

  // ─── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!step2Valid || isCreating) return;
    setIsCreating(true);

    try {
      // 1. Insert package
      const { data: pkg, error: pkgErr } = await supabase
        .from('packages')
        .insert([{
          client_id: clientId,
          package_number: packageNumber,
          session_count: sessionCount,
          bonus_sessions: bonusSessions,
          total_sessions: totalSessions,
          price: priceVND,
          start_date: startDate,
          weekly_schedule: schedule,
          note: packageNote.trim() || null,
          status: 'active',
        }])
        .select()
        .single();

      if (pkgErr) { alert('Unable to create package: ' + pkgErr.message); setIsCreating(false); return; }

      // 2. Bulk insert sessions
      const rows = previewSessions.map(s => ({
        client_id: clientId,
        package_id: pkg.id,
        session_number: s.number,
        scheduled_date: `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, '0')}-${String(s.date.getDate()).padStart(2, '0')}`,
        scheduled_time: s.time,
        status: 'scheduled',
        session_kind: 'fixed',
      }));
      const { error: sessErr } = await supabase.from('sessions').insert(rows);
      if (sessErr) { alert('Unable to create schedule: ' + sessErr.message); setIsCreating(false); return; }

      // 3. Insert payment record — status: unpaid
      if (priceVND > 0) {
        const { error: payErr } = await supabase.from('payments').insert([{
          client_id: clientId,
          package_id: pkg.id,
          package_number: packageNumber,
          amount: priceVND,
          status: 'pending',
          payment_type: 'package',
          title: `Package #${String(packageNumber).padStart(2, '0')}`,
          detail_note: packageNote.trim() || null,
          payment_method: 'bank_transfer',
          created_by: 'coach',
        }]);
        if (payErr) console.warn('Payment record error:', payErr.message);
      }

      onCreated();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
      setIsCreating(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm" style={{ paddingTop: 50 }}>
      <div ref={scrollRef} className="w-full h-full bg-[var(--app-bg-dialog)] border-t border-white/10 rounded-t-[32px] flex flex-col overflow-hidden">

        {/* Compact header */}
        <div className="sticky top-0 bg-[rgba(13,27,46,0.95)] backdrop-blur-xl z-10 px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 flex-1">
              {[1, 2].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-white' : 'bg-white/10'}`} />
              ))}
            </div>
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest shrink-0">
              Service #{String(packageNumber).padStart(2, '0')} · {step === 1 ? 'Setup' : 'Schedule'}
              {packageNote.trim() && <span className="normal-case tracking-normal text-neutral-400 ml-1">· {packageNote.trim()}</span>}
            </span>
            <button type="button" onClick={onClose} className="p-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-neutral-500 active:scale-90 transition-all shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step 1: scrollable */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-6">
            <div className="flex flex-col gap-5 pt-4">

              {/* Buổi mua + Buổi tặng = Tổng */}
              <div className="flex items-end gap-2">
                {/* Buổi mua */}
                <FieldBlock label="Purchased">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    placeholder="0"
                    value={buyCount}
                    onChange={e => setBuyCount(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[14px] py-2.5 px-3 text-white text-xl font-semibold text-center outline-none focus:border-white/30 transition-all"
                  />
                </FieldBlock>

                {/* + */}
                <div className="pb-2.5 text-neutral-600 text-lg font-light shrink-0">+</div>

                {/* Buổi tặng */}
                <FieldBlock label="Bonus">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0"
                    value={bonusCount}
                    onChange={e => setBonusCount(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[14px] py-2.5 px-3 text-purple-400 text-xl font-semibold text-center outline-none focus:border-purple-400/30 transition-all"
                  />
                </FieldBlock>

                {/* = */}
                <div className="pb-2.5 text-neutral-600 text-lg font-light shrink-0">=</div>

                {/* Tổng */}
                <FieldBlock label="Total">
                  <div className="bg-white/[0.06] border border-white/[0.1] rounded-[14px] py-2.5 px-3 text-center">
                    <span className="text-white text-xl font-bold">{totalSessions || '—'}</span>
                  </div>
                </FieldBlock>
              </div>

              {/* Giá tiền — coach gõ full VND, auto thêm "." */}
              <FieldBlock label="Service Value (VND)">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Example: 15.000.000"
                    value={priceInput}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setPriceInput(raw ? formatDots(raw) : '');
                    }}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[14px] py-2.5 px-4 text-white text-base font-medium outline-none focus:border-white/30 transition-all pr-12"
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

              {/* Ghi chú gói */}
              <FieldBlock label="Service Note (Optional)">
                <input
                  type="text"
                  placeholder="VD: Chapter 1, Cutting, Bulking…"
                  value={packageNote}
                  onChange={e => setPackageNote(e.target.value)}
                  maxLength={60}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[14px] py-2.5 px-4 text-white text-sm font-medium outline-none focus:border-white/30 transition-all placeholder:text-neutral-700"
                />
              </FieldBlock>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full bg-white text-black font-bold py-4 rounded-[18px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                Set Schedule
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: scrollable */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-6">
            <div className="space-y-4 pt-4">

              {/* Package summary mini */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-[16px] px-4 py-3">
                <div className="flex-1 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-white font-bold text-base">{sessionCount}</p>
                    <p className="text-[8px] text-neutral-600 uppercase">Base</p>
                  </div>
                  {bonusSessions > 0 && <>
                    <span className="text-neutral-700">+</span>
                    <div className="text-center">
                      <p className="text-purple-400 font-bold text-base">{bonusSessions}</p>
                      <p className="text-[8px] text-neutral-600 uppercase">Bonus</p>
                    </div>
                  </>}
                  <span className="text-neutral-700">=</span>
                  <div className="text-center">
                    <p className="text-white font-bold text-base">{totalSessions}</p>
                    <p className="text-[8px] text-emerald-500 uppercase">Total</p>
                  </div>
                </div>
                {priceFormatted && (
                  <span className="text-emerald-400 text-xs font-semibold">{priceFormatted} ₫</span>
                )}
              </div>

              {/* Ngày bắt đầu */}
              <div>
                <FieldBlock label="Start Date">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-2.5 px-4 text-white text-sm outline-none focus:border-white/20"
                  />
                </FieldBlock>
              </div>

              {/* Thời lượng */}
              <div>
                <FieldBlock label="Session Length">
                  <div className="grid grid-cols-4 gap-2">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSessionDuration(d)}
                        className={`py-2.5 rounded-[12px] font-black text-xs transition-all active:scale-95 ${sessionDuration === d ? 'bg-white text-black' : 'bg-white/[0.04] border border-white/[0.08] text-neutral-400'
                          }`}
                      >
                        {d}'
                      </button>
                    ))}
                  </div>
                </FieldBlock>
              </div>

              {/* Ngày tập */}
              <div>
                <FieldBlock label="Weekly Training Days">
                  <div className="grid grid-cols-7 gap-1.5 mb-3">
                    {DAY_LABELS.map(({ day, short }) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`py-2.5 rounded-[12px] font-black text-[11px] transition-all active:scale-90 ${isDaySelected(day) ? 'bg-white text-black' : 'bg-white/[0.04] border border-white/[0.08] text-neutral-500'
                          }`}
                      >
                        {short}
                      </button>
                    ))}
                  </div>

                  {schedule.length > 0 && (
                    <div className="space-y-2">
                      {schedule.map(({ day, time }) => {
                        const dayInfo = DAY_LABELS.find(d => d.day === day);
                        return (
                          <div key={day} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-[14px] px-4 py-2.5">
                            <span className="text-white font-black text-[11px] w-12 shrink-0">{dayInfo?.short}</span>
                            <input
                              type="time"
                              value={time}
                              onChange={e => updateDayTime(day, e.target.value)}
                              className="bg-transparent text-white text-sm outline-none font-medium"
                            />
                            <span className="text-neutral-600 text-[10px]">→</span>
                            <span className="text-neutral-400 text-[11px] font-medium">{addMinutes(time, sessionDuration)}</span>
                            <span className="text-neutral-700 text-[9px] ml-auto">{sessionDuration}'</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </FieldBlock>
              </div>

              {/* Preview */}
              {previewSessions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Preview · {previewSessions.length} sessions</span>
                    {previewSessions.length === totalSessions && (
                      <span className="text-[9px] font-black text-emerald-400">Ready · {totalSessions} sessions</span>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto hide-scrollbar">
                    {previewSessions.map(s => (
                      <div key={s.number} className="flex items-center gap-3 bg-white/[0.02] rounded-[10px] px-3 py-2">
                        <span className="text-[10px] font-black text-neutral-600 w-6 shrink-0">#{s.number}</span>
                        <span className="text-xs text-white flex-1">{formatDate(s.date)}</span>
                        <span className="text-[11px] text-neutral-500">{s.time}</span>
                        <span className="text-neutral-700 text-[10px]">→ {addMinutes(s.time, sessionDuration)}</span>
                      </div>
                    ))}
                  </div>
                  {previewSessions.length < totalSessions && (
                    <p className="text-[10px] text-yellow-500/80 mt-2">Only {previewSessions.length}/{totalSessions} sessions can be generated with this schedule.</p>
                  )}
                </div>
              )}

              {schedule.length === 0 && (
                <div className="text-center py-6 text-neutral-700">
                  <Calendar className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Pick training days to preview the schedule</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-none px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-[18px] text-white flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!step2Valid || isCreating}
                  className="flex-1 bg-white text-black font-bold py-3.5 rounded-[18px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCreating
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Create Service</>
                  }
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
