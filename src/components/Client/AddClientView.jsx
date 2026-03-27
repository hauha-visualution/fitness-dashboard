import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, User, Target, Utensils, HeartPulse, ChevronDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const AddClientView = ({ onBack, onSave }) => {
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'Nam', phone: '', height: '', weight: '', 
    traininghistory: '', goal: '', commitmentlevel: 'Sẵn sàng tuân thủ meal plan',
    jobtype: '', trainingtime: '', targetduration: '', sleephabits: '', 
    cookinghabit: '', cookingtime: '', dietaryrestriction: '', 
    favoritefoods: '', avoidfoods: '', foodbudget: '', 
    medicalconditions: '', supplements: ''
  });

  const [expandedSection, setExpandedSection] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSection = (sectionName) => setExpandedSection(expandedSection === sectionName ? null : sectionName);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSyncAPI = async () => {
    if (!formData.phone) { alert("Nhập SĐT trước khi Sync!"); return; }
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('survey_responses').select('*').eq('phone', formData.phone).maybeSingle();
      if (data) {
        setFormData({ ...formData, ...data });
        alert("Đã quét thành công dữ liệu khảo sát!");
      } else { alert("Không tìm thấy dữ liệu cho SĐT này!"); }
    } catch (e) { alert("Lỗi kết nối database!"); }
    setIsSyncing(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.height || !formData.weight) {
      alert("Vui lòng điền đủ các thông tin có dấu (*)");
      return;
    }
    setIsSaving(true);
    // Gửi data với toàn bộ key là chữ thường để khớp database
    const { error } = await supabase.from('clients').insert([{ ...formData, sessions: '12' }]);
    setIsSaving(false);
    
    if (!error) {
      alert("Đã thêm học viên thành công!");
      onSave(); 
      onBack();
    } else {
      alert("Lỗi khi lưu: " + error.message);
    }
  };

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] overflow-y-auto px-6 animate-slide-up hide-scrollbar">
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white shadow-md"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Onboarding Form</h2>
         <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 shadow-md ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-5 h-5" />
         </button>
      </div>

      <div className="flex-1 pb-12 pt-4 space-y-4">
        <div className="mb-2">
          <h1 className="text-3xl font-medium text-white tracking-tight mb-1">New Client</h1>
          <p className="text-neutral-500 text-xs">Nhập <b>SĐT</b> và Sync để lấy data Google Form.</p>
        </div>

        {/* SECTION 1: BẮT BUỘC */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-4">
          <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">1. Thông tin bắt buộc (*)</h3></div>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Số điện thoại *" className="w-full bg-black/80 border border-blue-500/30 rounded-[12px] p-3 text-white text-sm outline-none focus:border-blue-500" />
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và Tên *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Cao (cm) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
            <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="Nặng (kg) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
          </div>
          <input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="Mục tiêu tập luyện *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
          <textarea name="traininghistory" value={formData.traininghistory} onChange={handleChange} rows="2" placeholder="Lịch sử tập luyện *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm resize-none outline-none"></textarea>
        </div>

        {/* SECTION 2: SINH HOẠT */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('lifestyle')} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03]">
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><h3 className="text-white text-sm font-medium">2. Sinh hoạt & Chế độ</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'lifestyle' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'lifestyle' && (
            <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4 animate-in fade-in slide-in-from-top-2">
              <input type="text" name="jobtype" value={formData.jobtype} onChange={handleChange} placeholder="Tính chất công việc" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
              <input type="text" name="sleephabits" value={formData.sleephabits} onChange={handleChange} placeholder="Giấc ngủ hàng đêm" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
            </div>
          )}
        </div>

        {/* SECTION 3: DINH DƯỠNG */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('nutrition')} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03]">
            <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /><h3 className="text-white text-sm font-medium">3. Dinh dưỡng & Bếp núc</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'nutrition' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'nutrition' && (
            <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4 animate-in fade-in slide-in-from-top-2">
              <input type="text" name="favoritefoods" value={formData.favoritefoods} onChange={handleChange} placeholder="Thực phẩm yêu thích" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
              <input type="text" name="avoidfoods" value={formData.avoidfoods} onChange={handleChange} placeholder="Dị ứng / Cần tránh" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
            </div>
          )}
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving} 
          className={`w-full text-black font-black py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl transition-all mt-4 ${isSaving ? 'bg-neutral-500' : 'bg-white hover:scale-[1.02] active:scale-95'}`}
        >
          {isSaving ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />} 
          {isSaving ? 'ĐANG LƯU...' : 'LƯU HỒ SƠ KHÁCH HÀNG'}
        </button>
      </div>
    </div>
  );
};

export default AddClientView;