import React, { useState } from 'react';
import { ArrowLeft, Trash2, MoreHorizontal, User, Package, Dumbbell, Utensils, CreditCard, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabaseClient';

// Import các Tab mới từ thư mục con
import ProfileTab from './Tabs/ProfileTab';
import PackageTab from './Tabs/PackageTab';
import SessionsTab from './Tabs/SessionsTab';
import NutritionTab from './Tabs/NutritionTab';
import PaymentTab from './Tabs/PaymentTab';

const ClientDetailView = ({ client, onBack, onDelete }) => {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'profile':   return <ProfileTab client={client} onDelete={openDeleteModal} />;
      case 'package':   return <PackageTab client={client} readOnly={false} />;
      case 'sessions':  return <SessionsTab clientId={client.id} readOnly={false} />;
      case 'nutrition': return <NutritionTab client={client} />;
      case 'payment':   return <PaymentTab client={client} />;
      default:          return <ProfileTab client={client} onDelete={openDeleteModal} />;
    }
  };

  const openDeleteModal = (clientId) => {
    setShowDeleteModal(true);
  };

  // Xác minh credentials của coach trước khi xóa
  const handleDeleteConfirm = async () => {
    setDeleteError('');

    if (!confirmUsername || !confirmPassword) {
      setDeleteError('Vui lòng nhập username và password.');
      return;
    }

    setIsDeleting(true);

    try {
      // Chuyển username thành email giả (giống như trong AuthScreen)
      const coachEmail = `${confirmUsername.toLowerCase().trim()}@aestheticshub.app`;

      // Xác minh credentials với Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: coachEmail,
        password: confirmPassword,
      });

      if (authError) {
        setDeleteError('Username hoặc password không đúng.');
        setIsDeleting(false);
        return;
      }

      // Nếu xác minh thành công, tiến hành xóa
      await onDelete(client.id);
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteError('Lỗi khi xóa: ' + (err.message || 'Thử lại nhé'));
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden animate-slide-up">

      {/* HEADER */}
      <div className="p-6 flex justify-between items-center shrink-0 z-10">
        <button onClick={onBack} className="p-3 bg-white/5 border border-white/10 rounded-full text-white active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-full text-neutral-600">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CLIENT MINI HEADER */}
      <div className="px-6 flex items-center gap-5 mb-8 shrink-0">
        <img src={client.avatar} className="w-16 h-16 rounded-full border border-white/10 bg-white shadow-2xl" alt="avt" />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-medium text-white truncate">{client.name}</h1>
          <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest mt-1">{client.goal}</p>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-6 pb-40 hide-scrollbar">
        {renderContent()}
      </div>

      {/* CONTEXTUAL BOTTOM NAV */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1.5 flex justify-between z-50 shadow-2xl">
        {[
          { id: 'profile', icon: User, label: 'Profile' },
          { id: 'package', icon: Package, label: 'Gói tập' },
          { id: 'sessions', icon: Dumbbell, label: 'Sessions' },
          { id: 'nutrition', icon: Utensils, label: 'Nutrition' },
          { id: 'payment', icon: CreditCard, label: 'Payment' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-4 rounded-[26px] flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeSubTab === tab.id ? 'bg-white/5 text-white shadow-inner scale-100' : 'text-neutral-600 scale-90 opacity-50'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeSubTab === tab.id ? 'text-white' : 'text-neutral-700'}`} />
            <span className="text-[7px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MODAL XÓA VỚI XÁC NHẬN */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-[360px] bg-[#1a1a1c] border border-red-500/20 rounded-[32px] p-8 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-white font-bold text-lg">Xóa học viên?</h3>
            </div>

            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              Hành động này <span className="text-red-400 font-semibold">không thể hoàn tác</span>. Tất cả dữ liệu của <span className="text-white font-semibold">{client.name}</span> sẽ bị xóa vĩnh viễn.
            </p>

            <p className="text-[10px] font-black uppercase text-neutral-600 tracking-widest mb-3">Nhập thông tin coach để xác nhận</p>

            {/* Username */}
            <div className="mb-4">
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => { setConfirmUsername(e.target.value); setDeleteError(''); }}
                placeholder="Username"
                className="w-full bg-black/40 border border-white/5 rounded-[16px] px-4 py-3 text-white text-sm outline-none focus:border-red-500/50 transition-all"
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setDeleteError(''); }}
                placeholder="Password"
                className="w-full bg-black/40 border border-white/5 rounded-[16px] px-4 py-3 text-white text-sm outline-none focus:border-red-500/50 transition-all"
              />
            </div>

            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-[12px] p-3 mb-4">
                <p className="text-red-400 text-[11px] font-medium">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-white/5 border border-white/10 rounded-[16px] py-3 text-white font-black text-[11px] uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting || !confirmUsername || !confirmPassword}
                className="flex-1 bg-red-500/20 border border-red-500/30 rounded-[16px] py-3 text-red-400 font-black text-[11px] uppercase tracking-wider hover:bg-red-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
