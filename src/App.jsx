import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Home, Library, LogOut, Users, Wallet } from 'lucide-react';
import NotificationBell from './components/shared/NotificationBell';
import ToastContainer from './components/shared/ToastContainer';
import Skeleton from './components/shared/Skeleton';
import { toast } from './utils/toast';
import { useAuth } from './hooks/useAuth';
import { supabase } from './supabaseClient';

// Always-loaded (auth / shell)
import AuthScreen from './components/Auth/AuthScreen';

// Lazy-loaded heavy views — split into separate JS chunks
const DashboardView        = lazy(() => import('./components/Dashboard/DashboardView'));
const ClientListView       = lazy(() => import('./components/Client/ClientListView'));
const AddClientView        = lazy(() => import('./components/Client/AddClientView'));
const CoachProfileView     = lazy(() => import('./components/Dashboard/CoachProfileView'));
const QuickLogSheet        = lazy(() => import('./components/Dashboard/QuickLogSheet'));
const ClientDetailView     = lazy(() => import('./components/Client/ClientDetailView'));
const ClientPortalApp      = lazy(() => import('./components/ClientPortal/ClientPortalApp'));
const WorkoutTemplateManager = lazy(() => import('./components/Dashboard/WorkoutTemplateManager'));
const CoachPaymentsView    = lazy(() => import('./components/Dashboard/CoachPaymentsView'));

// Suspense fallback
const ViewFallback = () => (
  <div className="flex-1 overflow-hidden p-4">
    <Skeleton.Page />
  </div>
);

// --- STYLES ---
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}} />
);

const StartWorkoutIcon = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M21.3,5.3c-.2,0-.3-.1-.3-.3V1.5c0-.2.1-.3.3-.3s.3.1.3.3v3.4c0,.2-.1.3-.3.3Z" />
    <path d="M17.6,4.9c-.1-.2-.4-.4-.6-.5,0,0,0,0,0,0-.3,0-.6,0-.9.2-.3.2-.4.5-.4.8,0,.2,0,.5,0,.7,0,.5-.3,1-.6,1.5-.5.8-1.2,1.3-1.8,1.5-.2,0-.2.3-.1.4,0,.2.3.2.4.1.6-.3,1.4-.8,2-1.8.3-.5.6-1.1.7-1.7,0-.3,0-.6,0-.8,0-.1,0-.3.2-.3.1,0,.2-.1.4,0,0,0,0,0,0,0,.1,0,.2.1.3.2.1.1.1.3,0,.5l-.7,2.5h0c-.3,1.5-2.4,2.6-2.5,2.6h-.2c0,0,.8,11.4.8,11.4,0,0,0,.4-.4.6-.3.1-.7,0-.9-.3l-1-7.9c0-.2-.2-.3-.3-.3h0c-.2,0-.3.1-.3.3l-.9,7.7c0,.3-.4.5-.7.5-.2,0-.3,0-.4-.2-.1-.1-.2-.3-.2-.5l.6-11.3h-.2c-1.5-.7-2.2-2.2-2.6-3.3-.4-1-.5-1.7-.5-2.1,0-.2,0-.4.2-.5,0,0,.1,0,.2,0,.2,0,.5,0,.6.3,0,0,0,0,0,0,0,.3.6,2.5.7,2.6.4,1.5,2,1.9,2.1,2,.2,0,.3,0,.4-.2,0-.2,0-.3-.2-.4,0,0-1.3-.3-1.6-1.5-.2-.6-.6-2.3-.7-2.5,0,0,0-.1,0-.1-.2-.5-.7-.7-1.2-.7-.2,0-.3,0-.5.2-.4.2-.5.7-.5,1.1,0,.7.3,1.5.6,2.3.6,1.7,1.6,2.9,2.8,3.5l-.6,10.8c0,.4.1.7.4,1,.2.3.6.4.9.4.6,0,1.1-.4,1.3-1h0s.6-5.3.6-5.3l.7,5.6h0c.3.5.8.8,1.2.8s.4,0,.5-.1c.6-.3.7-1,.7-1.1h0s-.8-11-.8-11c.6-.3,2.3-1.4,2.6-2.9l.7-2.5c.1-.4,0-.7-.2-1Z" />
    <path d="M12,4.2c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5,2.5-1.1,2.5-2.5-1.1-2.5-2.5-2.5ZM12,8.6c-1,0-1.9-.8-1.9-1.9s.8-1.9,1.9-1.9,1.9.8,1.9,1.9-.8,1.9-1.9,1.9Z" />
    <path d="M4.1,3v.6H1.4c-.2,0-.3-.1-.3-.3s.1-.3.3-.3h2.8Z" />
    <path d="M5,3h14.1v.6H5Z" />
    <path d="M22.9,3.3c0,.2-.1.3-.3.3h-2.8v-.6h2.8c.2,0,.3.1.3.3Z" />
    <path d="M4.7.5h-.3c-.5,0-.9.4-.9.9v3.9c0,.5.4.9.9.9h.3c.5,0,.9-.4.9-.9V1.4c0-.5-.4-.9-.9-.9ZM5,5.3c0,.1-.1.3-.3.3h-.3c-.1,0-.3-.1-.3-.3V1.4c0-.1.1-.3.3-.3h.3c.1,0,.3.1.3.3v3.9Z" />
    <path d="M2.8,5.3c-.2,0-.3-.1-.3-.3V1.5c0-.2.1-.3.3-.3s.3.1.3.3v3.4c0,.2-.1.3-.3.3Z" />
    <path d="M19.6.4h-.3c-.5,0-.9.4-.9.9v3.9c0,.5.4.9.9.9h.3c.5,0,.9-.4.9-.9V1.3c0-.5-.4-.9-.9-.9ZM19.9,5.2c0,.1-.1.3-.3.3h-.3c-.1,0-.3-.1-.3-.3V1.3c0-.1.1-.3.3-.3h.3c.1,0,.3.1.3.3v3.9Z" />
  </svg>
);

const normalizeQuickLogSelection = (selection = null) => {
  if (!selection) return null;

  return {
    sessionId: selection.sessionId ?? selection.id ?? null,
    clientId: selection.clientId ?? selection.client_id ?? null,
    clientName: selection.clientName ?? selection.client_name ?? null,
    scheduledDate: selection.scheduledDate ?? selection.scheduled_date ?? null,
    scheduledTime: selection.scheduledTime ?? selection.scheduled_time ?? null,
    packageId: selection.packageId ?? selection.package_id ?? null,
    sessionKind: selection.sessionKind ?? selection.session_kind ?? 'fixed',
    manualMode: Boolean(selection.manualMode),
  };
};

const getRouteContextFromPath = (pathname = '/') => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (normalizedPath === '/coach/signup') return 'coach-signup';
  return 'main';
};

const getPathForContext = (context, isAuthenticated = false) => {
  if (context === 'coach-signup') return '/coach/signup';
  if (context === 'client') return isAuthenticated ? '/portal' : '/';
  return '/';
};

const CoachNavigation = ({ coachTabs, activeTab, onSelectTab, onOpenQuickLog, desktop = false }) => (
  <div
    className={
      desktop
        ? 'app-nav-shell hidden lg:flex lg:h-full lg:w-[64px] lg:flex-col lg:justify-center lg:rounded-[28px] lg:p-2 lg:shadow-2xl'
        : 'app-nav-shell fixed bottom-6 left-1/2 z-50 grid w-[92%] max-w-[390px] -translate-x-1/2 grid-cols-5 gap-1 rounded-[30px] px-2 py-1.5 lg:hidden'
    }
  >
    <div className={desktop ? 'flex flex-col gap-1.5' : 'contents'}>
      {coachTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const buttonClassName = tab.isAction
          ? 'app-nav-action'
          : isActive
            ? 'app-nav-item-active'
            : 'app-nav-item border border-transparent';

        return (
          <button
            key={tab.id}
            type="button"
            title={tab.label}
            onClick={() => {
              if (tab.isAction) {
                onOpenQuickLog();
                return;
              }
              onSelectTab(tab.id);
            }}
            className={`min-w-0 rounded-[20px] flex flex-col ${desktop ? 'px-1 py-3' : 'py-2.5'} items-center justify-center gap-1 transition-all active:scale-95 ${buttonClassName}`}
          >
            <div
              className={`flex items-center justify-center transition-all ${
                tab.isAction
                  ? desktop
                    ? 'h-10 w-10 rounded-[16px]'
                    : 'w-10 h-10 rounded-[16px]'
                  : desktop
                    ? 'h-9 w-9 rounded-[14px]'
                    : 'w-9 h-9 rounded-[16px]'
              }`}
            >
              <Icon className={`${tab.isAction ? (desktop ? 'h-9 w-9' : 'w-9 h-9') : (desktop ? 'h-[18px] w-[18px]' : 'w-4.5 h-4.5')}`} />
            </div>
            {/* Mobile only label */}
            {!desktop && (
              <span className="font-black uppercase tracking-tight text-center text-[7px]">{tab.label}</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const CoachDesktopHeader = ({ coachProfile, session, onOpenProfile, onLogout }) => (
  <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.04] bg-black/20 px-5 py-3 backdrop-blur-xl lg:px-6">
    <button
      type="button"
      onClick={onOpenProfile}
      className="flex items-center gap-3 cursor-pointer active:scale-95 transition-all"
    >
      {coachProfile?.avatar_url ? (
        <img src={coachProfile.avatar_url} className="w-9 h-9 rounded-full border border-white/10 object-cover" alt="avatar" />
      ) : (
        <div className="w-9 h-9 rounded-full border border-[rgba(200,245,63,0.3)] bg-[linear-gradient(135deg,rgba(200,245,63,0.22),rgba(96,180,255,0.22))] flex items-center justify-center font-bold text-[var(--app-accent)] text-sm">
          {coachProfile?.full_name?.charAt(0) || session?.user?.email?.charAt(0).toUpperCase() || 'C'}
        </div>
      )}
      <div>
        <p className="app-label text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Aesthetics Hub</p>
        <p className="text-[15px] font-semibold text-white leading-tight">
          {coachProfile?.full_name || session?.user?.user_metadata?.username || 'Coach'}
        </p>
      </div>
    </button>
    <div className="flex gap-2 items-center">
      <NotificationBell userId={session?.user?.id ?? null} />
      <button onClick={onLogout} className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-full text-[var(--app-danger)] active:scale-90 transition-all">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default function App() {
  const {
    session,
    userRole,
    coachProfile,
    clientProfile,
    isAuthLoading,
    login: handleLogin,
    logout: handleLogoutBase,
    refreshProfile: handleProfileUpdated,
  } = useAuth();

  const [routeContext, setRouteContext] = useState(() => (
    typeof window === 'undefined' ? 'main' : getRouteContextFromPath(window.location.pathname)
  ));

  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCoachProfile, setShowCoachProfile] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogSelection, setQuickLogSelection] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const coachTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'templates', label: 'Workout Templates', icon: Library },
    { id: 'quick_log', label: 'START WORKOUT', icon: StartWorkoutIcon, isAction: true },
    { id: 'clients', label: 'Trainees', icon: Users },
    { id: 'payments', label: 'Payments', icon: Wallet },
  ];

  const navigateToContext = useCallback((context, { isAuthenticated = false, replace = false } = {}) => {
    const nextPath = getPathForContext(context, isAuthenticated);

    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname || '/';
      if (currentPath !== nextPath) {
        window.history[replace ? 'replaceState' : 'pushState']({}, '', nextPath);
      }
    }

    setRouteContext(context);
  }, []);

  const handleLogout = useCallback(async () => {
    await handleLogoutBase();
    navigateToContext('main', { replace: true });
  }, [handleLogoutBase, navigateToContext]);

  useEffect(() => {
    const handlePopState = () => {
      setRouteContext(getRouteContextFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!session || !userRole || userRole === 'unknown') return;
    navigateToContext(userRole === 'client' ? 'client' : 'coach', { isAuthenticated: true, replace: true });
  }, [navigateToContext, session, userRole]);

  const fetchClients = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    const coachEmailVal = session.user?.email;
    const query = supabase.from('clients').select('*');
    if (coachEmailVal) query.eq('coach_email', coachEmailVal);
    const { data, error } = await query;
    if (error) { console.error('Error:', error.message); setIsLoading(false); return; }

    const clientList = data || [];
    const ids = clientList.map(c => c.id);

    // Fetch active packages
    let pkgMap = {};
    if (ids.length > 0) {
      const { data: pkgs } = await supabase
        .from('packages')
        .select('client_id, total_sessions, status')
        .in('client_id', ids)
        .eq('status', 'active');

      const { data: sessDone } = await supabase
        .from('sessions')
        .select('client_id')
        .in('client_id', ids)
        .eq('status', 'completed');

      const doneMap = {};
      (sessDone || []).forEach(s => { doneMap[s.client_id] = (doneMap[s.client_id] || 0) + 1; });

      (pkgs || []).forEach(p => {
        pkgMap[p.client_id] = {
          total: p.total_sessions,
          remaining: p.total_sessions - (doneMap[p.client_id] || 0),
          hasActive: true,
        };
      });
    }

    setClients(clientList.map(db => ({
      ...db,
      avatar: db.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name}&backgroundColor=eceff4`,
      package: pkgMap[db.id] || { total: 0, remaining: '--', hasActive: false },
    })));
    setIsLoading(false);
  }, [session]);

  const handleDeleteClient = async (clientId) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) {
      fetchClients();
      setSelectedClient(null);
    } else toast.error("Lỗi khi xóa: " + error.message);
  };

  const openQuickLog = (selection = null) => {
    setQuickLogSelection(normalizeQuickLogSelection(selection));
    setShowQuickLog(true);
  };

  const closeQuickLog = () => {
    setShowQuickLog(false);
    setQuickLogSelection(null);
  };

  useEffect(() => {
    if (!session) return;
    const timeoutId = window.setTimeout(() => {
      void fetchClients();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [session, activeTab, fetchClients]);

  // Loading screen khi Supabase đang restore session
  if (isAuthLoading || (session && !userRole)) {
    return (
      <div className="app-root-shell h-dvh flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/10 border-t-white/50 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="app-label text-[10px] font-black uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-root-shell min-h-screen flex justify-center px-0 font-sans sm:px-4 lg:px-6 lg:py-6">
        <div className="app-shell-frame relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden sm:max-w-[540px] lg:h-[min(920px,calc(100vh-3rem))] lg:max-w-[1180px] lg:rounded-[40px] lg:border lg:border-white/[0.08]">
          <GlobalStyles />
          {routeContext === 'coach-signup' ? (
            <AuthScreen
              onLogin={handleLogin}
              mode="coach-signup"
              onBack={() => navigateToContext('main')}
            />
          ) : (
            <AuthScreen
              onLogin={handleLogin}
              mode="main"
            />
          )}
        </div>
      </div>
    );
  }

  // ==== CLIENT PORTAL ====
  if (userRole === 'client') {
    return (
      <div className="app-root-shell min-h-screen flex justify-center px-0 font-sans sm:px-4 lg:px-6 lg:py-6">
        <div className="app-shell-frame relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden sm:max-w-[680px] lg:h-[min(920px,calc(100vh-3rem))] lg:max-w-[1280px] lg:rounded-[40px] lg:border lg:border-white/[0.08]">
          <GlobalStyles />
          <Suspense fallback={<ViewFallback />}>
          <ClientPortalApp
            session={session}
            clientProfile={clientProfile}
            onLogout={handleLogout}
          />
          </Suspense>
        </div>
      </div>
    );
  }

  // ==== UNKNOWN ROLE ====
  if (userRole === 'unknown') {
    return (
      <div className="app-root-shell h-dvh flex justify-center items-center px-6">
        <div className="text-center">
          <p className="app-subtle-text text-sm mb-4">Your account is not linked yet.</p>
          <p className="app-label text-xs mb-6">Please contact your coach for access.</p>
          <button
            onClick={handleLogout}
            className="app-ghost-button px-6 py-3 border rounded-full text-xs hover:bg-white/[0.08] transition-all"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root-shell min-h-screen flex justify-center px-0 font-sans sm:px-4 lg:px-4 lg:py-4">
      <div className="app-shell-frame relative flex h-dvh w-full max-w-[420px] flex-col overflow-hidden sm:max-w-[760px] lg:h-[min(960px,calc(100vh-2rem))] lg:max-w-none lg:w-full lg:flex-col lg:rounded-[36px] lg:border lg:border-white/[0.08]">
        <GlobalStyles />

        {showCoachProfile ? (
          <Suspense fallback={<ViewFallback />}>
            <CoachProfileView
              session={session}
              coachProfile={coachProfile}
              onBack={() => setShowCoachProfile(false)}
              onProfileUpdated={handleProfileUpdated}
            />
          </Suspense>
        ) : !selectedClient ? (
          <>
            {/* Persistent desktop header — always visible across all tabs */}
            <CoachDesktopHeader
              coachProfile={coachProfile}
              session={session}
              onOpenProfile={() => setShowCoachProfile(true)}
              onLogout={handleLogout}
            />

            <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-4 lg:p-4">
              <div className="relative flex min-h-0 flex-1 flex-col">
                <Suspense fallback={<ViewFallback />}>
                  {activeTab === 'home' && (
                    <DashboardView
                      session={session}
                      coachProfile={coachProfile}
                      refreshKey={refreshKey}
                      onSelectClient={setSelectedClient}
                      onOpenQuickLog={openQuickLog}
                      onLogout={handleLogout}
                      onOpenProfile={() => setShowCoachProfile(true)}
                    />
                  )}

                  {activeTab === 'clients' && (
                    <ClientListView
                      clients={clients}
                      isLoading={isLoading}
                      onSelectClient={setSelectedClient}
                      onOpenAdd={() => setActiveTab('add_client')}
                    />
                  )}

                  {activeTab === 'templates' && (
                    <WorkoutTemplateManager
                      session={session}
                    />
                  )}

                  {activeTab === 'payments' && (
                    <CoachPaymentsView
                      clients={clients}
                    />
                  )}

                  {activeTab === 'add_client' && (
                    <AddClientView
                      onBack={() => setActiveTab('clients')}
                      onSave={fetchClients}
                      coachEmail={session?.user?.email}
                    />
                  )}
                </Suspense>
              </div>

              {/* Desktop side nav (icon-only, 64px) */}
              <CoachNavigation
                coachTabs={coachTabs}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                onOpenQuickLog={openQuickLog}
                desktop
              />

              {/* Mobile bottom nav */}
              {activeTab !== 'add_client' && (
                <CoachNavigation
                  coachTabs={coachTabs}
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  onOpenQuickLog={openQuickLog}
                />
              )}
            </div>
          </>
        ) : (
          <Suspense fallback={<ViewFallback />}>
            <ClientDetailView
              client={selectedClient}
              onBack={() => setSelectedClient(null)}
              onDelete={handleDeleteClient}
              onOpenQuickLog={openQuickLog}
              refreshKey={refreshKey}
            />
          </Suspense>
        )}

        {showQuickLog && (
          <Suspense fallback={null}>
            <QuickLogSheet
              session={session}
              initialSelection={quickLogSelection}
              onClose={closeQuickLog}
              onSaved={() => setRefreshKey(k => k + 1)}
            />
          </Suspense>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
