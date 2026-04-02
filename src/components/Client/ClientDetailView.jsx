import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Image,
  MoreHorizontal,
  Package,
  Pencil,
  RefreshCw,
  Trash2,
  User,
  Utensils,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

import ProfileTab from './Tabs/ProfileTab';
import PackageTab from './Tabs/PackageTab';
import SessionsTab from './Tabs/SessionsTab';
import NutritionTab from './Tabs/NutritionTab';
import PaymentTab from './Tabs/PaymentTab';

const ClientDetailView = ({ client, onBack, onDelete, onOpenQuickLog, refreshKey }) => {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileActions, setProfileActions] = useState(null);

  const isProfileTab = activeSubTab === 'profile';

  const openDeleteModal = () => {
    setIsProfileMenuOpen(false);
    setShowDeleteModal(true);
  };

  const renderContent = () => {
    switch (activeSubTab) {
      case 'profile':
        return <ProfileTab client={client} onDelete={openDeleteModal} onRegisterActions={setProfileActions} />;
      case 'package':
        return <PackageTab client={client} readOnly={false} />;
      case 'sessions':
        return <SessionsTab clientId={client.id} client={client} readOnly={false} onOpenQuickLog={onOpenQuickLog} refreshKey={refreshKey} />;
      case 'nutrition':
        return <NutritionTab client={client} readOnly={false} />;
      case 'payment':
        return <PaymentTab client={client} readOnly={false} />;
      default:
        return <ProfileTab client={client} onDelete={openDeleteModal} onRegisterActions={setProfileActions} />;
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteError('');

    if (!confirmUsername || !confirmPassword) {
      setDeleteError('Vui lòng nhập username và password.');
      return;
    }

    setIsDeleting(true);

    try {
      const coachEmail = `${confirmUsername.toLowerCase().trim()}@aestheticshub.app`;
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: coachEmail,
        password: confirmPassword,
      });

      if (authError) {
        setDeleteError('Username hoặc password không đúng.');
        setIsDeleting(false);
        return;
      }

      await onDelete(client.id);
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteError('Lỗi khi xóa: ' + (err.message || 'Thử lại nhé'));
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
  };

  const handleMenuAction = (callback) => {
    setIsProfileMenuOpen(false);
    callback?.();
  };

  const menuItems = [
    {
      key: 'edit',
      icon: Pencil,
      label: 'Chỉnh sửa',
      sublabel: 'THÔNG TIN HỌC VIÊN',
      onClick: () => profileActions?.openEdit?.(),
    },
    {
      key: 'inbody',
      icon: ClipboardList,
      label: 'Nhập Inbody',
      sublabel: 'CẬP NHẬT CHỈ SỐ MỚI',
      onClick: () => profileActions?.openInbody?.(),
    },
    {
      key: 'photos',
      icon: Image,
      label: 'Cập nhật ảnh',
      sublabel: 'BEFORE / AFTER',
      onClick: () => profileActions?.openPhotos?.(),
    },
    {
      key: 'delete',
      icon: Trash2,
      label: 'Xóa học viên',
      sublabel: 'KHÔNG THỂ HOÀN TÁC',
      danger: true,
      onClick: openDeleteModal,
    },
  ];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0a0a0a] animate-slide-up">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-blue-500/[0.08] via-blue-500/[0.03] to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-32 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-28 h-48 w-48 rounded-full bg-neutral-500/10 blur-3xl" />

      <div className="relative z-20 grid shrink-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 border-b border-white/[0.04] bg-black/30 px-4 py-3 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="p-2.5 bg-white/5 border border-white/10 rounded-full text-white active:scale-90 transition-all shadow-lg shadow-black/20"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <p className="px-4 text-center text-[9px] font-black uppercase tracking-widest text-neutral-600">
          HỒ SƠ HỌC VIÊN
        </p>

        {isProfileTab ? (
          <button
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className={`p-2.5 rounded-full border text-white active:scale-90 transition-all shadow-lg shadow-black/20 ${
              isProfileMenuOpen ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>

      {isProfileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close profile menu"
            onClick={() => setIsProfileMenuOpen(false)}
            className="fixed inset-0 z-[200] bg-black/50"
          />

          <div className="absolute top-[52px] right-4 z-[210] w-[200px] overflow-hidden rounded-[20px] border border-white/10 bg-[#1a1a1c] shadow-2xl shadow-black/40 backdrop-blur-xl">
            {menuItems.map((item, index) => (
              <button
                key={item.key}
                onClick={() => handleMenuAction(item.onClick)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.03] active:bg-white/[0.04] ${
                  index < menuItems.length - 1 ? 'border-b border-white/[0.05]' : ''
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${item.danger ? 'text-red-400/70' : 'text-white'}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${item.danger ? 'text-red-400/80' : 'text-white'}`}>{item.label}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{item.sublabel}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="hide-scrollbar relative z-10 flex-1 overflow-y-auto px-4 pb-40">
        {renderContent()}
      </div>

      <div className="absolute bottom-6 left-1/2 z-50 flex w-[92%] -translate-x-1/2 justify-between rounded-[32px] border border-white/10 bg-black/80 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-3xl">
        {[
          { id: 'profile', icon: User, label: 'Profile' },
          { id: 'package', icon: Package, label: 'Gói tập' },
          { id: 'sessions', icon: Dumbbell, label: 'Sessions' },
          { id: 'nutrition', icon: Utensils, label: 'Nutrition' },
          { id: 'payment', icon: CreditCard, label: 'Payment' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id);
              setIsProfileMenuOpen(false);
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[26px] py-4 transition-all duration-300 ${
              activeSubTab === tab.id ? 'scale-100 bg-white/5 text-white shadow-inner shadow-white/5' : 'scale-90 text-neutral-600 opacity-50'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeSubTab === tab.id ? 'text-white' : 'text-neutral-700'}`} />
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[32px] border border-red-500/20 bg-[#1a1a1c] p-8 shadow-2xl animate-slide-up">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Xóa học viên?</h3>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-neutral-400">
              Hành động này <span className="font-semibold text-red-400">không thể hoàn tác</span>. Tất cả dữ liệu của{' '}
              <span className="font-semibold text-white">{client.name}</span> sẽ bị xóa vĩnh viễn.
            </p>

            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-600">
              Nhập thông tin coach để xác nhận
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => {
                  setConfirmUsername(e.target.value);
                  setDeleteError('');
                }}
                placeholder="Username"
                className="w-full rounded-[16px] border border-white/5 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-red-500/50"
              />
            </div>

            <div className="mb-4">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setDeleteError('');
                }}
                placeholder="Password"
                className="w-full rounded-[16px] border border-white/5 bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all focus:border-red-500/50"
              />
            </div>

            {deleteError && (
              <div className="mb-4 rounded-[12px] border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-[11px] font-medium text-red-400">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-[16px] border border-white/10 bg-white/5 py-3 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:bg-white/10 active:scale-95"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting || !confirmUsername || !confirmPassword}
                className="flex flex-1 items-center justify-center gap-2 rounded-[16px] border border-red-500/30 bg-red-500/20 py-3 text-[11px] font-black uppercase tracking-wider text-red-400 transition-all hover:bg-red-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailView;
