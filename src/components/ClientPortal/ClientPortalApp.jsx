import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Dumbbell, Utensils, CreditCard, LogOut, User,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

// Import các tab sẵn có (read-only cho client)
import PackageTab from '../Client/Tabs/PackageTab';
import SessionsTab from '../Client/Tabs/SessionsTab';
import NutritionTab from '../Client/Tabs/NutritionTab';
import PaymentTab from '../Client/Tabs/PaymentTab';
import ProfileTab from '../Client/Tabs/ProfileTab';

// ============================================================
// MAIN: ClientPortalApp
// ============================================================
const ClientPortalApp = ({ clientProfile: initialProfile, onLogout }) => {
  const [activeTab, setActiveTab] = useState('profile');
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
    { id: 'profile',   icon: User,      label: 'Profile' },
    { id: 'package',   icon: Package,   label: 'Gói tập' },
    { id: 'sessions',  icon: Dumbbell,  label: 'Sessions' },
    { id: 'nutrition', icon: Utensils,  label: 'Dinh dưỡng' },
    { id: 'payment',   icon: CreditCard, label: 'Thanh toán' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':   return (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-4">
          <ProfileTab client={client} readOnly={true} />
        </div>
      );
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
      default:          return (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pb-32 pt-4">
          <ProfileTab client={client} readOnly={true} />
        </div>
      );
    }
  };

  return (
    <div className="app-screen-shell h-screen flex flex-col relative">

      {/* Top bar (hiển thị khi không ở profile) */}
      {activeTab !== 'profile' && (
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
