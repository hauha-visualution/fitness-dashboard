import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Package, Dumbbell, Utensils, CreditCard, LogOut,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import NotificationBell from '../shared/NotificationBell';

// Import các tab sẵn có (read-only cho client)
import PackageTab from '../Client/Tabs/PackageTab';
import SessionsTab from '../Client/Tabs/SessionsTab';
import NutritionTab from '../Client/Tabs/NutritionTab';
import PaymentTab from '../Client/Tabs/PaymentTab';
import ProfileTab from '../Client/Tabs/ProfileTab';
import QuickLogSheet from '../Dashboard/QuickLogSheet';

const PORTAL_HEADER_META = {
  profile: { eyebrow: 'Trainee Profile', title: 'Profile' },
  package: { eyebrow: 'Trainee Services', title: 'Services' },
  sessions: { eyebrow: 'Trainee Sessions', title: 'Sessions' },
  nutrition: { eyebrow: 'Trainee Nutrition', title: 'Nutrition' },
  payment: { eyebrow: 'Trainee Payments', title: 'Payment' },
};

const PORTAL_TABS = ['profile', 'package', 'sessions', 'nutrition', 'payment'];

const getRequestedPortalTab = () => {
  if (typeof window === 'undefined') return 'profile';
  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  return PORTAL_TABS.includes(requestedTab) ? requestedTab : 'profile';
};

const clearConsumedTabParam = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('tab')) return;
  url.searchParams.delete('tab');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next || '/portal');
};

const ClientPortalNavigation = ({ tabs, activeTab, onSelectTab, desktop = false }) => (
  <div
    className={
      desktop
        ? 'app-nav-shell hidden lg:flex lg:h-full lg:w-[104px] lg:flex-col lg:justify-center lg:rounded-[34px] lg:p-2.5 lg:shadow-2xl'
        : 'app-mobile-nav-offset app-nav-shell absolute left-1/2 z-50 flex w-[94%] -translate-x-1/2 justify-between rounded-[32px] p-1.5 shadow-2xl lg:hidden'
    }
  >
    <div className={desktop ? 'flex flex-col gap-2' : 'contents'}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[26px] py-3.5 transition-all duration-300 lg:min-h-[80px] lg:gap-1.5 lg:px-2 lg:py-3 ${
            activeTab === tab.id
              ? 'app-nav-item-active scale-100'
              : 'text-neutral-600 scale-90 opacity-50 lg:scale-100'
          }`}
        >
          <tab.icon className={`h-4 w-4 lg:h-5 lg:w-5 ${activeTab === tab.id ? 'app-accent-text' : 'text-neutral-700'}`} />
          <span className="text-[7px] font-black uppercase tracking-tighter lg:text-[8px] lg:leading-[1.2]">{tab.label}</span>
        </button>
      ))}
    </div>
  </div>
);

// ============================================================
// MAIN: ClientPortalApp
// ============================================================
const ClientPortalApp = ({ session, clientProfile: initialProfile, onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => getRequestedPortalTab());
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quickLogSelection, setQuickLogSelection] = useState(null);

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

  useEffect(() => {
    clearConsumedTabParam();
  }, []);

  if (isLoading) {
    return (
      <div className="app-screen-shell h-dvh flex items-center justify-center lg:h-full">
        <div className="w-10 h-10 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile',   icon: User,      label: 'Profile' },
    { id: 'package',   icon: Package,   label: 'Services' },
    { id: 'sessions',  icon: Dumbbell,  label: 'Sessions' },
    { id: 'nutrition', icon: Utensils,  label: 'Nutrition' },
    { id: 'payment',   icon: CreditCard, label: 'Payment' },
  ];
  const activeHeader = PORTAL_HEADER_META[activeTab] || PORTAL_HEADER_META.profile;

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':   return (
        <div className="h-full min-h-0 overflow-y-auto hide-scrollbar px-5 pt-4 app-mobile-nav-spacing lg:px-8 lg:pb-8">
          <ProfileTab client={client} readOnly={true} allowStretchingBooking={true} />
        </div>
      );
      case 'package':   return (
        <div className="h-full min-h-0 overflow-y-auto hide-scrollbar px-5 pt-4 app-mobile-nav-spacing lg:px-8 lg:pb-8">
          <PackageTab client={client} readOnly={true} allowStretchingBooking={true} />
        </div>
      );
      case 'sessions':  return (
        <div className="h-full min-h-0 overflow-y-auto hide-scrollbar px-5 pt-4 app-mobile-nav-spacing lg:px-8 lg:pb-8">
          <SessionsTab
            clientId={client?.id}
            client={client}
            readOnly={true}
            allowStretchingBooking={true}
            onOpenQuickLog={setQuickLogSelection}
          />
        </div>
      );
      case 'nutrition': return (
        <div className="h-full min-h-0 overflow-y-auto hide-scrollbar px-5 pt-4 app-mobile-nav-spacing lg:px-8 lg:pb-8">
          <NutritionTab client={client} readOnly={true} />
        </div>
      );
      case 'payment':   return (
        <div className="h-full min-h-0 overflow-y-auto hide-scrollbar px-5 pt-4 app-mobile-nav-spacing lg:px-8 lg:pb-8">
          <PaymentTab client={client} readOnly={true} />
        </div>
      );
      default:          return (
        <div className="h-full min-h-0 overflow-y-auto hide-scrollbar px-5 pt-4 app-mobile-nav-spacing lg:px-8 lg:pb-8">
          <ProfileTab client={client} readOnly={true} allowStretchingBooking={true} />
        </div>
      );
    }
  };

  return (
    <div className="app-screen-shell relative flex h-dvh flex-col lg:h-full">

      {/* Top bar — luôn hiển thị trên mọi tab, kể cả Profile */}
      <div className="app-safe-top-header flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.04] bg-black/30 px-5 backdrop-blur-xl lg:px-8 lg:py-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-neutral-600">
            {activeHeader.eyebrow}
          </p>
          <h1 className="mt-1 truncate text-[17px] font-semibold tracking-[-0.01em] text-white">
            {activeHeader.title}
          </h1>
          <p className="mt-1 truncate text-[11px] text-neutral-500">{client?.name}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell userId={session?.user?.id ?? null} />
          <button
            onClick={onLogout}
            className="app-ghost-button shrink-0 p-2.5 border rounded-full text-neutral-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-5 lg:p-5">
        <div className="min-h-0 flex-1 overflow-hidden">
          {renderContent()}
        </div>

        <ClientPortalNavigation
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          desktop
        />

        <ClientPortalNavigation
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
      </div>

      {quickLogSelection ? (
        <QuickLogSheet
          session={null}
          initialSelection={quickLogSelection}
          onClose={() => setQuickLogSelection(null)}
          onSaved={() => {}}
        />
      ) : null}
    </div>
  );
};

export default ClientPortalApp;
