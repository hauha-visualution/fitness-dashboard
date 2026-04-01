import React, { useState, useMemo } from 'react';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, RefreshCw,
  Calendar, Clock, Package, Gift
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
const SESSION_PRESETS = [8, 10, 12, 20, 24];
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

const formatPrice = (raw) => {
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

// ─── MAIN COMPONENT ──────────────────────────────────────────
const CreatePackageModal = ({ clientId, packageNumber, onClose, onCreated }) => {
  // Step 1: package info
  const [step, setStep] = useState(1);
  // Use single sessionCount state, null = custom mode
  const [selectedPreset, setSelectedPreset] = useState(12);
  const [customValue, setCustomValue] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [bonusSessions, setBonusSessions] = useState(0);

  // Step 2: schedule
  const [startDate, setStartDate] = useState('');
  const [schedule, setSchedule] = useState([]); // [{ day, time }]
  const [sessionDuration, setSessionDuration] = useState(60); // minutes
  const [isCreating, setIsCreating] = useState(false);

  // Computed
  const sessionCount = customValue !== '' ? (parseInt(customValue) || 0) : selectedPreset;
  const totalSessions = sessionCount + bonusSessions;
  const priceRaw = priceDisplay.replace(/\./g, '');
  const previewSessions = useMemo(
    () => generateSessionDates(startDate, schedule, totalSessions),
    [startDate, schedule, totalSessions]
  );

  // ─── STEP 2: Schedule helpers ─────────────────────────────
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

  const updateDayTime = (day, time) => {
    setSchedule(prev => prev.map(s => s.day === day ? { ...s, time } : s));
  };

  const isDaySelected = (day) => schedule.some(s => s.day === day);

  // ─── VALIDATION ───────────────────────────────────────────
  const step1Valid = sessionCount >= 1 && sessionCount <= 200;
  const step2Valid = startDate && schedule.length > 0 && previewSessions.length === totalSessions;

  // ─── SAVE ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!step2Valid || isCreating) return;
    setIsCreating(true);

    try {
      // Insert package
      const { data: pkg, error: pkgErr } = await supabase
        .from('packages')
        .insert([{
          client_id: clientId,
          package_number: packageNumber,
          session_count: sessionCount,
          bonus_sessions: bonusSessions,
          total_sessions: totalSessions,
          price: parseInt(priceRaw) || 0,
          start_date: startDate,
          weekly_schedule: schedule,
          status: 'active',
        }])
        .select()
        .single();

      if (pkgErr) {
        alert('Lỗi tạo gói: ' + pkgErr.message);
        setIsCreating(false);
        return;
      }

      // Bulk insert sessions
      const rows = previewSessions.map(s => ({
        client_id: clientId,
        package_id: pkg.id,
        session_number: s.number,
        scheduled_date: s.date.toISOString().split('T')[0],
        scheduled_time: s.time,
        status: 'scheduled',
      }));

      const { error: sessErr } = await supabase.from('sessions').insert(rows);

      if (sessErr) {
        alert('Lỗi tạo lịch: ' + sessErr.message);
        setIsCreating(false);
        return;
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
    <div className="fixed inset-0 z-[200] flex items-end bg-black/70 backdrop-blur-sm">
      <div className="w-full bg-[#0d0d0d] border-t border-white/10 rounded-t-[32px] max-h-[92vh] overflow-y-auto hide-scrollbar animate-slide-up">

        {/* Header */}
        <div className="sticky top-0 bg-[#0d0d0d]/95 backdrop-blur-xl z-10 px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-blue-400" />
              <div>
                <h3 className="text-white font-medium">Tạo gói #{String(packageNumber).padStart(2, '0')}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/[0.04] border border-white/[0.08] rounded-full text-neutral-500 active:scale-90 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex gap-2">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-white' : 'bg-white/10'}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 1 ? 'text-neutral-400' : 'text-neutral-700'}`}>Thông tin gói</span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${step >= 2 ? 'text-neutral-400' : 'text-neutral-700'}`}>Lịch tập</span>
          </div>
        </div>

        <div className="px-6 pb-8">

          {/* ═══ STEP 1: Package Info ═══ */}
          {step === 1 && (
            <div className="space-y-5 pt-5">

              {/* Số buổi mua */}
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Số buổi mua</p>
                <div className="grid grid-cols-5 gap-2 mb-2.5">
                  {SESSION_PRESETS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setSelectedPreset(p); setCustomValue(''); }}
                      className={`py-3.5 rounded-[16px] font-black text-sm transition-all active:scale-95 ${
                        selectedPreset === p && customValue === ''
                          ? 'bg-white text-black'
                          : 'bg-white/[0.04] border border-white/[0.08] text-neutral-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="200"
                  placeholder="Số khác..."
                  value={customValue}
                  onChange={e => { setCustomValue(e.target.value); setSelectedPreset(null); }}
                  onFocus={() => setSelectedPreset(null)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[14px] py-2.5 px-4 text-white text-sm outline-none focus:border-white/20"
                />
              </div>

              {/* Giá + buổi tặng - cùng hàng */}
              <div className="space-y-2.5">
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Giá & khuyến mãi</p>

                {/* Giá tiền */}
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Giá tiền (VNĐ)..."
                    value={priceDisplay}
                    onChange={e => setPriceDisplay(formatPrice(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[14px] py-2.5 pl-4 pr-14 text-white text-sm outline-none focus:border-white/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-600">VNĐ</span>
                </div>

                {/* Buổi tặng - compact inline */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-[14px] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs text-neutral-400">Buổi tặng thêm</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBonusSessions(Math.max(0, bonusSessions - 1))}
                      className="w-7 h-7 bg-white/[0.06] border border-white/[0.1] rounded-full text-white flex items-center justify-center active:scale-90 font-bold text-base leading-none"
                    >
                      –
                    </button>
                    <span className="text-white font-medium w-5 text-center">{bonusSessions}</span>
                    <button
                      type="button"
                      onClick={() => setBonusSessions(bonusSessions + 1)}
                      className="w-7 h-7 bg-white/[0.06] border border-white/[0.1] rounded-full text-white flex items-center justify-center active:scale-90 font-bold text-base leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary compact */}
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] px-5 py-4">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-2xl font-light text-white">{sessionCount || 0}</p>
                    <p className="text-[8px] font-black text-neutral-600 uppercase mt-0.5">Mua</p>
                  </div>
                  <div className="text-neutral-700 text-lg font-light">+</div>
                  <div className="text-center">
                    <p className="text-2xl font-light text-purple-400">{bonusSessions}</p>
                    <p className="text-[8px] font-black text-neutral-600 uppercase mt-0.5">Tặng</p>
                  </div>
                  <div className="text-neutral-700 text-lg font-light">=</div>
                  <div className="text-center bg-white/[0.05] rounded-[14px] px-4 py-2">
                    <p className="text-2xl font-bold text-white">{totalSessions}</p>
                    <p className="text-[8px] font-black text-emerald-400 uppercase mt-0.5">Tổng buổi</p>
                  </div>
                </div>
                {priceDisplay ? (
                  <p className="text-center text-xs text-neutral-500 mt-3 pt-3 border-t border-white/[0.05]">
                    {priceDisplay} <span className="text-neutral-700">VNĐ</span>
                  </p>
                ) : null}
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
            <div className="space-y-5 pt-5">

              {/* Ngày bắt đầu */}
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2.5">Ngày bắt đầu</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[14px] py-2.5 px-4 text-white text-sm outline-none focus:border-white/20"
                />
              </div>

              {/* Thời lượng mỗi buổi */}
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2.5">Thời lượng mỗi buổi</p>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSessionDuration(d)}
                      className={`py-2.5 rounded-[12px] font-black text-xs transition-all active:scale-95 ${
                        sessionDuration === d
                          ? 'bg-white text-black'
                          : 'bg-white/[0.04] border border-white/[0.08] text-neutral-400'
                      }`}
                    >
                      {d}'
                    </button>
                  ))}
                </div>
              </div>

              {/* Chọn ngày tập */}
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2.5">Ngày tập hàng tuần</p>
                <div className="grid grid-cols-7 gap-1.5 mb-3">
                  {DAY_LABELS.map(({ day, short }) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`py-2.5 rounded-[12px] font-black text-[11px] transition-all active:scale-90 ${
                        isDaySelected(day)
                          ? 'bg-white text-black'
                          : 'bg-white/[0.04] border border-white/[0.08] text-neutral-500'
                      }`}
                    >
                      {short}
                    </button>
                  ))}
                </div>

                {/* Per-day time picker with end time */}
                {schedule.length > 0 && (
                  <div className="space-y-2">
                    {schedule.map(({ day, time }) => {
                      const dayInfo = DAY_LABELS.find(d => d.day === day);
                      const endTime = addMinutes(time, sessionDuration);
                      return (
                        <div
                          key={day}
                          className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-[14px] px-4 py-2.5"
                        >
                          <span className="text-white font-black text-[11px] w-12 shrink-0">{dayInfo?.short}</span>
                          <input
                            type="time"
                            value={time}
                            onChange={e => updateDayTime(day, e.target.value)}
                            className="bg-transparent text-white text-sm outline-none font-medium"
                          />
                          <span className="text-neutral-600 text-[10px]">→</span>
                          <span className="text-neutral-400 text-[11px] font-medium">{endTime}</span>
                          <span className="text-neutral-700 text-[9px] ml-auto">{sessionDuration}'</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preview sessions */}
              {previewSessions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
                      Preview · {previewSessions.length} buổi
                    </p>
                    {previewSessions.length === totalSessions && (
                      <span className="text-[9px] font-black text-emerald-400">✓ Đủ {totalSessions} buổi</span>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto hide-scrollbar">
                    {previewSessions.map(s => (
                      <div
                        key={s.number}
                        className="flex items-center gap-3 bg-white/[0.02] rounded-[10px] px-3 py-2"
                      >
                        <span className="text-[10px] font-black text-neutral-600 w-6 shrink-0">#{s.number}</span>
                        <span className="text-xs text-white flex-1">{formatDate(s.date)}</span>
                        <span className="text-[11px] text-neutral-500">{s.time}</span>
                        <span className="text-neutral-700 text-[10px]">→ {addMinutes(s.time, sessionDuration)}</span>
                      </div>
                    ))}
                  </div>
                  {previewSessions.length < totalSessions && (
                    <p className="text-[10px] text-yellow-500/80 mt-2">
                      ⚠️ Chỉ tạo được {previewSessions.length}/{totalSessions} buổi
                    </p>
                  )}
                </div>
              )}

              {schedule.length === 0 && (
                <div className="text-center py-6 text-neutral-700">
                  <Calendar className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Chọn ngày tập để xem preview</p>
                </div>
              )}

              {/* Footer buttons */}
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
                    : <><CheckCircle2 className="w-4 h-4" /> Tạo gói tập</>
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
