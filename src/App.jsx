import React, { useState, useEffect, useCallback } from 'react';
import { Home, Users, Library, PersonStanding, Wallet } from 'lucide-react';
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

export default function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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
    { id: 'quick_log', label: 'Start', icon: PersonStanding, isAction: true },
    { id: 'clients', label: 'Trainees', icon: Users },
    { id: 'payments', label: 'Payments', icon: Wallet },
  ];

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

  const handleLogin = (supabaseSession) => {
    setSession(supabaseSession);
    detectRole(supabaseSession);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCoachProfile(null);
    setClientProfile(null);
    setUserRole(null);
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
      <div className="bg-black h-dvh flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/10 border-t-white/50 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return <div className="bg-black h-dvh flex justify-center"><AuthScreen onLogin={handleLogin} /></div>;

  // ==== CLIENT PORTAL ====
  if (userRole === 'client') {
    return (
      <div className="min-h-screen bg-[#050505] text-neutral-200 flex justify-center font-sans">
        <div className="w-full max-w-[420px] h-dvh relative overflow-hidden bg-black flex flex-col border-x border-white/[0.05] shadow-2xl">
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
      <div className="bg-black h-dvh flex justify-center items-center px-6">
        <div className="text-center">
          <p className="text-neutral-400 text-sm mb-4">Your account is not linked yet.</p>
          <p className="text-neutral-600 text-xs mb-6">Please contact your coach for access.</p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-full text-white text-xs hover:bg-white/10 transition-all"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 flex justify-center font-sans">
      <div className="w-full max-w-[420px] h-dvh relative overflow-hidden bg-black flex flex-col border-x border-white/[0.05] shadow-2xl">
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
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[390px] bg-black/85 backdrop-blur-3xl border border-white/10 rounded-[32px] px-2 py-2 grid grid-cols-5 gap-1 z-50 shadow-2xl">
                {coachTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const buttonClassName = tab.isAction
                    ? 'bg-blue-500/[0.10] text-blue-300 border border-blue-400/20'
                    : isActive
                      ? 'bg-white/6 text-white'
                      : 'text-neutral-600 border border-transparent';

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
                            ? 'w-9 h-9 rounded-[16px]'
                            : 'w-9 h-9 rounded-[16px]'
                        }`}
                      >
                        <Icon className={`${tab.isAction ? 'w-5 h-5' : 'w-4.5 h-4.5'}`} />
                      </div>
                      <span
                        className={`font-black uppercase tracking-tight ${
                          tab.isAction
                            ? 'text-[7px] text-white'
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
