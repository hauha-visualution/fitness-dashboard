import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Lock, Calendar, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CoachProfileView = ({ session, onBack, onUpdateSession }) => {
  const [coachData, setCoachData] = useState({
    full_name: '', avatar_url: '', dob: '', password: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // State riêng cho upload ảnh

  useEffect(() => {
    if (session?.email) fetchCoach();
  }, [session]);

  const fetchCoach = async () => {
    const { data } = await supabase.from('coaches').select('*').eq('email', session.email).maybeSingle();
    if (data) setCoachData(data);
  };

  // --- BƯỚC 2: HÀM XỬ LÝ UPLOAD ẢNH ---
  const handleUploadAvatar = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setIsUploading(true);

      // Tạo tên file duy nhất (dùng timestamp để không bị trùng)
      const fileExt = file.name.split('.').pop();
      const fileName = `coach-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload lên bucket 'avatars' (Hạo nhớ tạo bucket này trong Supabase Storage nhé)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Lấy Public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Cập nhật state để hiển thị ngay lập tức
      setCoachData({ ...coachData, avatar_url: data.publicUrl });
      alert("Đã tải ảnh lên thành công!");

    } catch (error) {
      alert('Lỗi upload: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('coaches').update(coachData).eq('email', session.email);
    setIsSaving(false);
    
    if (!error) {
      alert("Đã cập nhật trang cá nhân Coach!");
      onUpdateSession({ ...session, ...coachData });
      onBack();
    } else {
      alert("Lỗi: " + error.message);
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col animate-slide-up overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="p-6 flex justify-between items-center border-b border-white/5">
        <button onClick={onBack} className="p-3 bg-white/5 rounded-full"><ArrowLeft className="w-5 h-5"/></button>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Coach Profile</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-8 flex flex-col items-center">
        {/* Avatar Section */}
        <div className="relative mb-10 group">
          <div className="w-32 h-32 rounded-full border-2 border-white/10 p-1 shadow-2xl overflow-hidden bg-neutral-900 flex items-center justify-center">
            {isUploading ? (
              <RefreshCw className="w-8 h-8 text-white/20 animate-spin" />
            ) : (
              <img src={coachData.avatar_url || 'https://i.pravatar.cc/150'} className="w-full h-full rounded-full object-cover grayscale-[20%]" alt="coach" />
            )}
          </div>
          
          {/* --- BƯỚC 3: NÚT CHỌN FILE THAY CHO PROMPT --- */}
          <label className="absolute bottom-0 right-0 p-3 bg-white text-black rounded-full shadow-xl cursor-pointer active:scale-90 transition-all">
            <Camera className="w-4 h-4" />
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleUploadAvatar} 
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Form Fields */}
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Full Name</label>
            <input 
              type="text" 
              value={coachData.full_name} 
              onChange={e => setCoachData({...coachData, full_name: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-white/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Birth Date</label>
            <div className="relative">
              <Calendar className="absolute right-4 top-4 w-4 h-4 text-neutral-600" />
              <input 
                type="date" 
                value={coachData.dob || ''} 
                onChange={e => setCoachData({...coachData, dob: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">New Password</label>
            <div className="relative">
              <Lock className="absolute right-4 top-4 w-4 h-4 text-neutral-600" />
              <input 
                type="password" 
                placeholder="••••••••"
                onChange={e => setCoachData({...coachData, password: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500/20"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="w-full bg-white text-black font-black py-5 rounded-[24px] mt-12 flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
        >
          {(isSaving || isUploading) ? <RefreshCw className="animate-spin" /> : <Save className="w-5 h-5" />}
          LƯU THÔNG TIN
        </button>
      </div>
    </div>
  );
};

export default CoachProfileView;