import React, { useState, useEffect } from 'react';
import { Home, Calendar, MessageSquare, Users, ArrowLeft, MoreHorizontal, Award, BarChart3, Dumbbell, Utensils, CreditCard, Plus, CheckCircle2, X, LogOut } from 'lucide-react';
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
  // 1. Khởi tạo session từ localStorage nếu có
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('aesthetic_hub_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [clients, setClients] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  
  // State cho Workout Player
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeWorkoutGroup, setActiveWorkoutGroup] = useState(null);

  // 2. Hàm Login
  const handleLogin = (userData) => {
    setSession(userData);
    localStorage.setItem('aesthetic_hub_session', JSON.stringify(userData));
  };

  // 3. Hàm Logout
  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('aesthetic_hub_session');
  };

  // 4. Lấy danh sách học viên
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
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name}&backgroundColor=eceff4`,
        package: { 
          total: 12, 
          completed: 0, 
          remaining: parseInt(db.sessions) || 0 
        }
      })));
    }
    setIsLoading(false);
  };

  // 5. Xử lý Xóa học viên
  const handleDeleteClient = async (clientId) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      alert("Lỗi khi xóa: " + error.message);
    } else {
      fetchClients(); // Load lại danh sách sau khi xóa
    }
  };

  useEffect(() => { if (session) fetchClients(); }, [session, activeTab]);

  const handleFinishWorkout = async (timeInSeconds) => {
    const newRemaining = selectedClient.package.remaining - 1;
    const { error } = await supabase
      .from('clients')
      .update({ sessions: newRemaining.toString() })
      .eq('id', selectedClient.id);

    if (error) {
      alert("Lỗi khi trừ buổi tập: " + error.message);
    } else {
      alert(`Chúc mừng! Buổi tập kết thúc. Còn lại ${newRemaining} buổi.`);
      setIsPlayerOpen(false);
      fetchClients();
      setSelectedClient({
        ...selectedClient, 
        package: { ...selectedClient.package, remaining: newRemaining }
      });
    }
  };

  if (!session) return <div className="bg-black h-screen flex justify-center"><AuthScreen onLogin={handleLogin} /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 flex justify-center font-sans">
      <div className="w-full max-w-[420px] h-screen relative overflow-hidden bg-black flex flex-col border-x border-white/[0.05] shadow-2xl">
        <GlobalStyles />
        
        {!selectedClient ? (
          <>
            {activeTab === 'home' && <DashboardView onSelectClient={setSelectedClient} onLogout={handleLogout} />}
            
            {activeTab === 'clients' && (
              <ClientListView 
                clients={clients} 
                isLoading={isLoading} 
                onSelectClient={setSelectedClient} 
                onOpenAdd={() => setActiveTab('add_client')} 
                onDeleteClient={handleDeleteClient} // Truyền hàm xóa xuống
              />
            )}
            
            {activeTab === 'add_client' && <AddClientView onBack={() => setActiveTab('clients')} onSave={fetchClients} />}
            
            {/* Thanh điều hướng chính (Tối giản 3 nút chính) */}
            {activeTab !== 'add_client' && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] max-w-[320px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-1.5 flex justify-between z-50 shadow-2xl">
                <button onClick={() => setActiveTab('home')} className={`relative flex-1 py-4 rounded-[26px] flex justify-center items-center ${activeTab === 'home' ? 'text-white bg-white/5' : 'text-neutral-600'}`}>
                  <Home className="w-5 h-5" />
                </button>
                <button onClick={() => setActiveTab('calendar')} className={`relative flex-1 py-4 rounded-[26px] flex justify-center items-center ${activeTab === 'calendar' ? 'text-white bg-white/5' : 'text-neutral-600'}`}>
                  <Calendar className="w-5 h-5" />
                </button>
                <button onClick={() => setActiveTab('clients')} className={`relative flex-1 py-4 rounded-[26px] flex justify-center items-center ${activeTab === 'clients' ? 'text-white bg-white/5' : 'text-neutral-600'}`}>
                  <Users className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-screen bg-[#0a0a0a] animate-slide-up flex flex-col p-6 overflow-y-auto hide-scrollbar">
            <button onClick={() => setSelectedClient(null)} className="p-3 bg-white/5 border border-white/10 rounded-full w-fit mb-8"><ArrowLeft className="w-5 h-5"/></button>
            
            <div className="flex items-center gap-5 mb-10">
              <div className="relative">
                <img src={selectedClient.avatar} className="w-20 h-20 rounded-full border border-white/10 bg-white shadow-2xl" alt="avt" />
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1.5 border-2 border-black">
                  <Dumbbell className="w-3 h-3" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-medium tracking-tight text-white truncate">{selectedClient.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-blue-400 text-[10px] font-black uppercase">{selectedClient.goal}</span>
                  <span className="text-neutral-600 text-[10px]">•</span>
                  <span className="text-emerald-400 text-[10px] font-bold">{selectedClient.package.remaining} Buổi còn lại</span>
                </div>
              </div>
            </div>
            
            <div className="flex bg-white/[0.03] p-1 rounded-[20px] mb-8 border border-white/[0.05] shrink-0">
              {['overview', 'workout', 'inbody'].map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-[16px] transition-all ${detailTab === tab ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>{tab}</button>
              ))}
            </div>

            <div className="flex-1">
              {detailTab === 'overview' && <SummaryTab client={selectedClient} />}
              {detailTab === 'inbody' && <InBodyTab client={selectedClient} />}
              {detailTab === 'workout' && (
                <WorkoutTab 
                  clientId={selectedClient.id} 
                  onStartWorkout={(group) => {
                    setActiveWorkoutGroup(group);
                    setIsPlayerOpen(true);
                  }} 
                />
              )}
            </div>

            {isPlayerOpen && activeWorkoutGroup && (
              <WorkoutPlayer 
                sessionData={activeWorkoutGroup}
                client={selectedClient}
                onBack={() => setIsPlayerOpen(false)}
                onFinish={handleFinishWorkout}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}