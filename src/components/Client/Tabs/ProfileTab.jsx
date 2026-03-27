import React, { useState, useEffect } from 'react';
import { Scale, Activity, Percent, Flame, Plus, X, RefreshCw, Save } from 'lucide-react'; // Đã đổi Percentage thành Percent
import { supabase } from '../../../supabaseClient';

const ProfileTab = ({ client }) => {
  const [inbodyRecords, setInbodyRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State cho form nhập mới
  const [newRecord, setNewRecord] = useState({
    weight: '',
    muscle_mass: '',
    body_fat: '',
    visceral_fat: ''
  });

  const fetchInBody = async () => {
    const { data } = await supabase
      .from('inbody_records')
      .select('*')
      .eq('client_id', client.id)
      .order('recorded_at', { ascending: true });
    if (data) setInbodyRecords(data);
  };

  useEffect(() => {
    fetchInBody();
  }, [client.id]);

  const handleSaveRecord = async () => {
    if (!newRecord.weight) return alert("Hạo ơi, ít nhất phải có Cân nặng chứ!");
    setIsSaving(true);
    
    const { error } = await supabase.from('inbody_records').insert([{
      client_id: client.id,
      weight: parseFloat(newRecord.weight),
      muscle_mass: parseFloat(newRecord.muscle_mass),
      body_fat: parseFloat(newRecord.body_fat),
      visceral_fat: parseFloat(newRecord.visceral_fat),
      recorded_at: new Date().toISOString()
    }]);

    if (!error) {
      await fetchInBody();
      setIsModalOpen(false);
      setNewRecord({ weight: '', muscle_mass: '', body_fat: '', visceral_fat: '' });
    } else {
      alert("Lỗi rồi Hạo: " + error.message);
    }
    setIsSaving(false);
  };

  const first = inbodyRecords[0] || {};
  const latest = inbodyRecords[inbodyRecords.length - 1] || {};

  const getProgress = (val) => val ? `${Math.min((val / 100) * 100, 100)}%` : '0%';

  return (
    <div className="space-y-8 animate-slide-up relative">
      
      {/* 1. Basic Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-6 text-center shadow-inner">
          <p className="text-white text-xl font-medium tracking-tight">{client.height || '--'} cm</p>
          <p className="text-[9px] font-black uppercase text-neutral-600 tracking-widest mt-1">Height</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[28px] p-6 text-center shadow-inner">
          <p className="text-white text-xl font-medium tracking-tight">{client.gender || '--'}</p>
          <p className="text-[9px] font-black uppercase text-neutral-600 tracking-widest mt-1">Gender</p>
        </div>
      </div>

      {/* 2. Medical Notes */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-[32px] p-6">
        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em] mb-4">Medical / Notes</p>
        <p className="text-sm text-neutral-300 leading-relaxed font-light italic opacity-80">
          {client.medicalconditions || "Không có ghi chú y tế"}
        </p>
      </div>

      {/* 3. Add New Record Button - Đã kích hoạt Click */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[32px] p-5 flex items-center gap-4 active:scale-95 transition-all group"
      >
        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:rotate-90 transition-transform duration-500">
          <Plus className="text-white w-6 h-6" />
        </div>
        <div className="text-left">
          <p className="text-white font-bold text-sm">Nhập chỉ số mới</p>
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mt-0.5">Inbody 270 Template</p>
        </div>
      </button>

      {/* 4. InBody Comparison */}
      <div className="space-y-6">
        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] text-center">So sánh Initial vs Latest</p>
        
        <div className="space-y-6">
          {[
            { label: 'Cân nặng', key: 'weight', unit: 'kg', icon: Scale },
            { label: 'Cơ xương (SMM)', key: 'muscle_mass', unit: 'kg', icon: Activity },
            { label: 'Tỷ lệ mỡ (PBF)', key: 'body_fat', unit: '%', icon: Percent }, // Đã sửa Percentage -> Percent
            { label: 'Mỡ nội tạng', key: 'visceral_fat', unit: 'Level', icon: Flame },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                <item.icon className="w-4 h-4 text-neutral-500" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-2.5">
                  <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{item.label}</p>
                  <p className="text-xs font-bold text-blue-400">
                    {latest[item.key] || '--'} <span className="text-[8px] text-neutral-600 uppercase ml-0.5">{item.unit}</span>
                  </p>
                </div>
                <div className="h-[6px] bg-white/[0.05] rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500/20 rounded-full transition-all duration-1000" style={{ width: getProgress(first[item.key]) }}></div>
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: getProgress(latest[item.key]) }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Lifestyle & Habits */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-6 space-y-6">
        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.2em]">Lifestyle & Habits</p>
        <div className="space-y-5">
            {[
                { label: 'Công việc', val: client.jobtype },
                { label: 'Giấc ngủ', val: client.sleephabits },
                { label: 'Món cần tránh', val: client.avoidfoods, color: 'text-red-400 font-medium' },
            ].map((hab, idx) => (
                <div key={idx} className="flex justify-between items-start border-b border-white/[0.03] pb-4 last:border-0 last:pb-0">
                    <span className="text-[10px] text-neutral-600 uppercase font-black tracking-widest">{hab.label}</span>
                    <span className={`text-xs text-right max-w-[60%] leading-relaxed ${hab.color || 'text-white'}`}>{hab.val || '--'}</span>
                </div>
            ))}
        </div>
      </div>

      {/* --- MODAL NHẬP CHỈ SỐ (AESTHETIC STYLE) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-[380px] bg-[#1a1a1c] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-white font-medium text-lg tracking-tight">Nhập chỉ số InBody</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/5 rounded-full text-neutral-500"><X className="w-5 h-5"/></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: 'Cân nặng (kg)', key: 'weight', icon: Scale },
                { label: 'Cơ (kg)', key: 'muscle_mass', icon: Activity },
                { label: 'Mỡ (%)', key: 'body_fat', icon: Percent },
                { label: 'Mỡ nội tạng', key: 'visceral_fat', icon: Flame },
              ].map(field => (
                <div key={field.key} className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-neutral-600 ml-2 tracking-widest">{field.label}</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={newRecord[field.key]}
                      onChange={(e) => setNewRecord({...newRecord, [field.key]: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-blue-500/50 transition-all"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleSaveRecord}
              disabled={isSaving}
              className="w-full bg-blue-500 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              LƯU KẾT QUẢ
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileTab;