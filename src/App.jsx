import React, { useState, useEffect } from 'react';
import { Home, Users, Plus } from 'lucide-react';
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

// --- STYLES ---
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}} />
);

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

  const handleLogin = (supabaseSession, roleHint) => {
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

  const fetchClients = async () => {
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
        .eq('status', 'done');

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
  };

  const handleDeleteClient = async (clientId) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) {
      fetchClients();
      setSelectedClient(null);
    } else alert("Lỗi khi xóa: " + error.message);
  };

  useEffect(() => { if (session) fetchClients(); }, [session, activeTab]);

  // Loading screen khi Supabase đang restore session
  if (isAuthLoading || (session && !userRole)) {
    return (
      <div className="bg-black h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/10 border-t-white/50 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 text-[10px] font-black uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return <div className="bg-black h-screen flex justify-center"><AuthScreen onLogin={handleLogin} /></div>;

  // ==== CLIENT PORTAL ====
  if (userRole === 'client') {
    return (
      <div className="min-h-screen bg-[#050505] text-neutral-200 flex justify-center font-sans">
        <div className="w-full max-w-[420px] h-screen relative overflow-hidden bg-black flex flex-col border-x border-white/[0.05] shadow-2xl">
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
      <div className="bg-black h-screen flex justify-center items-center px-6">
        <div className="text-center">
          <p className="text-neutral-400 text-sm mb-4">Tài khoản chưa được liên kết.</p>
          <p className="text-neutral-600 text-xs mb-6">Liên hệ coach của bạn để được cấp quyền truy cập.</p>
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
      <div className="w-full max-w-[420px] h-screen relative overflow-hidden bg-black flex flex-col border-x border-white/[0.05] shadow-2xl">
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
                onSelectClient={setSelectedClient}
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

            {activeTab === 'add_client' && (
              <AddClientView
                onBack={() => setActiveTab('clients')}
                onSave={fetchClients}
                coachEmail={session?.user?.email}
              />
            )}

            {/* Nav chính của Coach */}
            {activeTab !== 'add_client' && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[320px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1.5 flex justify-between z-50 shadow-2xl">
                {/* Home Tab */}
                <button onClick={() => setActiveTab('home')} className={`flex-1 py-4 rounded-[26px] flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'home' ? 'bg-white/5 text-white' : 'text-neutral-600 scale-90 opacity-50'}`}>
                  <Home className="w-5 h-5" />
                  <span className="text-[7px] font-black uppercase tracking-tighter">Home</span>
                </button>
                
                {/* FAB - Quick Log */}
                <div className="flex justify-center items-center w-[80px]">
                  <button onClick={() => setShowQuickLog(true)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center -mt-4 active:scale-90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    <Plus className="w-5 h-5 text-black" />
                  </button>
                </div>
                
                {/* Members Tab */}
                <button onClick={() => setActiveTab('clients')} className={`flex-1 py-4 rounded-[26px] flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'clients' ? 'bg-white/5 text-white' : 'text-neutral-600 scale-90 opacity-50'}`}>
                  <Users className="w-5 h-5" />
                  <span className="text-[7px] font-black uppercase tracking-tighter">Members</span>
                </button>
              </div>
            )}

            {/* Quick Log Sheet Overlay */}
            {showQuickLog && <QuickLogSheet onClose={() => setShowQuickLog(false)} />}
          </>
        ) : (
          <ClientDetailView
            client={selectedClient}
            onBack={() => setSelectedClient(null)}
            onDelete={handleDeleteClient}
          />
        )}
      </div>
    </div>
  );
}
