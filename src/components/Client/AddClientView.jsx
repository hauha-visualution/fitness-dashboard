import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, User, Target, Utensils, HeartPulse, ChevronDown, CheckCircle2, Clock, Mail, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const AddClientView = ({ onBack, onSave }) => {
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', gender: 'Nam', dob: '', 
    height: '', weight: '', goal: '',
    traininghistory: '', jobtype: '', trainingtime: '', targetduration: '', 
    cookinghabit: '', dietaryrestriction: '', favoritefoods: '', avoidfoods: '', 
    cookingtime: '', foodbudget: '', medicalconditions: '', 
    supplements: '', sleephabits: '', commitmentlevel: 'Sẵn sàng'
  });

  const [expandedSection, setExpandedSection] = useState('basic');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSection = (id) => setExpandedSection(expandedSection === id ? null : id);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSyncAPI = async () => {
    if (!formData.phone) { alert("Nhập SĐT để Sync!"); return; }
    setIsSyncing(true);
    try {
      // Tìm trong bảng survey_responses để đổ data vào form
      const { data } = await supabase.from('survey_responses').select('*').eq('phone', formData.phone).maybeSingle();
      if (data) {
        setFormData({ ...formData, ...data });
        alert("Đồng bộ thành công dữ liệu từ Form!");
      } else { alert("Không tìm thấy dữ liệu cho SĐT này!"); }
    } catch (e) { alert("Lỗi kết nối!"); }
    setIsSyncing(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) return alert("Họ tên và SĐT là bắt buộc!");
    setIsSaving(true);
    
    // Lưu vào bảng clients (cột sessions sẽ để trống để xử lý ở phần Gói tập sau)
    const { error } = await supabase.from('clients').insert([formData]);
    setIsSaving(false);
    
    if (!error) { 
      alert("Đã lưu hồ sơ học viên thành công!");
      onSave(); 
      onBack(); 
    } else { 
      alert("Lỗi khi lưu: " + error.message); 
    }
  };

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] overflow-y-auto px-6 animate-slide-up hide-scrollbar">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Onboarding Form</h2>
         <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-5 h-5" />
         </button>
      </div>

      <div className="flex-1 pb-32 pt-4 space-y-4">
        {/* 1. THÔNG TIN CÁ NHÂN */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('basic')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">1. Thông tin cá nhân (*)</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'basic' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'basic' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và Tên *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Số điện thoại *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Địa chỉ Email" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-xs outline-none" />
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-sm outline-none"><option>Nam</option><option>Nữ</option><option>Khác</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Cao (cm) *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
                <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="Nặng (kg) *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* 2. MỤC TIÊU & TẬP LUYỆN */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('goals')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><h3 className="text-white text-sm font-medium">2. Mục tiêu & Tập luyện</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'goals' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'goals' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="Mục tiêu chính *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <textarea name="traininghistory" value={formData.traininghistory} onChange={handleChange} rows="2" placeholder="Lịch sử tập luyện bộ môn khác?" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm resize-none outline-none"></textarea>
              <input type="text" name="trainingtime" value={formData.trainingtime} onChange={handleChange} placeholder="Thời gian tập luyện/ngày" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="targetduration" value={formData.targetduration} onChange={handleChange} placeholder="Thời gian muốn đạt mục tiêu" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
            </div>
          )}
        </div>

        {/* 3. LIFESTYLE */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('lifestyle')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" /><h3 className="text-white text-sm font-medium">3. Công việc & Sinh hoạt</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'lifestyle' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'lifestyle' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="jobtype" value={formData.jobtype} onChange={handleChange} placeholder="Hành chính hay Freelance?" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <input type="text" name="sleephabits" value={formData.sleephabits} onChange={handleChange} placeholder="Giờ ngủ & số tiếng ngủ/đêm" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <select name="commitmentlevel" value={formData.commitmentlevel} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-sm outline-none">
                <option>Sẵn sàng tuân thủ 100%</option>
                <option>Sẵn sàng phần lớn</option>
                <option>Cần đốc thúc nhiều</option>
              </select>
            </div>
          )}
        </div>

        {/* 4. DINH DƯỠNG */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('nutrition')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /><h3 className="text-white text-sm font-medium">4. Dinh dưỡng & Ăn uống</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'nutrition' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'nutrition' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="cookinghabit" value={formData.cookinghabit} onChange={handleChange} placeholder="Tự nấu hay ăn ngoài?" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <input type="text" name="dietaryrestriction" value={formData.dietaryrestriction} onChange={handleChange} placeholder="Chế độ ăn kiêng đặc biệt" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <textarea name="favoritefoods" value={formData.favoritefoods} onChange={handleChange} rows="2" placeholder="Thực phẩm yêu thích?" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm resize-none"></textarea>
              <input type="text" name="avoidfoods" value={formData.avoidfoods} onChange={handleChange} placeholder="Dị ứng / thực phẩm ghét" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <input type="text" name="cookingtime" value={formData.cookingtime} onChange={handleChange} placeholder="Thời gian nấu ăn/ngày" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <input type="text" name="foodbudget" value={formData.foodbudget} onChange={handleChange} placeholder="Ngân sách ăn uống/tháng" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
            </div>
          )}
        </div>

        {/* 5. SỨC KHỎE */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('health')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-400" /><h3 className="text-white text-sm font-medium">5. Sức khỏe & Y tế</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'health' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'health' && (
            <div className="px-5 pb-5 space-y-3">
              <textarea name="medicalconditions" value={formData.medicalconditions} onChange={handleChange} rows="2" placeholder="Lưu ý bệnh lý (Tim, xương khớp...)" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm resize-none"></textarea>
              <input type="text" name="supplements" value={formData.supplements} onChange={handleChange} placeholder="Thuốc / Thực phẩm bổ sung đang dùng" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
            </div>
          )}
        </div>

        <div className="pt-6 pb-10">
          <button onClick={handleSave} disabled={isSaving} className={`w-full text-black font-black py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl transition-all ${isSaving ? 'bg-neutral-500' : 'bg-white hover:scale-[1.02] active:scale-95'}`}>
            {isSaving ? <RefreshCw className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} 
            LƯU HỒ SƠ KHÁCH HÀNG
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddClientView;