import React, { useState, useMemo } from 'react';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, RefreshCw,
  Calendar, Clock, Gift
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// ─── CONSTANTS ───────────────────────────────────────────────
const DAY_LABELS = [
  { day: 1, short: 'T2', full: 'Thứ 2' },
  { day: 2, short: 'T3', full: 'Thứ 3' },
  { day: 3, short: 'T4', full: 'Thứ 4' },
  { day: 4, short: 'T5', full: 'Thứ 5' },
  { day: 5, short: 'T6', full: 'Thứ 6' },
  { day: 6, short: 'T7', full: 'Thứ 7' },
  { day: 0, short: 'CN', full: 'Chủ nhật' },
];
const DURATIONS = [45, 60, 75, 90];
const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

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

// price helpers — user types in đơn vị nghìn đồng, stored ×1000
const formatThousands = (raw) => {
  const digits = raw.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const displayVND = (raw) => {
  // raw = user input string in nghìn, show full VNĐ with dots
  const val = parseInt(raw.replace(/\D/g, '') || '0') * 1000;
  return val > 0 ? val.toLocaleString('vi-VN').replace(/,/g, '.') : null;
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
  const [priceInput, setPriceInput] = useState(''); // in nghìn đồng

  // Step 2
  const [startDate, setStartDate] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [isCreating, setIsCreating] = useState(false);

  // Computed
  const sessionCount = parseInt(buyCount) || 0;
  const bonusSessions = parseInt(bonusCount) || 0;
  const totalSessions = sessionCount + bonusSessions;
  const priceVND = parseInt(priceInput.replace(/\D/g, '') || '0') * 1000; // stored value
  const priceFormatted = displayVND(priceInput); // display string

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
          status: 'active',
        }])
        .select()
        .single();

      if (pkgErr) { alert('Lỗi tạo gói: ' + pkgErr.message); setIsCreating(false); return; }

      // 2. Bulk insert sessions
      const rows = previewSessions.map(s => ({
        client_id: clientId,
        package_id: pkg.id,
        session_number: s.number,
        scheduled_date: s.date.toISOString().split('T')[0],
        scheduled_time: s.time,
        status: 'scheduled',
      }));
      const { error: sessErr } = await supabase.from('sessions').insert(rows);
      if (sessErr) { alert('Lỗi tạo lịch: ' + sessErr.message); setIsCreating(false); return; }

      // 3. Insert payment record — status: unpaid
      if (priceVND > 0) {
        const { error: payErr } = await supabase.from('payments').insert([{
          client_id: clientId,
          package_id: pkg.id,
          package_number: packageNumber,
          amount: priceVND,
          status: 'unpaid',
        }]);
        if (payErr) console.warn('Payment record error:', payErr.message);
      }

      onCreated();
      onClose();
    } catch (err) {
      alert('Lỗi: ' + err.message);
      setIsCreating(false);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className="fixed inset-x-0 bottom-0 top-[66px] z-[500] flex items-end bg-black/60 backdrop-blur-sm">
      <div className="w-full bg-[#0d0d0d] border-t border-white/10 rounded-t-[32px] max-h-full overflow-y-auto hide-scrollbar animate-slide-up">

        {/* Compact header */}
        <div className="sticky top-0 bg-[#0d0d0d]/95 backdrop-blur-xl z-10 px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 flex-1">
              {[1, 2].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-white' : 'bg-white/10'}`} />
              ))}
            </div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest shrink-0">
              Gói #{String(packageNumber).padStart(2, '0')} · {step === 1 ? 'Thông tin' : 'Lịch tập'}
            </span>
            <button type="button" onClick={onClose} className="p-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-neutral-500 active:scale-90 transition-all shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-8">

          {/* ═══ STEP 1 ═══ */}
          {step === 1 && (
            <div className="space-y-6 pt-5">

              {/* Title */}
              <p className="text-white font-semibold text-base">
                Gói tập số <span className="text-blue-400">#{String(packageNumber).padStart(2, '0')}</span>
              </p>

              {/* Buổi mua + Buổi tặng = Tổng */}
              <div className="flex items-end gap-3">
                {/* Buổi mua */}
                <FieldBlock label="Buổi mua">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    placeholder="0"
                    value={buyCount}
                    onChange={e => setBuyCount(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[16px] py-3 px-4 text-white text-xl font-semibold text-center outline-none focus:border-white/30 transition-all"
                  />
                </FieldBlock>

                {/* + */}
                <div className="pb-3.5 text-neutral-600 text-lg font-light shrink-0">+</div>

                {/* Buổi tặng */}
                <FieldBlock label="Buổi tặng">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      placeholder="0"
                      value={bonusCount}
                      onChange={e => setBonusCount(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[16px] py-3 px-4 text-purple-400 text-xl font-semibold text-center outline-none focus:border-purple-400/30 transition-all"
                    />
                    {bonusSessions > 0 && (
                      <Gift className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-500/60" />
                    )}
                  </div>
                </FieldBlock>

                {/* = */}
                <div className="pb-3.5 text-neutral-600 text-lg font-light shrink-0">=</div>

                {/* Tổng */}
                <FieldBlock label="Tổng buổi">
                  <div className="bg-white/[0.06] border border-white/[0.1] rounded-[16px] py-3 px-4 text-center">
                    <span className="text-white text-xl font-bold">{totalSessions || '—'}</span>
                  </div>
                </FieldBlock>
              </div>

              {/* Giá tiền */}
              <div>
                <FieldBlock label="Giá trị gói (đơn vị: nghìn ₫)">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ví dụ: 15000"
                      value={priceInput}
                      onChange={e => setPriceInput(formatThousands(e.target.value))}
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[16px] py-3 px-4 text-white text-base font-medium outline-none focus:border-white/30 transition-all pr-20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-700">× 1.000 ₫</span>
                  </div>
                  {/* Auto-display full VNĐ */}
                  {priceFormatted && (
                    <div className="mt-2 flex items-center gap-2 px-1">
                      <span className="text-[10px] text-neutral-600">→</span>
                      <span className="text-sm font-semibold text-emerald-400">{priceFormatted} ₫</span>
                    </div>
                  )}
                </FieldBlock>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full bg-white text-black font-bold py-4 rounded-[20px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cài lịch tập
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ═══ STEP 2: Schedule ═══ */}
          {step === 2 && (
            <div className="space-y-4 pt-4">

              {/* Package summary mini */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-[16px] px-4 py-3">
                <div className="flex-1 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-white font-bold text-base">{sessionCount}</p>
                    <p className="text-[8px] text-neutral-600 uppercase">Mua</p>
                  </div>
                  {bonusSessions > 0 && <>
                    <span className="text-neutral-700">+</span>
                    <div className="text-center">
                      <p className="text-purple-400 font-bold text-base">{bonusSessions}</p>
                      <p className="text-[8px] text-neutral-600 uppercase">Tặng</p>
                    </div>
                  </>}
                  <span className="text-neutral-700">=</span>
                  <div className="text-center">
                    <p className="text-white font-bold text-base">{totalSessions}</p>
                    <p className="text-[8px] text-emerald-500 uppercase">Tổng</p>
                  </div>
                </div>
                {priceFormatted && (
                  <span className="text-emerald-400 text-xs font-semibold">{priceFormatted} ₫</span>
                )}
              </div>

              {/* Ngày bắt đầu */}
              <div>
                <FieldBlock label="Ngày bắt đầu">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-2.5 px-4 text-white text-sm outline-none focus:border-white/20"
                  />
                </FieldBlock>
              </div>

              {/* Thời lượng */}
              <div>
                <FieldBlock label="Thời lượng mỗi buổi">
                  <div className="grid grid-cols-4 gap-2">
                    {DURATIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSessionDuration(d)}
                        className={`py-2.5 rounded-[12px] font-black text-xs transition-all active:scale-95 ${
                          sessionDuration === d ? 'bg-white text-black' : 'bg-white/[0.04] border border-white/[0.08] text-neutral-400'
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
                <FieldBlock label="Ngày tập hàng tuần">
                  <div className="grid grid-cols-7 gap-1.5 mb-3">
                    {DAY_LABELS.map(({ day, short }) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`py-2.5 rounded-[12px] font-black text-[11px] transition-all active:scale-90 ${
                          isDaySelected(day) ? 'bg-white text-black' : 'bg-white/[0.04] border border-white/[0.08] text-neutral-500'
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
                    <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Preview · {previewSessions.length} buổi</span>
                    {previewSessions.length === totalSessions && (
                      <span className="text-[9px] font-black text-emerald-400">✓ Đủ {totalSessions} buổi</span>
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
                    <p className="text-[10px] text-yellow-500/80 mt-2">⚠️ Chỉ tạo được {previewSessions.length}/{totalSessions} buổi</p>
                  )}
                </div>
              )}

              {schedule.length === 0 && (
                <div className="text-center py-6 text-neutral-700">
                  <Calendar className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Chọn ngày tập để xem preview</p>
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
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!step2Valid || isCreating}
                  className="flex-1 bg-white text-black font-bold py-3.5 rounded-[18px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCreating
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Đang tạo...</>
                    : <><CheckCircle2 className="w-4 h-4" /> Tạo gói</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePackageModal;
