import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Plus, RefreshCw, Save, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import ClientAvatar from '../../shared/ClientAvatar';

const EditableField = ({ label, value, onChange, type = 'text' }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[16px] border border-white/[0.08] bg-black/40 px-4 py-3 text-sm font-normal text-white outline-none transition-all focus:border-blue-500/50"
    />
  </div>
);

const InfoCell = ({ label, value, valueClassName = 'text-xs font-semibold text-white', className = '' }) => (
  <div className={`p-4 ${className}`}>
    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{label}</p>
    <p className={`mt-2 leading-tight ${valueClassName}`}>{value || '--'}</p>
  </div>
);

const ProfileTab = ({ client, onRegisterActions }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingInbody, setIsSavingInbody] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [inbodyRecords, setInbodyRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progressPhotos, setProgressPhotos] = useState({ before: null, after: null });
  const [newInbodyRecord, setNewInbodyRecord] = useState({ weight: '', muscle_mass: '', body_fat: '', visceral_fat: '' });
  const [uploadError, setUploadError] = useState('');
  const [isUploadingProgress, setIsUploadingProgress] = useState(false);
  const [editData, setEditData] = useState({
    name: client.name || '',
    phone: client.phone || '',
    dob: client.dob || '',
    gender: client.gender || '',
    height: client.height || '',
    weight: client.weight || '',
    goal: client.goal || '',
    targetduration: client.targetduration || '',
    traininghistory: client.traininghistory || '',
    trainingtime: client.trainingtime || '',
    jobtype: client.jobtype || '',
    sleephabits: client.sleephabits || '',
  });

  const progressSectionRef = useRef(null);

  const fetchInBody = useCallback(async () => {
    const { data } = await supabase
      .from('inbody_records')
      .select('*')
      .eq('client_id', client.id)
      .order('recorded_at', { ascending: false })
      .limit(1);

    if (data) setInbodyRecords(data);
  }, [client.id]);

  const fetchProgressPhotos = useCallback(async () => {
    const beforeFileName = `client-${client.id}-before`;
    const afterFileName = `client-${client.id}-after`;

    try {
      const { data: beforeUrl } = supabase.storage.from('client-progress').getPublicUrl(beforeFileName);
      setProgressPhotos((prev) => ({ ...prev, before: beforeUrl.publicUrl }));
    } catch (err) {
      console.error('[Progress Photo] Before fetch error:', err);
    }

    try {
      const { data: afterUrl } = supabase.storage.from('client-progress').getPublicUrl(afterFileName);
      setProgressPhotos((prev) => ({ ...prev, after: afterUrl.publicUrl }));
    } catch (err) {
      console.error('[Progress Photo] After fetch error:', err);
    }
  }, [client.id]);

  useEffect(() => {
    fetchInBody();
    fetchProgressPhotos();
  }, [fetchInBody, fetchProgressPhotos]);

  useEffect(() => {
    if (!onRegisterActions) return undefined;

    onRegisterActions({
      openEdit: () => setIsEditMode(true),
      openInbody: () => setIsModalOpen(true),
      openPhotos: () => {
        progressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });

    return () => onRegisterActions(null);
  }, [onRegisterActions]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const fileName = `client-${client.id}-avatar`;
      const { error: avatarError } = await supabase.storage.from('client-avatars').upload(fileName, file, { upsert: true });

      if (avatarError) throw avatarError;

      const { data } = supabase.storage.from('client-avatars').getPublicUrl(fileName);
      await supabase.from('clients').update({ avatar_url: data.publicUrl }).eq('id', client.id);

      alert('Đã cập nhật avatar!');
      window.location.reload();
    } catch (err) {
      alert('Lỗi upload avatar: ' + err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSavingProfile(true);

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

    setIsSavingProfile(false);
  };

  const handleProgressPhotoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProgress(true);
    setUploadError('');

    try {
      const fileName = `client-${client.id}-${type}`;
      const { error } = await supabase.storage.from('client-progress').upload(fileName, file, { upsert: true });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      await fetchProgressPhotos();
    } catch (err) {
      setUploadError(`Lỗi upload: ${err.message}`);
      alert(`Lỗi upload: ${err.message}`);
    } finally {
      setIsUploadingProgress(false);
    }
  };

  const handleSaveInBody = async () => {
    if (!newInbodyRecord.weight) {
      alert('Cần có cân nặng!');
      return;
    }

    setIsSavingInbody(true);

    const { error } = await supabase.from('inbody_records').insert([
      {
        client_id: client.id,
        weight: parseFloat(newInbodyRecord.weight),
        muscle_mass: parseFloat(newInbodyRecord.muscle_mass) || 0,
        body_fat: parseFloat(newInbodyRecord.body_fat) || 0,
        visceral_fat: parseFloat(newInbodyRecord.visceral_fat) || 0,
        recorded_at: new Date().toISOString(),
      },
    ]);

    if (!error) {
      await fetchInBody();
      setIsModalOpen(false);
      setNewInbodyRecord({ weight: '', muscle_mass: '', body_fat: '', visceral_fat: '' });
    } else {
      alert('Lỗi: ' + error.message);
    }

    setIsSavingInbody(false);
  };

  const latest = inbodyRecords[0] || {};

  const metrics = [
    {
      label: 'CÂN NẶNG KG',
      value: latest.weight || client.weight || '--',
      valueClassName: 'text-blue-400',
    },
    {
      label: 'CƠ THỂ KG',
      value: latest.muscle_mass || '--',
      valueClassName: 'text-emerald-400',
    },
    {
      label: 'MỠ %',
      value: latest.body_fat || '--',
      valueClassName: 'text-yellow-500',
    },
    {
      label: 'MỠ NỘI TẠNG',
      value: latest.visceral_fat || '--',
      valueClassName: 'text-neutral-500',
    },
  ];

  const personalInfoCells = [
    { label: 'NGÀY SINH', value: client.dob || '--' },
    { label: 'GIỚI TÍNH', value: client.gender || '--' },
    { label: 'CHIỀU CAO CM', value: client.height ? `${client.height} cm` : '--' },
    { label: 'CÂN NẶNG KG', value: client.weight ? `${client.weight} kg` : '--' },
    { label: 'CÔNG VIỆC', value: client.jobtype || '--' },
    { label: 'GIẤC NGỦ', value: client.sleephabits || '--' },
    { label: 'LỊCH SỬ TẬP', value: client.traininghistory || '--' },
    { label: 'THỜI GIAN ĐẠT', value: client.targetduration || '--' },
  ];

  if (isEditMode) {
    return (
      <div className="relative isolate space-y-5 pb-6 pt-5 animate-slide-up">
        <div className="pointer-events-none absolute left-1/2 top-0 h-36 w-36 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="text-center">
          <p className="text-sm font-bold text-white">{editData.name || client.name}</p>
          <p className="mt-1 text-[10px] font-medium text-neutral-600">{editData.phone || 'Chưa cập nhật số điện thoại'}</p>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">AVATAR</p>
          <div className="overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <label className="flex cursor-pointer flex-col items-center gap-4 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-blue-500/15 shadow-lg shadow-blue-500/10">
                {isUploadingAvatar ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-white/40" />
                ) : (
                  <ClientAvatar
                    name={editData.name || client.name}
                    avatarUrl={client.avatar_url || client.avatar}
                    sizeClassName="h-24 w-24"
                    showInnerRing={true}
                    className="absolute inset-0"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Cập nhật avatar</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">CHẠM ĐỂ TẢI ẢNH MỚI</p>
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">THÔNG TIN CÁ NHÂN</p>
          <div className="space-y-3 overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <EditableField label="Tên học viên" value={editData.name} onChange={(value) => setEditData({ ...editData, name: value })} />
            <EditableField label="Số điện thoại" value={editData.phone} onChange={(value) => setEditData({ ...editData, phone: value })} />
            <div className="grid grid-cols-2 gap-3">
              <EditableField label="Ngày sinh" value={editData.dob} onChange={(value) => setEditData({ ...editData, dob: value })} type="date" />
              <EditableField label="Giới tính" value={editData.gender} onChange={(value) => setEditData({ ...editData, gender: value })} />
              <EditableField label="Chiều cao (cm)" value={editData.height} onChange={(value) => setEditData({ ...editData, height: value })} type="number" />
              <EditableField label="Cân nặng (kg)" value={editData.weight} onChange={(value) => setEditData({ ...editData, weight: value })} type="number" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">MỤC TIÊU & LIFESTYLE</p>
          <div className="space-y-3 overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
            <EditableField label="Mục tiêu" value={editData.goal} onChange={(value) => setEditData({ ...editData, goal: value })} />
            <EditableField label="Thời gian đạt" value={editData.targetduration} onChange={(value) => setEditData({ ...editData, targetduration: value })} />
            <EditableField label="Lịch sử tập" value={editData.traininghistory} onChange={(value) => setEditData({ ...editData, traininghistory: value })} />
            <EditableField label="Thời lượng/ngày" value={editData.trainingtime} onChange={(value) => setEditData({ ...editData, trainingtime: value })} />
            <div className="grid grid-cols-2 gap-3">
              <EditableField label="Công việc" value={editData.jobtype} onChange={(value) => setEditData({ ...editData, jobtype: value })} />
              <EditableField label="Giấc ngủ" value={editData.sleephabits} onChange={(value) => setEditData({ ...editData, sleephabits: value })} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setIsEditMode(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-white/[0.08] bg-white/[0.04] py-3.5 px-5 text-sm font-bold text-white transition-all active:scale-95 shadow-lg shadow-black/20"
          >
            <X className="h-4 w-4" />
            Hủy
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={isSavingProfile}
            className="flex flex-1 items-center justify-center gap-2 rounded-[18px] border border-blue-500/20 bg-blue-500/10 py-3.5 px-5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/10"
          >
            {isSavingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate space-y-5 pb-6 pt-5 animate-slide-up">
      <div className="pointer-events-none absolute left-1/2 top-2 h-40 w-40 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-2 top-48 h-28 w-28 rounded-full bg-emerald-500/[0.08] blur-3xl" />

      <div className="relative text-center">
        <ClientAvatar
          name={client.name}
          avatarUrl={client.avatar_url || client.avatar}
          sizeClassName="mx-auto h-24 w-24"
          showInnerRing={true}
          ringClassName="border border-white/10 bg-blue-500/15 shadow-xl shadow-blue-500/10"
        />
        <p className="mt-4 text-sm font-bold text-white">{client.name}</p>
        <p className="mt-1 text-[10px] font-medium text-neutral-600">{client.phone || 'Chưa cập nhật số điện thoại'}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 shadow-lg shadow-blue-500/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-300">{client.goal || 'CHƯA CÓ GOAL'}</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] shadow-xl shadow-black/20 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.03] to-transparent" />
        <div className="grid grid-cols-2">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`relative p-5 ${
                index % 2 === 0 ? 'border-r border-white/[0.05]' : ''
              } ${
                index < 2 ? 'border-b border-white/[0.05]' : ''
              }`}
            >
              <p className={`text-3xl font-light leading-none ${metric.valueClassName}`}>{metric.value}</p>
              <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-neutral-600">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div ref={progressSectionRef} className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">ẢNH TIẾN ĐỘ</p>

        {uploadError && (
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-[11px] font-medium text-red-400">{uploadError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {[
            { type: 'before', label: 'BEFORE', src: progressPhotos.before },
            { type: 'after', label: 'AFTER', src: progressPhotos.after },
          ].map((photo) => (
            <label key={photo.type} className="block cursor-pointer">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] border border-white/[0.05] bg-white/[0.02] shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute left-3 top-3 z-10 text-[9px] font-black uppercase tracking-widest text-neutral-700">
                  {photo.label}
                </span>

                {isUploadingProgress ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <RefreshCw className="mb-3 h-6 w-6 animate-spin text-white/30" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Uploading</p>
                  </div>
                ) : photo.src ? (
                  <img src={photo.src} alt={photo.label.toLowerCase()} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Camera className="mb-3 h-6 w-6 text-neutral-600" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-700">{photo.label}</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleProgressPhotoUpload(e, photo.type)}
                className="hidden"
                disabled={isUploadingProgress}
              />
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[18px] py-3.5 px-5 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-black/20 hover:bg-white/[0.05]"
      >
        <Plus className="w-4 h-4" />
        Nhập Inbody mới
      </button>

      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">THÔNG TIN CÁ NHÂN</p>
        <div className="relative overflow-hidden rounded-[24px] border border-white/[0.05] bg-white/[0.02] shadow-xl shadow-black/20 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/[0.03] to-transparent" />
          <div className="grid grid-cols-2">
            {personalInfoCells.map((item, index) => (
              <InfoCell
                key={item.label}
                label={item.label}
                value={item.value}
                className={`${index % 2 === 0 ? 'border-r border-white/[0.05]' : ''} ${
                  index < personalInfoCells.length - 2 ? 'border-b border-white/[0.05]' : ''
                }`}
              />
            ))}

            <InfoCell
              label="THỜI LƯỢNG/NGÀY"
              value={client.trainingtime || '--'}
              valueClassName="text-[11px] font-semibold text-blue-400"
              className="col-span-2 border-t border-white/[0.05]"
            />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/60 px-4 pb-10 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[32px] border border-white/10 bg-[#1a1a1c] p-6 shadow-2xl animate-slide-up">
            <h3 className="mb-6 text-sm font-bold text-white">Nhập Inbody</h3>

            <div className="mb-6 space-y-3">
              {[
                { label: 'Cân nặng (kg)', key: 'weight' },
                { label: 'Cơ thể (kg)', key: 'muscle_mass' },
                { label: 'Mỡ (%)', key: 'body_fat' },
                { label: 'Mỡ nội tạng', key: 'visceral_fat' },
              ].map((field) => (
                <input
                  key={field.key}
                  type="number"
                  placeholder={field.label}
                  value={newInbodyRecord[field.key]}
                  onChange={(e) => setNewInbodyRecord({ ...newInbodyRecord, [field.key]: e.target.value })}
                  className="w-full rounded-[12px] border border-white/5 bg-black/40 px-3 py-2 text-sm font-normal text-white outline-none focus:border-blue-500/50"
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-[12px] bg-white/5 py-3 text-[10px] font-black uppercase text-white"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveInBody}
                disabled={isSavingInbody}
                className="flex-1 rounded-[12px] bg-blue-500/20 py-3 text-[10px] font-black uppercase text-blue-400 disabled:opacity-50"
              >
                {isSavingInbody ? '...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
