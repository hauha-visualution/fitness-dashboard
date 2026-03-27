import React, { useState, useEffect } from 'react';
import { Home, Calendar, Users } from 'lucide-react';
import { supabase } from './supabaseClient'; 

// Import các thành phần chính
import AuthScreen from './components/Auth/AuthScreen';
import DashboardView from './components/Dashboard/DashboardView';
import ClientListView from './components/Client/ClientListView';
import AddClientView from './components/Client/AddClientView'; 
import CoachProfileView from './components/Dashboard/CoachProfileView';
import ClientDetailView from './components/Client/ClientDetailView'; // <-- ĐÃ THÊM DÒNG NÀY

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
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('aesthetic_hub_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [showCoachProfile, setShowCoachProfile] = useState(false);

  const handleLogin = (userData) => {
    setSession(userData);
    localStorage.setItem('aesthetic_hub_session', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('aesthetic_hub_session');
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

  if (!session) return <div className="bg-black h-screen flex justify-center"><AuthScreen onLogin={handleLogin} /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 flex justify-center font-sans">
      <div className="w-full max-w-[420px] h-screen relative overflow-hidden bg-black flex flex-col border-x border-white/[0.05] shadow-2xl">
        <GlobalStyles />
        
        {showCoachProfile ? (
          <CoachProfileView 
            session={session} 
            onBack={() => setShowCoachProfile(false)} 
            onUpdateSession={handleLogin} 
          />
        ) : !selectedClient ? (
          <>
            {activeTab === 'home' && (
              <DashboardView 
                session={session} 
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
          /* --- DÙNG COMPONENT MỚI Ở ĐÂY --- */
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