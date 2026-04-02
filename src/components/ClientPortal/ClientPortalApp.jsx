import React, { useState, useEffect, useCallback } from 'react';
import {
  Home, Package, Dumbbell, Utensils, CreditCard,
  LogOut, ChevronRight, Zap, User, Calendar, Target,
  TrendingUp, Clock, Bell, Activity
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import ClientAvatar from '../shared/ClientAvatar';

// Import các tab sẵn có (read-only cho client)
import PackageTab from '../Client/Tabs/PackageTab';
import SessionsTab from '../Client/Tabs/SessionsTab';
import NutritionTab from '../Client/Tabs/NutritionTab';
import PaymentTab from '../Client/Tabs/PaymentTab';
import ProfileTab from '../Client/Tabs/ProfileTab';

// ============================================================
// TAB: HOME - Tổng quan cho học viên
// ============================================================
const ClientHomeTab = ({ client, onLogout }) => {
  const remaining = client?.package?.remaining ?? '--';
  const total = client?.package?.total ?? '--';
  const progressPct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-2 space-y-4">

      {/* Header chào học viên */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <div className="flex items-center gap-3">
          <ClientAvatar
            name={client?.name}
            avatarUrl={client?.avatar_url || client?.avatar}
            sizeClassName="w-12 h-12"
            ringClassName="border border-[rgba(200,245,63,0.28)] bg-[linear-gradient(135deg,rgba(200,245,63,0.18),rgba(96,180,255,0.18))]"
            textClassName="text-sm font-black app-accent-text"
          />
          <div>
            <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Welcome 👋</p>
            <h2 className="text-white font-medium text-lg leading-tight">{client?.name || 'Trainee'}</h2>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="app-ghost-button p-2.5 border rounded-full text-neutral-600 active:scale-90 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Goal badge */}
      {client?.goal && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-[16px]">
          <Target className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-blue-300 text-xs font-medium">{client.goal}</p>
        </div>
      )}

      {/* Card gói tập */}
        <div className="app-glass-panel rounded-[28px] border p-6 relative overflow-hidden">
        <Zap className="absolute -right-3 -top-3 w-20 h-20 text-white/[0.04]" />
        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-3">Current Package</p>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-light text-white">{remaining}</p>
            <p className="text-[9px] font-black text-neutral-600 uppercase mt-0.5">Sessions Left</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-light text-neutral-400">{total}</p>
            <p className="text-[9px] font-black text-neutral-600 uppercase mt-0.5">Total Sessions</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[9px] text-neutral-600 mt-2">{progressPct}% đã hoàn thành</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] p-4">
          <Activity className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-white font-medium text-lg">{client?.height || '--'}</p>
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Chiều cao (cm)</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] p-4">
          <TrendingUp className="w-5 h-5 text-orange-400 mb-2" />
          <p className="text-white font-medium text-lg">{client?.weight || '--'}</p>
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Cân nặng (kg)</p>
        </div>
      </div>

      {/* Thông tin cam kết */}
      {client?.commitmentlevel && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 flex items-center gap-3">
          <Bell className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-0.5">Commitment</p>
            <p className="text-white text-sm">{client.commitmentlevel}</p>
          </div>
        </div>
      )}

      {/* Thời gian tập */}
      {client?.trainingtime && (
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[20px] p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-0.5">Training Time</p>
            <p className="text-white text-sm">{client.trainingtime}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// TAB: SESSIONS - Lịch sử buổi tập
// ============================================================
const ClientSessionsTab = () => (
  <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-4 space-y-4">
    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Lịch sử buổi tập</p>
    <div className="text-center py-20 opacity-20">
      <Dumbbell className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
        Chưa có lịch sử buổi tập
      </p>
    </div>
  </div>
);

// ============================================================
// MAIN: ClientPortalApp
// ============================================================
const ClientPortalApp = ({ clientProfile: initialProfile, onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatClient = (raw) => {
    if (!raw) return null;
    return {
      ...raw,
      avatar: raw.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${raw.name}&backgroundColor=eceff4`,
      package: {
        total: raw.sessions ? parseInt(raw.sessions) : 0,
        remaining: raw.sessions ? parseInt(raw.sessions) : 0,
      },
    };
  };

  // Fetch lại data client mới nhất từ Supabase
  const fetchClientData = useCallback(async () => {
    if (!initialProfile?.id) {
      setClient(formatClient(initialProfile));
      setIsLoading(false);
      return;
    }
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', initialProfile.id)
      .maybeSingle();

    setClient(formatClient(data || initialProfile));
    setIsLoading(false);
  }, [initialProfile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchClientData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchClientData]);

  if (isLoading) {
    return (
      <div className="app-screen-shell h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'home',      icon: Home,      label: 'Home' },
    { id: 'package',   icon: Package,   label: 'Gói tập' },
    { id: 'sessions',  icon: Dumbbell,  label: 'Sessions' },
    { id: 'nutrition', icon: Utensils,  label: 'Dinh dưỡng' },
    { id: 'payment',   icon: CreditCard, label: 'Thanh toán' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':      return <ClientHomeTab client={client} onLogout={onLogout} />;
      case 'package':   return (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-4">
          <PackageTab client={client} readOnly={true} />
        </div>
      );
      case 'sessions':  return (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-4">
          <SessionsTab clientId={client?.id} readOnly={true} />
        </div>
      );
      case 'nutrition': return (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-4">
          <NutritionTab client={client} readOnly={true} />
        </div>
      );
      case 'payment':   return (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-4">
          <PaymentTab client={client} readOnly={true} />
        </div>
      );
      default:          return <ClientHomeTab client={client} onLogout={onLogout} />;
    }
  };

  return (
    <div className="app-screen-shell h-screen flex flex-col relative">

      {/* Top bar (hiển thị khi không ở home) */}
      {activeTab !== 'home' && (
        <div className="shrink-0 px-5 pt-6 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p className="text-neutral-600 text-[10px]">{client?.name}</p>
          </div>
          <button
            onClick={onLogout}
            className="app-ghost-button p-2.5 border rounded-full text-neutral-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      {renderContent()}

      {/* Bottom Navigation */}
      <div className="app-nav-shell absolute bottom-6 left-1/2 -translate-x-1/2 w-[94%] rounded-[32px] p-1.5 flex justify-between z-50 shadow-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3.5 rounded-[26px] flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeTab === tab.id
                ? 'app-nav-item-active scale-100'
                : 'text-neutral-600 scale-90 opacity-50'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'app-accent-text' : 'text-neutral-700'}`} />
            <span className="text-[7px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClientPortalApp;
