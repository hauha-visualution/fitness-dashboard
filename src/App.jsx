import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Dumbbell, Home, Library, ShieldCheck, UserCheck, Users, Wallet } from 'lucide-react';
import { supabase } from './supabaseClient';

// Import các thành phần chính
import AuthScreen from './components/Auth/AuthScreen';
import DashboardView from './components/Dashboard/DashboardView';
import ClientListView from './components/Client/ClientListView';
import AddClientView from './components/Client/AddClientView';
import CoachProfileView from './components/Dashboard/CoachProfileView';
import QuickLogSheet from './components/Dashboard/QuickLogSheet';
import ClientDetailView from './components/Client/ClientDetailView';
import ClientPortalApp from './components/ClientPortal/ClientPortalApp';
import WorkoutTemplateManager from './components/Dashboard/WorkoutTemplateManager';
import CoachPaymentsView from './components/Dashboard/CoachPaymentsView';

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

  if (normalizedPath === '/coach' || normalizedPath === '/coach/login') return 'coach';
  if (normalizedPath === '/portal' || normalizedPath === '/portal/login') return 'client';
  return 'landing';
};

const getPathForContext = (context, isAuthenticated = false) => {
  if (context === 'coach') return isAuthenticated ? '/coach' : '/coach/login';
  if (context === 'client') return isAuthenticated ? '/portal' : '/portal/login';
  return '/';
};

const AccessLandingScreen = ({ onChooseCoach, onChooseClient }) => (
  <div className="app-screen-shell h-dvh w-full flex flex-col justify-center relative z-20 overflow-hidden px-6">
    <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[400px] bg-white/[0.03] blur-[100px] pointer-events-none"></div>

    <div className="relative z-10 animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[linear-gradient(135deg,rgba(200,245,63,0.22),rgba(96,180,255,0.18))] border border-[rgba(200,245,63,0.3)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(200,245,63,0.08)]">
          <Dumbbell className="w-8 h-8 app-accent-text" />
        </div>
        <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">
          Choose your workspace
        </p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={onChooseCoach}
          className="w-full text-left app-glass-panel border rounded-[28px] p-5 active:scale-[0.99] transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-[18px] bg-[linear-gradient(135deg,rgba(200,245,63,0.18),rgba(120,240,160,0.08))] border border-[rgba(200,245,63,0.2)] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 app-accent-text" />
              </div>
              <div>
                <p className="text-white text-lg font-semibold">Coach Workspace</p>
                <p className="text-white/55 text-sm mt-1">Sign in to manage trainees, sessions, templates, and payments.</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/35 shrink-0 mt-1" />
          </div>
        </button>

        <button
          type="button"
          onClick={onChooseClient}
          className="w-full text-left app-glass-panel border rounded-[28px] p-5 active:scale-[0.99] transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-[18px] bg-[linear-gradient(135deg,rgba(96,180,255,0.18),rgba(120,160,255,0.08))] border border-[rgba(96,180,255,0.2)] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 app-blue-text" />
              </div>
              <div>
                <p className="text-white text-lg font-semibold">Trainee Portal</p>
                <p className="text-white/55 text-sm mt-1">Use the login link, phone number, and password your coach shared with you.</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/35 shrink-0 mt-1" />
          </div>
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [routeContext, setRouteContext] = useState(() => (
    typeof window === 'undefined' ? 'landing' : getRouteContextFromPath(window.location.pathname)
  ));

  // Role: 'coach' | 'client' | 'unknown' | null
  const [userRole, setUserRole] = useState(null);

  // Coach profile (từ bảng coaches)
  const [coachProfile, setCoachProfile] = useState(null);

  // Client profile (từ bảng clients, dùng cho client portal)
  const [clientProfile, setClientProfile] = useState(null);

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

  // ============================================================
  // Phát hiện role sau khi đăng nhập
  // ============================================================
  const detectRole = async (sess) => {
    if (!sess?.user) return;

    // 1. Kiểm tra bảng coaches
    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('email', sess.user.email)
      .maybeSingle();

    if (coach) {
      setCoachProfile(coach);
      setUserRole('coach');
      return;
    }

    // 2. Kiểm tra bảng clients (theo auth_user_id)
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', sess.user.id)
      .maybeSingle();

    if (client) {
      setClientProfile(client);
      setUserRole('client');
      return;
    }

    // 3. Lần đầu client đăng nhập → thử link bằng username từ metadata
    const metaUsername = sess.user.user_metadata?.username;
    if (metaUsername) {
      const { data: clientByUsername } = await supabase
        .from('clients')
        .select('*')
        .eq('username', metaUsername)
        .is('auth_user_id', null)
        .maybeSingle();

      if (clientByUsername) {
        // Gắn auth_user_id vào client record
        await supabase
          .from('clients')
          .update({ auth_user_id: sess.user.id })
          .eq('id', clientByUsername.id);

        setClientProfile({ ...clientByUsername, auth_user_id: sess.user.id });
        setUserRole('client');
        return;
      }
    }

    setUserRole('unknown');
  };

  // Lắng nghe auth state từ Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) detectRole(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) detectRole(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleLogin = (supabaseSession) => {
    setSession(supabaseSession);
    detectRole(supabaseSession);
  };

  const handleLogout = async () => {
    const logoutContext = userRole === 'client' ? 'client' : 'coach';
    await supabase.auth.signOut();
    setSession(null);
    setCoachProfile(null);
    setClientProfile(null);
    setUserRole(null);
    navigateToContext(logoutContext, { replace: true });
  };

  // Gọi lại sau khi CoachProfileView lưu thành công → refresh
  const handleProfileUpdated = () => {
    if (session) detectRole(session);
  };

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
    } else alert("Lỗi khi xóa: " + error.message);
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
      <div className="app-root-shell min-h-screen flex justify-center font-sans">
        <div className="app-shell-frame w-full max-w-[420px] h-dvh relative overflow-hidden flex flex-col">
          <GlobalStyles />
          {routeContext === 'coach' ? (
            <AuthScreen
              onLogin={handleLogin}
              mode="coach"
              onBack={() => navigateToContext('landing')}
            />
          ) : routeContext === 'client' ? (
            <AuthScreen
              onLogin={handleLogin}
              mode="client"
              onBack={() => navigateToContext('landing')}
            />
          ) : (
            <AccessLandingScreen
              onChooseCoach={() => navigateToContext('coach')}
              onChooseClient={() => navigateToContext('client')}
            />
          )}
        </div>
      </div>
    );
  }

  // ==== CLIENT PORTAL ====
  if (userRole === 'client') {
    return (
      <div className="app-root-shell min-h-screen flex justify-center font-sans">
        <div className="app-shell-frame w-full max-w-[420px] h-dvh relative overflow-hidden flex flex-col">
          <GlobalStyles />
          <ClientPortalApp
            session={session}
            clientProfile={clientProfile}
            onLogout={handleLogout}
          />
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
    <div className="app-root-shell min-h-screen flex justify-center font-sans">
      <div className="app-shell-frame w-full max-w-[420px] h-dvh relative overflow-hidden flex flex-col">
        <GlobalStyles />

        {showCoachProfile ? (
          <CoachProfileView
            session={session}
            coachProfile={coachProfile}
            onBack={() => setShowCoachProfile(false)}
            onProfileUpdated={handleProfileUpdated}
          />
        ) : !selectedClient ? (
          <>
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
            {/* Removed CalendarView */}

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

            {/* Nav chính của Coach */}
            {activeTab !== 'add_client' && (
              <div className="app-nav-shell fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[390px] rounded-[32px] px-2 py-2 grid grid-cols-5 gap-1 z-50">
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
                      onClick={() => {
                        if (tab.isAction) {
                          openQuickLog();
                          return;
                        }
                        setActiveTab(tab.id);
                      }}
                      className={`min-w-0 rounded-[24px] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        tab.isAction
                          ? 'py-3.5'
                          : 'py-3.5'
                      } ${buttonClassName}`}
                    >
                      <div
                        className={`flex items-center justify-center transition-all ${
                          tab.isAction
                            ? 'w-10 h-10 rounded-[16px]'
                            : 'w-9 h-9 rounded-[16px]'
                        }`}
                      >
                        <Icon className={`${tab.isAction ? 'w-9 h-9' : 'w-4.5 h-4.5'}`} />
                      </div>
                      <span
                        className={`font-black uppercase tracking-tight text-center ${
                          tab.isAction
                            ? 'max-w-[64px] text-[6px] leading-[1.15]'
                            : 'text-[7px]'
                        }`}
                      >
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

          </>
        ) : (
          <ClientDetailView
            client={selectedClient}
            onBack={() => setSelectedClient(null)}
            onDelete={handleDeleteClient}
            onOpenQuickLog={openQuickLog}
            refreshKey={refreshKey}
          />
        )}

        {showQuickLog && (
          <QuickLogSheet
            session={session}
            initialSelection={quickLogSelection}
            onClose={closeQuickLog}
            onSaved={() => setRefreshKey(k => k + 1)}
          />
        )}
      </div>
    </div>
  );
}
