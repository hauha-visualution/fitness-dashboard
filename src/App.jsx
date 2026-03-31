import React, { useState, useEffect } from 'react';
import { Home, Calendar, Users } from 'lucide-react';
import { supabase } from './supabaseClient';

// Import các thành phần chính
import AuthScreen from './components/Auth/AuthScreen';
import DashboardView from './components/Dashboard/DashboardView';
import ClientListView from './components/Client/ClientListView';
import AddClientView from './components/Client/AddClientView';
import CoachProfileView from './components/Dashboard/CoachProfileView';
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
    // Filter theo coach_email để mỗi coach chỉ thấy client của mình
    const coachEmailVal = session.user?.email;
    const query = supabase.from('clients').select('*');
    if (coachEmailVal) query.eq('coach_email', coachEmailVal);
    const { data, error } = await query;
    if (error) console.error('Error:', error.message);
    else if (data) {
      setClients(data.map(db => ({
        ...db,
        avatar: db.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name}&backgroundColor=eceff4`,
        package: {
          total: db.sessions ? parseInt(db.sessions) : 0,
          remaining: db.sessions ? parseInt(db.sessions) : '--'
        }
      })));
    }
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
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] max-w-[320px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1.5 flex justify-between z-50 shadow-2xl">
                <button onClick={() => setActiveTab('home')} className={`relative flex-1 py-4 rounded-[26px] flex justify-center items-center ${activeTab === 'home' ? 'text-white bg-white/5' : 'text-neutral-600'}`}><Home className="w-5 h-5" /></button>
                <button onClick={() => setActiveTab('calendar')} className={`relative flex-1 py-4 rounded-[26px] flex justify-center items-center ${activeTab === 'calendar' ? 'text-white bg-white/5' : 'text-neutral-600'}`}><Calendar className="w-5 h-5" /></button>
                <button onClick={() => setActiveTab('clients')} className={`relative flex-1 py-4 rounded-[26px] flex justify-center items-center ${activeTab === 'clients' ? 'text-white bg-white/5' : 'text-neutral-600'}`}><Users className="w-5 h-5" /></button>
              </div>
            )}
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
