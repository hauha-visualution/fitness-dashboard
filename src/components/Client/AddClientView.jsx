import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, User, Target, Utensils, HeartPulse, ChevronDown, CheckCircle2, Clock, Mail, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const AddClientView = ({ onBack, onSave }) => {
  // 1. Khai báo state chuẩn khớp 100% với Schema Supabase bảng 'clients'
  const initialFormState = {
    name: '', phone: '', email: '', gender: 'Nam', dob: '', 
    height: '', weight: '', goal: '',
    traininghistory: '', jobtype: '', trainingtime: '', targetduration: '', 
    cookinghabit: '', dietaryrestriction: '', favoritefoods: '', avoidfoods: '', 
    cookingtime: '', foodbudget: '', medicalconditions: '', 
    supplements: '', sleephabits: '', commitmentlevel: 'Sẵn sàng tuân thủ 100%'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [expandedSection, setExpandedSection] = useState('basic');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSection = (id) => setExpandedSection(expandedSection === id ? null : id);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // 2. HÀM SYNC THÔNG MINH: Đã thêm Log để Hạo dễ debug
  const handleSyncAPI = async () => {
    if (!formData.phone) return alert("Nhập SĐT để Sync!");
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('survey_responses').select('*').eq('phone', formData.phone).maybeSingle();
      
      if (data) {
        // QUAN TRỌNG: Hạo nhấn F12 trong trình duyệt để xem dòng này nhé
        console.log("Dữ liệu gốc từ survey_responses:", data);

        // CHUẨN HÓA: Ép tất cả các Key về chữ thường
        const rawData = {};
        Object.keys(data).forEach(key => {
          rawData[key.toLowerCase()] = data[key];
        });

        // MAPPING "VÉT CẠN": Dự phòng các trường hợp tên cột ở bảng survey bị sai lệch
        const mappedData = {
          ...rawData,
          avoidfoods: rawData.avoidfoods || rawData.avoidfood,
          commitmentlevel: rawData.commitmentlevel || rawData.commitmentlevels,
          traininghistory: rawData.traininghistory || rawData.training_history,
          targetduration: rawData.targetduration || rawData.target_duration,
          medicalconditions: rawData.medicalconditions || rawData.medical_conditions
        };

        setFormData(prev => ({ ...prev, ...mappedData }));
        alert("Đồng bộ thành công! Hãy kiểm tra các mục Lifestyle & Dinh dưỡng phía dưới.");
      } else {
        alert("Không tìm thấy dữ liệu! Có thể Apps Script chưa đẩy được dữ liệu lên.");
      }
    } catch (e) {
      console.error("Lỗi Sync:", e);
      alert("Lỗi kết nối Sync!");
    }
    setIsSyncing(false);
  };

  // 3. HÀM SAVE: Chỉ gửi đi các trường hợp lệ
  const handleSave = async () => {
    if (!formData.name || !formData.phone) return alert("Họ tên và SĐT là bắt buộc!");
    setIsSaving(true);
    
    const allowedKeys = Object.keys(initialFormState);
    const cleanPayload = {};
    
    allowedKeys.forEach(key => {
      if (formData[key] !== undefined && formData[key] !== null) {
        cleanPayload[key] = formData[key];
      }
    });

    const { error } = await supabase.from('clients').insert([cleanPayload]);
    
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
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white active:scale-90 transition-all"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Onboarding Form</h2>
         <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-5 h-5" />
         </button>
      </div>

      <div className="flex-1 pb-32 pt-4 space-y-4">
        {/* Nhóm 1: Cơ bản */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('basic')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">1. Cá nhân (*)</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'basic' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'basic' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và Tên *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Số điện thoại *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-xs outline-none" />
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-sm outline-none"><option>Nam</option><option>Nữ</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Cao (cm)" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
                <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="Nặng (kg)" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Nhóm 2: Mục tiêu */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('goals')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><h3 className="text-white text-sm font-medium">2. Mục tiêu & Lifestyle</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'goals' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'goals' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="Mục tiêu chính" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="targetduration" value={formData.targetduration} onChange={handleChange} placeholder="Thời gian mong muốn" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="jobtype" value={formData.jobtype} onChange={handleChange} placeholder="Tính chất công việc" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="sleephabits" value={formData.sleephabits} onChange={handleChange} placeholder="Thói quen giấc ngủ" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
            </div>
          )}
        </div>

        {/* Nhóm 3: Dinh dưỡng */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('nutrition')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /><h3 className="text-white text-sm font-medium">3. Dinh dưỡng</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'nutrition' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'nutrition' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="cookinghabit" value={formData.cookinghabit} onChange={handleChange} placeholder="Thói quen nấu ăn" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="dietaryrestriction" value={formData.dietaryrestriction} onChange={handleChange} placeholder="Dị ứng / Kiêng đặc biệt" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <textarea name="favoritefoods" value={formData.favoritefoods} onChange={handleChange} rows="2" placeholder="Món yêu thích" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm resize-none"></textarea>
              <input type="text" name="avoidfoods" value={formData.avoidfoods} onChange={handleChange} placeholder="Thực phẩm cần tránh" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="cookingtime" value={formData.cookingtime} onChange={handleChange} placeholder="Giờ nấu/ngày" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
                <input type="text" name="foodbudget" value={formData.foodbudget} onChange={handleChange} placeholder="Ngân sách ăn" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Nhóm 4: Y tế */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('health')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-400" /><h3 className="text-white text-sm font-medium">4. Y tế & Cam kết</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'health' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'health' && (
            <div className="px-5 pb-5 space-y-3">
              <textarea name="medicalconditions" value={formData.medicalconditions} onChange={handleChange} rows="2" placeholder="Bệnh lý (Xương khớp, tim mạch...)" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm resize-none"></textarea>
              <input type="text" name="supplements" value={formData.supplements} onChange={handleChange} placeholder="Thuốc / TPBS đang dùng" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <select name="commitmentlevel" value={formData.commitmentlevel} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-sm outline-none">
                <option>Sẵn sàng tuân thủ 100%</option>
                <option>Sẵn sàng phần lớn</option>
                <option>Cần đốc thúc</option>
              </select>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={isSaving} className={`w-full text-black font-black py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl transition-all mt-4 ${isSaving ? 'bg-neutral-500' : 'bg-white hover:scale-[1.02] active:scale-95'}`}>
          {isSaving ? <RefreshCw className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} 
          {isSaving ? 'SAVING...' : 'ADD CLIENT'}
        </button>
      </div>
    </div>
  );
};

export default AddClientView;