import React, { useState, useEffect } from 'react';
import { 
  Home, Calendar, MessageSquare, Users, ArrowLeft, MoreHorizontal, 
  Award, BarChart3, Dumbbell, Utensils, CreditCard, Plus, 
  CheckCircle2, X, LogOut, Trash2, User, Package 
} from 'lucide-react';
import { supabase } from './supabaseClient'; 

// Import các thành phần đã tách
import AuthScreen from './components/Auth/AuthScreen';
import DashboardView from './components/Dashboard/DashboardView';
import ClientListView from './components/Client/ClientListView';
import AddClientView from './components/Client/AddClientView'; 
import SummaryTab from './components/Client/SummaryTab';
import InBodyTab from './components/Client/InBodyTab';
import WorkoutTab from './components/Client/WorkoutTab';
import WorkoutPlayer from './components/Client/WorkoutPlayer';
import CoachProfileView from './components/Dashboard/CoachProfileView';

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
  
  // DetailTab giờ sẽ theo 5 mục Hạo yêu cầu
  const [detailTab, setDetailTab] = useState('profile'); 
  
  const [clients, setClients] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeWorkoutGroup, setActiveWorkoutGroup] = useState(null);
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
        id: db.id,
        medical: db.medicalconditions || "Không có ghi chú y tế",
        avatar: db.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name}&backgroundColor=eceff4`,
        package: { 
          total: db.sessions ? parseInt(db.sessions) : 0, 
          completed: 0, 
          remaining: db.sessions ? parseInt(db.sessions) : '--' 
        }
      })));
    }
    setIsLoading(false);
  };

  const handleDeleteClient = async (clientId) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) fetchClients();
    else alert("Lỗi khi xóa: " + error.message);
  };

  useEffect(() => { if (session) fetchClients(); }, [session, activeTab]);

  const handleFinishWorkout = async (timeInSeconds) => {
    if (selectedClient.package.remaining === '--') return alert("Gói tập chưa kích hoạt!");
    const newRemaining = selectedClient.package.remaining - 1;
    const { error } = await supabase.from('clients').update({ sessions: newRemaining.toString() }).eq('id', selectedClient.id);
    if (!error) {
      alert(`Buổi tập kết thúc. Còn lại ${newRemaining} buổi.`);
      setIsPlayerOpen(false);
      fetchClients();
      setSelectedClient({ ...selectedClient, package: { ...selectedClient.package, remaining: newRemaining } });
    }
  };

  if (!session) return <div className="bg-black h-screen flex justify-center"><AuthScreen onLogin={handleLogin} /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 flex justify-center font-sans">
      <div className="w-full max-w-[420px] h-screen relative overflow-hidden bg-black flex flex-col border-x border-white/[0.05] shadow-2xl">
        <GlobalStyles />
        
        {showCoachProfile ? (
          <CoachProfileView session={session} onBack={() => setShowCoachProfile(false)} onUpdateSession={handleLogin} />
        ) : !selectedClient ? (
          <>
            {activeTab === 'home' && <DashboardView session={session} onSelectClient={setSelectedClient} onLogout={handleLogout} onOpenProfile={() => setShowCoachProfile(true)} />}
            {activeTab === 'clients' && <ClientListView clients={clients} isLoading={isLoading} onSelectClient={setSelectedClient} onOpenAdd={() => setActiveTab('add_client')} />}
            {activeTab === 'add_client' && <AddClientView onBack={() => setActiveTab('clients')} onSave={fetchClients} />}
            
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
          /* --- TRANG CHI TIẾT HỌC VIÊN VỚI BOTTOM NAV --- */
          <div className="h-screen bg-[#0a0a0a] animate-slide-up flex flex-col relative overflow-hidden">
            
            {/* Header Client Detail */}
            <div className="p-6 flex justify-between items-center shrink-0">
                <button onClick={() => { setSelectedClient(null); setDetailTab('profile'); }} className="p-3 bg-white/5 border border-white/10 rounded-full text-white"><ArrowLeft className="w-5 h-5"/></button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            if(window.confirm(`Xóa hồ sơ của ${selectedClient.name}?`)) {
                                const pass = prompt("Nhập mật khẩu PT:");
                                if(pass === (session.password || '123456')) {
                                    handleDeleteClient(selectedClient.id);
                                    setSelectedClient(null);
                                }
                            }
                        }}
                        className="p-3 bg-white/[0.03] border border-white/[0.08] rounded-full text-neutral-600 hover:text-red-500/80 transition-all"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-full text-neutral-600"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
            </div>
            
            {/* Mini Profile Info */}
            <div className="px-6 flex items-center gap-4 mb-6 shrink-0">
              <img src={selectedClient.avatar} className="w-14 h-14 rounded-full border border-white/10" alt="avt" />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-medium text-white truncate">{selectedClient.name}</h1>
                <p className="text-blue-400 text-[9px] font-black uppercase tracking-wider">{selectedClient.goal}</p>
              </div>
              {detailTab === 'profile' && (
                 <div className="text-right">
                    <p className="text-[8px] font-black text-neutral-500 uppercase">Status</p>
                    <span className={`text-[10px] font-bold ${selectedClient.package.remaining === '--' ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {selectedClient.package.remaining === '--' ? 'Inactive' : 'Active'}
                    </span>
                 </div>
              )}
            </div>

            {/* Nội dung thay đổi theo Tab */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 hide-scrollbar">
              {detailTab === 'profile' && (
                <div className="space-y-6">
                   <SummaryTab client={selectedClient} />
                   <InBodyTab client={selectedClient} /> {/* Lồng InBody vào Profile cho tiện theo dõi */}
                </div>
              )}
              {detailTab === 'package' && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20 italic text-xs uppercase font-black tracking-widest">
                  <Package className="w-12 h-12 mb-4" />
                  Gói tập chưa được thiết lập
                </div>
              )}
              {detailTab === 'sessions' && (
                <WorkoutTab clientId={selectedClient.id} onStartWorkout={(group) => { setActiveWorkoutGroup(group); setIsPlayerOpen(true); }} />
              )}
              {detailTab === 'nutrition' && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20 italic text-xs uppercase font-black tracking-widest">
                  <Utensils className="w-12 h-12 mb-4" />
                  Chế độ ăn đang cập nhật
                </div>
              )}
              {detailTab === 'payment' && (
                <div className="flex flex-col items-center justify-center py-20 opacity-20 italic text-xs uppercase font-black tracking-widest">
                  <CreditCard className="w-12 h-12 mb-4" />
                  Chưa có lịch sử thanh toán
                </div>
              )}
            </div>

            {/* CONTEXTUAL BOTTOM NAV (Dành riêng cho Client) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1.5 flex justify-between z-50 shadow-2xl">
                {[
                  { id: 'profile', icon: User, label: 'Profile' },
                  { id: 'package', icon: Package, label: 'Gói tập' },
                  { id: 'sessions', icon: Dumbbell, label: 'Sessions' },
                  { id: 'nutrition', icon: Utensils, label: 'Nutrition' },
                  { id: 'payment', icon: CreditCard, label: 'Payment' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDetailTab(t.id)}
                    className={`flex-1 py-4 rounded-[26px] flex flex-col items-center gap-1 transition-all ${
                        detailTab === t.id ? 'bg-white/5 text-white shadow-inner' : 'text-neutral-600'
                    }`}
                  >
                    <t.icon className={`w-5 h-5 ${detailTab === t.id ? 'text-white' : 'text-neutral-700'}`} />
                    <span className="text-[7px] font-black uppercase tracking-tighter">{t.label}</span>
                  </button>
                ))}
            </div>

            {isPlayerOpen && activeWorkoutGroup && (
              <WorkoutPlayer sessionData={activeWorkoutGroup} client={selectedClient} onBack={() => setIsPlayerOpen(false)} onFinish={handleFinishWorkout} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}