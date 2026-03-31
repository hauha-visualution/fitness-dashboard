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

  // State riêng cho thông tin coach (avatar, full_name, dob...)
  // Tách khỏi session để không phụ thuộc vào cấu trúc Supabase session object
  const [coachProfile, setCoachProfile] = useState(null);

  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCoachProfile, setShowCoachProfile] = useState(false);

  // Fetch coach profile từ bảng coaches (sau khi có session)
  const fetchCoachProfile = async (sess) => {
    if (!sess?.user?.email) return;
    const { data } = await supabase
      .from('coaches')
      .select('*')
      .eq('email', sess.user.email)
      .maybeSingle();
    if (data) setCoachProfile(data);
  };

  // Lắng nghe auth state từ Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchCoachProfile(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchCoachProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (supabaseSession) => {
    setSession(supabaseSession);
    fetchCoachProfile(supabaseSession);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCoachProfile(null);
  };

  // Gọi lại sau khi CoachProfileView lưu thành công → refresh avatar/name
  const handleProfileUpdated = () => {
    fetchCoachProfile(session);
  };

  const fetchClients = async () => {
    if (!session) return;
    setIsLoading(true);
    const { data, error } = await supabase.from('clients').select('*');
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
  if (isAuthLoading) {
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
