import React, { useState, useEffect } from 'react';
import { Scale, Activity, Percent, Flame, Plus, X, RefreshCw, Save, Edit3, Trash2, Camera, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const EditableField = ({ label, value, onChange, type = 'text' }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black uppercase text-neutral-600 tracking-widest">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/40 border border-white/5 rounded-[12px] px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50 transition-all"
    />
  </div>
);

const InfoRow = ({ label, value, color }) => (
  <div className="flex justify-between items-start pb-3 last:pb-0">
    <span className="text-[9px] text-neutral-600 uppercase font-black tracking-widest">{label}</span>
    <span className={`text-xs text-right max-w-[50%] leading-tight ${color || 'text-white'}`}>{value || '--'}</span>
  </div>
);

const ProfileTab = ({ client, onDelete }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [inbodyRecords, setInbodyRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [progressPhotos, setProgressPhotos] = useState({ before: null, after: null });
  const [newInbodyRecord, setNewInbodyRecord] = useState({ weight: '', muscle_mass: '', body_fat: '', visceral_fat: '' });

  // Edit state
  const [editData, setEditData] = useState({
    name: client.name || '',
    phone: client.phone || '',
    dob: client.dob || '',
    gender: client.gender || '',
    height: client.height || '',
    weight: client.weight || '',
    goal: client.goal || '',
    jobtype: client.jobtype || '',
    sleephabits: client.sleephabits || '',
  });

  const fetchInBody = async () => {
    const { data } = await supabase
      .from('inbody_records')
      .select('*')
      .eq('client_id', client.id)
      .order('recorded_at', { ascending: false })
      .limit(1);
    if (data) setInbodyRecords(data);
  };

  const fetchProgressPhotos = async () => {
    const { data: beforeFiles } = await supabase.storage
      .from('client-progress')
      .list(`${client.id}/before`);
    const { data: afterFiles } = await supabase.storage
      .from('client-progress')
      .list(`${client.id}/after`);

    if (beforeFiles?.[0]) {
      const { data: url } = supabase.storage
        .from('client-progress')
        .getPublicUrl(`${client.id}/before/${beforeFiles[0].name}`);
      setProgressPhotos(p => ({ ...p, before: url.publicUrl }));
    }
    if (afterFiles?.[0]) {
      const { data: url } = supabase.storage
        .from('client-progress')
        .getPublicUrl(`${client.id}/after/${afterFiles[0].name}`);
      setProgressPhotos(p => ({ ...p, after: url.publicUrl }));
    }
  };

  useEffect(() => {
    fetchInBody();
    fetchProgressPhotos();
  }, [client.id]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      // Xóa avatar cũ nếu có
      try {
        await supabase.storage.from('client-avatars').remove([`${client.id}/avatar`]);
      } catch (err) {
        // Không quan trọng nếu không có avatar cũ
      }

      // Upload avatar mới
      const { error: uploadError } = await supabase.storage
        .from('client-avatars')
        .upload(`${client.id}/avatar`, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('client-avatars').getPublicUrl(`${client.id}/avatar`);

      // Cập nhật avatar_url trong clients table
      await supabase.from('clients').update({ avatar_url: data.publicUrl }).eq('id', client.id);

      alert('Đã cập nhật avatar!');
    } catch (err) {
      alert('Lỗi upload avatar: ' + err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('clients').update({
      ...editData,
      dob: editData.dob || null,
    }).eq('id', client.id);

    if (!error) {
      setIsEditMode(false);
      alert('Đã cập nhật thông tin!');
      window.location.reload();
    } else {
      alert('Lỗi: ' + error.message);
    }
    setIsSaving(false);
  };

  const handleProgressPhotoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Xóa ảnh cũ
      try {
        await supabase.storage.from('client-progress').remove([`${client.id}/${type}/photo`]);
      } catch (err) {
        // OK
      }

      // Upload ảnh mới
      const { error } = await supabase.storage
        .from('client-progress')
        .upload(`${client.id}/${type}/photo-${Date.now()}`, file);

      if (error) throw error;

      await fetchProgressPhotos();
    } catch (err) {
      alert('Lỗi upload: ' + err.message);
    }
  };

  const handleSaveInBody = async () => {
    if (!newInbodyRecord.weight) return alert('Cần có cân nặng!');

    setIsSaving(true);
    const { error } = await supabase.from('inbody_records').insert([{
      client_id: client.id,
      weight: parseFloat(newInbodyRecord.weight),
      muscle_mass: parseFloat(newInbodyRecord.muscle_mass) || 0,
      body_fat: parseFloat(newInbodyRecord.body_fat) || 0,
      visceral_fat: parseFloat(newInbodyRecord.visceral_fat) || 0,
      recorded_at: new Date().toISOString(),
    }]);

    if (!error) {
      await fetchInBody();
      setIsModalOpen(false);
      setNewInbodyRecord({ weight: '', muscle_mass: '', body_fat: '', visceral_fat: '' });
    } else {
      alert('Lỗi: ' + error.message);
    }
    setIsSaving(false);
  };

  const latest = inbodyRecords[0] || {};

  return (
    <div className="space-y-4 animate-slide-up relative">

      {/* 1. CURRENT INBODY METRICS - TOP */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-[24px] p-5">
        <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest mb-4">Chỉ số hiện tại</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-white text-lg font-bold">{latest.weight || '--'}</p>
            <p className="text-[8px] text-neutral-500">kg</p>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-bold">{latest.muscle_mass || '--'}</p>
            <p className="text-[8px] text-neutral-500">Cơ (kg)</p>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-bold">{latest.body_fat || '--'}</p>
            <p className="text-[8px] text-neutral-500">Mỡ %</p>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-bold">{latest.visceral_fat || '--'}</p>
            <p className="text-[8px] text-neutral-500">Mỡ nội tạng</p>
          </div>
        </div>
      </div>

      {/* 2. AVATAR & BASIC INFO */}
      {isEditMode ? (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5 space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase text-neutral-600 tracking-widest">Avatar</label>
            <label className="block mt-2 relative">
              <div className="w-24 h-24 rounded-full border-2 border-white/10 overflow-hidden cursor-pointer hover:border-white/30 transition-all bg-neutral-900 flex items-center justify-center">
                {isUploadingAvatar ? (
                  <RefreshCw className="w-6 h-6 text-white/30 animate-spin" />
                ) : (
                  <img src={client.avatar} alt="avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
            </label>
          </div>
          <EditableField label="Tên" value={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} />
          <EditableField label="Điện thoại" value={editData.phone} onChange={(v) => setEditData({ ...editData, phone: v })} />
          <EditableField label="Ngày sinh" value={editData.dob} onChange={(v) => setEditData({ ...editData, dob: v })} type="date" />
          <EditableField label="Giới tính" value={editData.gender} onChange={(v) => setEditData({ ...editData, gender: v })} />
          <EditableField label="Chiều cao (cm)" value={editData.height} onChange={(v) => setEditData({ ...editData, height: v })} type="number" />
          <EditableField label="Cân nặng (kg)" value={editData.weight} onChange={(v) => setEditData({ ...editData, weight: v })} type="number" />
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5 space-y-3">
          <div className="flex items-center gap-4 pb-3 border-b border-white/[0.03]">
            <img src={client.avatar} alt="avatar" className="w-12 h-12 rounded-full border border-white/10" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{client.name}</p>
              <p className="text-[8px] text-neutral-500">{client.phone}</p>
            </div>
          </div>
          <InfoRow label="Ngày sinh" value={client.dob} />
          <InfoRow label="Giới tính" value={client.gender} />
          <InfoRow label="Chiều cao" value={client.height ? `${client.height} cm` : '--'} />
          <InfoRow label="Cân nặng" value={client.weight ? `${client.weight} kg` : '--'} />
        </div>
      )}

      {/* 3. MỤC TIÊU */}
      {isEditMode ? (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5 space-y-4">
          <p className="text-[9px] font-black uppercase text-neutral-600 tracking-widest mb-2">Mục tiêu</p>
          <EditableField label="Mục tiêu" value={editData.goal} onChange={(v) => setEditData({ ...editData, goal: v })} />
          <EditableField label="Thời gian đạt" value={editData.targetduration} onChange={(v) => setEditData({ ...editData, targetduration: v })} />
          <EditableField label="Lịch sử tập" value={editData.traininghistory} onChange={(v) => setEditData({ ...editData, traininghistory: v })} />
          <EditableField label="Thời lượng tập/ngày" value={editData.trainingtime} onChange={(v) => setEditData({ ...editData, trainingtime: v })} />
        </div>
      ) : (
        client.goal && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5 space-y-2">
            <InfoRow label="Mục tiêu" value={client.goal} color="text-blue-400" />
            <InfoRow label="Thời gian" value={client.targetduration} />
            <InfoRow label="Lịch sử tập" value={client.traininghistory} />
            <InfoRow label="Thời lượng/ngày" value={client.trainingtime} />
          </div>
        )
      )}

      {/* 4. LIFESTYLE */}
      {isEditMode ? (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5 space-y-4">
          <p className="text-[9px] font-black uppercase text-neutral-600 tracking-widest mb-2">Lifestyle</p>
          <EditableField label="Công việc" value={editData.jobtype} onChange={(v) => setEditData({ ...editData, jobtype: v })} />
          <EditableField label="Giấc ngủ" value={editData.sleephabits} onChange={(v) => setEditData({ ...editData, sleephabits: v })} />
        </div>
      ) : (
        (client.jobtype || client.sleephabits) && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] p-5 space-y-2">
            {client.jobtype && <InfoRow label="Công việc" value={client.jobtype} />}
            {client.sleephabits && <InfoRow label="Giấc ngủ" value={client.sleephabits} />}
          </div>
        )
      )}

      {/* 5. PROGRESS PHOTOS */}
      <div className="space-y-4">
        <p className="text-[9px] font-black uppercase text-neutral-600 tracking-widest">Ảnh tiến độ</p>
        <div className="grid grid-cols-2 gap-4">
          {/* BEFORE */}
          <label className="group cursor-pointer">
            <div className="aspect-square rounded-[16px] bg-white/[0.03] border border-white/[0.08] flex items-center justify-center overflow-hidden hover:border-white/20 transition-all relative">
              {progressPhotos.before ? (
                <img src={progressPhotos.before} alt="before" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Camera className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="text-[8px] text-neutral-600 font-black">BEFORE</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => handleProgressPhotoUpload(e, 'before')} className="hidden" />
          </label>

          {/* AFTER */}
          <label className="group cursor-pointer">
            <div className="aspect-square rounded-[16px] bg-white/[0.03] border border-white/[0.08] flex items-center justify-center overflow-hidden hover:border-white/20 transition-all relative">
              {progressPhotos.after ? (
                <img src={progressPhotos.after} alt="after" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Camera className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
                  <p className="text-[8px] text-neutral-600 font-black">AFTER</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => handleProgressPhotoUpload(e, 'after')} className="hidden" />
          </label>
        </div>
      </div>

      {/* 6. ADD INBODY RECORD */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[16px] py-3 text-center text-[10px] font-black uppercase tracking-wider text-blue-400 hover:bg-white/[0.05] transition-all active:scale-95"
      >
        + Nhập chỉ số InBody mới
      </button>

      {/* 7. EDIT / DELETE BUTTONS */}
      <div className="flex gap-2 pt-2 border-t border-white/[0.05]">
        {isEditMode ? (
          <>
            <button
              onClick={() => setIsEditMode(false)}
              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-[16px] text-white font-black text-[10px] uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="flex-1 py-3 bg-blue-500/20 border border-blue-500/30 rounded-[16px] text-blue-400 font-black text-[10px] uppercase tracking-wider hover:bg-blue-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Lưu
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditMode(true)}
            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-[16px] text-white font-black text-[10px] uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Edit3 className="w-3 h-3" />
            Chỉnh sửa
          </button>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="py-3 px-4 bg-red-500/10 border border-red-500/20 rounded-[16px] text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* INBODY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[360px] bg-[#1a1a1c] border border-white/10 rounded-[32px] p-6 shadow-2xl animate-slide-up">
            <h3 className="text-white font-bold mb-6">Nhập InBody</h3>
            <div className="space-y-3 mb-6">
              {[
                { label: 'Cân (kg)', key: 'weight' },
                { label: 'Cơ (kg)', key: 'muscle_mass' },
                { label: 'Mỡ (%)', key: 'body_fat' },
                { label: 'Mỡ nội tạng', key: 'visceral_fat' },
              ].map(f => (
                <input
                  key={f.key}
                  type="number"
                  placeholder={f.label}
                  value={newInbodyRecord[f.key]}
                  onChange={(e) => setNewInbodyRecord({ ...newInbodyRecord, [f.key]: e.target.value })}
                  className="w-full bg-black/40 border border-white/5 rounded-[12px] px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-white/5 rounded-[12px] text-white text-[10px] font-black uppercase"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveInBody}
                disabled={isSaving}
                className="flex-1 py-3 bg-blue-500/20 rounded-[12px] text-blue-400 text-[10px] font-black uppercase disabled:opacity-50"
              >
                {isSaving ? '...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[320px] bg-[#1a1a1c] border border-red-500/20 rounded-[24px] p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-white font-bold">Xóa học viên?</p>
            </div>
            <p className="text-neutral-400 text-sm mb-6">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-white/5 rounded-[12px] text-white text-[10px] font-black uppercase"
              >
                Hủy
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete(client.id); }}
                className="flex-1 py-2 bg-red-500/20 rounded-[12px] text-red-400 text-[10px] font-black uppercase"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
