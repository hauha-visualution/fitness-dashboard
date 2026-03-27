import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, User, Target, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const AddClientView = ({ onBack, onSave }) => {
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'Nam', phone: '', height: '', weight: '', traininghistory: '', goal: '', commitmentlevel: 'Sẵn sàng tuân thủ meal plan',
    jobtype: '', trainingtime: '', targetduration: '', sleephabits: '', cookinghabit: '', cookingtime: '', dietaryrestriction: '', favoritefoods: '', avoidfoods: '', foodbudget: '', medicalconditions: '', supplements: ''
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSyncAPI = async () => {
    if (!formData.phone) { alert("Nhập SĐT trước khi Sync!"); return; }
    setIsSyncing(true);
    try {
      const { data } = await supabase.from('survey_responses').select('*').eq('phone', formData.phone).maybeSingle();
      if (data) {
        setFormData({ ...data }); 
        alert("Đã quét thành công dữ liệu khảo sát!");
      } else {
        alert("Không tìm thấy dữ liệu cho SĐT này!");
      }
    } catch (e) { alert("Lỗi kết nối database!"); }
    setIsSyncing(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.height || !formData.weight) {
      alert("Vui lòng điền đủ các thông tin có dấu (*)");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from('clients').insert([{ ...formData, sessions: '12' }]);
    setIsSaving(false);
    if (!error) {
      alert("Đã thêm học viên mới thành công!");
      onSave(); // Gọi hàm refresh danh sách ở App.jsx
      onBack(); // Quay về danh sách
    } else {
      alert("Lỗi khi lưu: " + error.message);
    }
  };

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] overflow-y-auto px-6 animate-slide-up hide-scrollbar">
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Onboarding Form</h2>
         <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 pb-12 pt-4 space-y-6">
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-4">
          <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">Thông tin bắt buộc (*)</h3></div>
          <input type="tel" placeholder="Số điện thoại *" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/80 border border-blue-500/30 rounded-[12px] p-3 text-white text-sm outline-none focus:border-blue-500" />
          <input type="text" placeholder="Họ và Tên *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Chiều cao (cm) *" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
            <input type="text" placeholder="Cân nặng (kg) *" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
          </div>
          <input type="text" placeholder="Mục tiêu tập luyện *" value={formData.goal} onChange={(e) => setFormData({...formData, goal: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
        </div>

        <button onClick={handleSave} disabled={isSaving} className={`w-full text-black font-black py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl transition-all ${isSaving ? 'bg-neutral-500' : 'bg-white hover:scale-[1.02] active:scale-95'}`}>
          {isSaving ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />} LƯU HỒ SƠ KHÁCH HÀNG
        </button>
      </div>
    </div>
  );
};

export default AddClientView;