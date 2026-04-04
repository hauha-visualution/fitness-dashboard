import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Lock, Calendar, Save, RefreshCw, Building2, Copy, QrCode } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CoachProfileView = ({ session, coachProfile, onBack, onProfileUpdated }) => {
  const [coachData, setCoachData] = useState({
    full_name: '',
    avatar_url: '',
    dob: '',
    password: '',
    bank_qr_url: '',
    bank_name: '',
    bank_branch: '',
    bank_account_name: '',
    bank_account_number: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Dùng đúng chỗ: session.user.email (Supabase session object)
  const coachEmail = session?.user?.email;

  // Khi coachProfile được truyền vào → sync vào local state để hiển thị
  useEffect(() => {
    if (coachProfile) {
      setCoachData({
        full_name: coachProfile.full_name || '',
        avatar_url: coachProfile.avatar_url || '',
        dob: coachProfile.dob || '',
        password: '',
        bank_qr_url: coachProfile.bank_qr_url || '',
        bank_name: coachProfile.bank_name || '',
        bank_branch: coachProfile.bank_branch || '',
        bank_account_name: coachProfile.bank_account_name || '',
        bank_account_number: coachProfile.bank_account_number || '',
      });
    }
  }, [coachProfile]);

  const handleUploadAvatar = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `coach-${Date.now()}.${fileExt}`;

      // Upload lên bucket 'avatars' trong Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Lấy Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Preview ngay lập tức
      setCoachData(prev => ({ ...prev, avatar_url: data.publicUrl }));

    } catch (error) {
      alert('Lỗi upload ảnh: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!coachEmail) {
      alert('Không xác định được email coach. Thử đăng nhập lại nhé!');
      return;
    }

    setIsSaving(true);

    const updatePayload = {
      full_name: coachData.full_name || null,
      avatar_url: coachData.avatar_url || null,
      dob: coachData.dob || null,  // Chuyển empty string thành null
      bank_qr_url: coachData.bank_qr_url || null,
      bank_name: coachData.bank_name || null,
      bank_branch: coachData.bank_branch || null,
      bank_account_name: coachData.bank_account_name || null,
      bank_account_number: coachData.bank_account_number || null,
      email: coachEmail,
    };

    // upsert: tự tạo mới nếu chưa có record, update nếu đã có
    const { error } = await supabase
      .from('coaches')
      .upsert(updatePayload, { onConflict: 'email' });

    setIsSaving(false);

    if (!error) {
      // Báo App.jsx re-fetch coachProfile mới nhất từ DB
      onProfileUpdated();
      onBack();
    } else {
      alert('Lỗi lưu profile: ' + error.message);
    }
  };

  const handleUploadBankQr = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `coach-bank-qr-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setCoachData((prev) => ({ ...prev, bank_qr_url: data.publicUrl }));
    } catch (error) {
      alert('Lỗi upload QR ngân hàng: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const copyAccountNumber = async () => {
    if (!coachData.bank_account_number?.trim()) return;
    try {
      await navigator.clipboard.writeText(coachData.bank_account_number.trim());
      alert('Đã copy số tài khoản');
    } catch {
      alert('Không thể copy số tài khoản');
    }
  };

  return (
    <div className="h-screen bg-black flex flex-col animate-slide-up overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="p-6 flex justify-between items-center border-b border-white/5">
        <button onClick={onBack} className="p-3 bg-white/5 rounded-full">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
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
              <img
                src={coachData.avatar_url || 'https://i.pravatar.cc/150?u=coach'}
                className="w-full h-full rounded-full object-cover grayscale-[20%]"
                alt="coach avatar"
              />
            )}
          </div>

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

        {/* Hiển thị username (read-only) */}
        <div className="w-full mb-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center">
          <p className="text-[9px] font-black uppercase text-neutral-600 tracking-widest mb-1">Account</p>
          <p className="text-white/40 text-sm">
            {session?.user?.user_metadata?.username || coachEmail}
          </p>
        </div>

        {/* Form Fields */}
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Full Name</label>
            <input
              type="text"
              value={coachData.full_name}
              onChange={e => setCoachData({ ...coachData, full_name: e.target.value })}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-white/20"
              placeholder="Tên hiển thị"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 tracking-widest">Birth Date</label>
            <div className="relative">
              <Calendar className="absolute right-4 top-4 w-4 h-4 text-neutral-600" />
              <input
                type="date"
                value={coachData.dob || ''}
                onChange={e => setCoachData({ ...coachData, dob: e.target.value })}
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
                onChange={e => setCoachData({ ...coachData, password: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500/20"
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neutral-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Bank Details</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-1 tracking-widest">QR Code</label>
                <div className="flex items-center gap-3">
                  <div className="aspect-square w-20 rounded-[18px] border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center shrink-0">
                    {coachData.bank_qr_url ? (
                      <img src={coachData.bank_qr_url} alt="Bank QR" className="w-full h-full object-cover" />
                    ) : (
                      <QrCode className="w-7 h-7 text-white/20" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="app-ghost-button rounded-[16px] px-4 py-3 border cursor-pointer inline-flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm font-semibold">Upload QR</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUploadBankQr}
                        disabled={isUploading}
                      />
                    </label>
                    <p className="max-w-[180px] text-[11px] leading-relaxed text-neutral-500">
                      Please crop the image to a 1:1 square before upload so the full QR code stays visible.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-1 tracking-widest">Bank</label>
                <input
                  type="text"
                  value={coachData.bank_name}
                  onChange={e => setCoachData({ ...coachData, bank_name: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-white/20"
                  placeholder="Vietcombank"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-1 tracking-widest">Branch</label>
                <input
                  type="text"
                  value={coachData.bank_branch}
                  onChange={e => setCoachData({ ...coachData, bank_branch: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-white/20"
                  placeholder="Ho Chi Minh City"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-1 tracking-widest">Account</label>
                <input
                  type="text"
                  value={coachData.bank_account_name}
                  onChange={e => setCoachData({ ...coachData, bank_account_name: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-white/20"
                  placeholder="NGUYEN VAN A"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-1 tracking-widest">Number</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={coachData.bank_account_number}
                    onChange={e => setCoachData({ ...coachData, bank_account_number: e.target.value })}
                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-white/20"
                    placeholder="0123456789"
                  />
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className="app-ghost-button h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0"
                    title="Copy account number"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="w-full bg-white text-black font-black py-5 rounded-[24px] mt-12 flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
        >
          {(isSaving || isUploading)
            ? <RefreshCw className="w-5 h-5 animate-spin" />
            : <><Save className="w-5 h-5" /> SAVE</>
          }
        </button>
      </div>
    </div>
  );
};

export default CoachProfileView;
