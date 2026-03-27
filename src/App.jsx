import React, { useState, useEffect } from 'react';
import { 
  Users, Dumbbell, Utensils, CreditCard, Home, 
  ChevronRight, ChevronLeft, Bell, Plus, Search, Calendar, 
  TrendingUp, Activity, ArrowLeft, MoreHorizontal, MessageSquare,
  AlertCircle, Coffee, CheckCircle2, Circle, Droplets, Target, Flame, 
  Clock, Camera, History, ChevronDown, Award, BarChart3, Scale, Percent, X,
  Lock, User, UserPlus, FileText, ActivitySquare, HeartPulse, RefreshCw, Phone
} from 'lucide-react';
import { supabase } from './supabaseClient'; 

// --- STYLES & ANIMATIONS ---
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes pulse-glow {
      0%, 100% { border-color: rgba(255, 255, 255, 0.05); box-shadow: 0 0 0px rgba(255, 255, 255, 0); }
      50% { border-color: rgba(255, 255, 255, 0.2); box-shadow: 0 0 15px rgba(255, 255, 255, 0.1); }
    }
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-glow-pulse { animation: pulse-glow 2s infinite ease-in-out; }
    .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}} />
);

// --- GIAO DIỆN ĐĂNG NHẬP ---
const AuthScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onLogin({ username }); };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center relative z-20 bg-[#0a0a0a] overflow-hidden px-6">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[400px] bg-white/[0.03] blur-[100px] pointer-events-none"></div>
      <div className="w-full max-w-sm relative z-10 animate-slide-up text-center">
        <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4"><Dumbbell className="w-8 h-8 text-white" /></div>
        <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 mt-8 space-y-4">
          <input type="text" placeholder="Username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 px-4 text-white text-sm outline-none" />
          <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 px-4 text-white text-sm outline-none" />
          <button onClick={handleSubmit} className="w-full bg-white text-black font-bold py-4 rounded-[20px] hover:bg-neutral-200 active:scale-[0.98] transition-all">Sign In</button>
        </div>
      </div>
    </div>
  );
};

// --- MÀN HÌNH THÊM HỌC VIÊN (ĐÃ THÊM CÂN NẶNG & FIX TÊN CỘT) ---
const AddClientView = ({ onBack, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'Nam', phone: '', height: '', weight: '', trainingHistory: '', goal: '', commitment: 'Sẵn sàng tuân thủ meal plan',
    jobType: '', trainingTime: '', targetDuration: '', sleep: '',
    cookHabit: '', cookTime: '', diet: '', favFood: '', avoidFood: '', budget: '',
    medical: '', supplements: ''
  });

  const [expandedSection, setExpandedSection] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const toggleSection = (sectionName) => setExpandedSection(expandedSection === sectionName ? null : sectionName);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSyncAPI = async () => {
    if (!formData.phone) { alert("Vui lòng nhập SĐT!"); return; }
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('survey_responses').select('*').eq('phone', formData.phone).maybeSingle();
      if (data) {
        setFormData({
          ...formData,
          name: data.name || '', dob: data.dob || '', gender: data.gender || 'Nam', phone: data.phone,
          height: data.height || '', weight: data.weight || '', 
          trainingHistory: data.traininghistory || '', goal: data.goal || '',
          commitment: data.commitmentlevel || 'Sẵn sàng tuân thủ meal plan',
          jobType: data.jobtype || '', trainingTime: data.trainingtime || '',
          targetDuration: data.targetduration || '', sleep: data.sleephabits || '',
          cookHabit: data.cookinghabit || '', cookTime: data.cookingtime || '',
          diet: data.dietaryrestriction || '', favFood: data.favoritefoods || '',
          avoidFood: data.avoidfoods || '', budget: data.foodbudget || '',
          medical: data.medicalconditions || '', supplements: data.supplements || ''
        });
        alert("Đã quét thành công!");
      } else { alert("Không tìm thấy dữ liệu form!"); }
    } catch (e) { alert("Lỗi kết nối!"); }
    setIsSyncing(false);
  };

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] overflow-y-auto px-6 animate-slide-up hide-scrollbar">
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black text-white/40 uppercase">Onboarding Form</h2>
         <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 transition-all ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 relative z-10 pb-12 pt-4 space-y-4">
        <h1 className="text-3xl font-medium text-white tracking-tight">New Client Profile</h1>

        {/* SECTION 1: BẮT BUỘC */}
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-4">
          <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">1. Thông tin bắt buộc (*)</h3></div>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="SĐT Liên lạc *" className="w-full bg-black/80 border border-blue-500/30 rounded-[12px] p-3 text-white text-sm" />
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và Tên *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm" />
            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm"><option>Nam</option><option>Nữ</option><option>Khác</option></select>
          </div>
          {/* HÀNG CHIỀU CAO & CÂN NẶNG */}
          <div className="grid grid-cols-2 gap-3">
            <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Chiều cao (cm) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
            <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="Cân nặng (kg) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
          </div>
          <input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="Mục tiêu chính *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
          <textarea name="trainingHistory" value={formData.trainingHistory} onChange={handleChange} rows="2" placeholder="Lịch sử tập luyện? *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm resize-none"></textarea>
          <select name="commitment" value={formData.commitment} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm"><option>Sẵn sàng tuân thủ meal plan *</option><option>Có thể tuân thủ phần lớn</option><option>Hơi khó</option></select>
        </div>

        {/* SECTION 2: SINH HOẠT */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('goals')} className="p-5 flex justify-between items-center cursor-pointer"><div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><h3 className="text-white text-sm font-medium">2. Sinh hoạt & Chế độ</h3></div><ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'goals' ? 'rotate-180' : ''}`} /></div>
          {expandedSection === 'goals' && (
            <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4">
              <input type="text" name="jobType" value={formData.jobType} onChange={handleChange} placeholder="Tính chất công việc" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
              <input type="text" name="trainingTime" value={formData.trainingTime} onChange={handleChange} placeholder="Thời gian tập/ngày" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
              <input type="text" name="sleep" value={formData.sleep} onChange={handleChange} placeholder="Giấc ngủ mỗi tối" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
            </div>
          )}
        </div>

        {/* SECTION 3: DINH DƯỠNG */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('nutrition')} className="p-5 flex justify-between items-center cursor-pointer"><div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /><h3 className="text-white text-sm font-medium">3. Dinh dưỡng & Bếp núc</h3></div><ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'nutrition' ? 'rotate-180' : ''}`} /></div>
          {expandedSection === 'nutrition' && (
            <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4">
              <input type="text" name="cookHabit" value={formData.cookHabit} onChange={handleChange} placeholder="Thói quen ăn uống" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
              <input type="text" name="favFood" value={formData.favFood} onChange={handleChange} placeholder="Thực phẩm yêu thích" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
              <input type="text" name="avoidFood" value={formData.avoidFood} onChange={handleChange} placeholder="Dị ứng / Cần tránh" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" />
            </div>
          )}
        </div>

        <button onClick={() => onSave(formData)} disabled={isSaving} className={`w-full text-black font-bold py-4 rounded-[20px] transition-all flex items-center justify-center gap-2 mt-4 ${isSaving ? 'bg-neutral-400' : 'bg-white shadow-xl hover:scale-[1.02]'}`}>
          {isSaving ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />} {isSaving ? 'Đang lưu...' : 'Lưu Hồ Sơ Khách Hàng'}
        </button>
      </div>
    </div>
  );
};

// --- GIAO DIỆN DANH SÁCH ---
const ClientListView = ({ clients, onSelectClient, onOpenAdd, isLoading }) => (
  <div className="h-screen flex flex-col bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000] px-6 py-8 pb-32 overflow-y-auto hide-scrollbar">
    <div className="flex justify-between items-center mb-8 shrink-0">
       <div><h1 className="text-2xl font-medium text-white tracking-tight">Client Pool</h1><p className="text-neutral-500 text-[10px] font-black uppercase">Total: {clients.length}</p></div>
       <button onClick={onOpenAdd} className="p-3 bg-white text-black rounded-full shadow-lg"><UserPlus className="w-5 h-5" /></button>
    </div>
    {isLoading ? <div className="text-center mt-20 text-neutral-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div> : 
    <div className="space-y-4">
      {clients.map(c => (
        <div key={c.id} onClick={() => onSelectClient(c)} className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.05]">
           <img src={c.avatar} className="w-12 h-12 rounded-full bg-white" alt="avt" />
           <div className="flex-1 min-w-0"><h3 className="text-white font-medium text-sm">{c.name}</h3><p className="text-blue-400 text-[10px] font-bold uppercase">{c.goal}</p></div>
           <ChevronRight className="w-4 h-4 text-neutral-600" />
        </div>
      ))}
    </div>}
  </div>
);

// --- COMPONENT CHÍNH ---
export default function App() {
  const [session, setSession] = useState(null); 
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('clients').select('*');
    if (data) {
      setClients(data.map(db => ({
        id: db.id, name: db.name, phone: db.phone, goal: db.goal,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name}`,
        height: db.height, weight: db.weight
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => { if (session) fetchClients(); }, [session, activeTab]);

  const handleAddClient = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.from('clients').insert([{
        name: formData.name, phone: formData.phone, dob: formData.dob, gender: formData.gender, 
        height: formData.height, weight: formData.weight, traininghistory: formData.trainingHistory,
        goal: formData.goal, commitmentlevel: formData.commitment, jobtype: formData.jobType, 
        trainingtime: formData.trainingTime, targetduration: formData.targetDuration,
        sleephabits: formData.sleep, cookinghabit: formData.cookHabit, 
        cookingtime: formData.cookTime, dietaryrestriction: formData.diet,
        favoritefoods: formData.favFood, avoidfoods: formData.avoidFood,
        foodbudget: formData.budget, medicalconditions: formData.medical,
        supplements: formData.supplements, sessions: '12'
    }]);
    setIsSaving(false);
    if (!error) { fetchClients(); setActiveTab('clients'); } else { alert(error.message); }
  };

  if (!session) return <div className="h-screen bg-black flex justify-center"><div className="w-full max-w-[420px]"><AuthScreen onLogin={setSession} /></div></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 flex justify-center">
      <div className="w-full max-w-[420px] h-screen relative overflow-hidden bg-black flex flex-col">
        <GlobalStyles />
        {!selectedClient ? (
          <>
            {activeTab === 'home' && <div className="p-8 text-center text-neutral-500 mt-20">Dashboard Overview</div>}
            {activeTab === 'clients' && <ClientListView clients={clients} isLoading={isLoading} onSelectClient={setSelectedClient} onOpenAdd={() => setActiveTab('add_client')} />}
            {activeTab === 'add_client' && <AddClientView onBack={() => setActiveTab('clients')} onSave={handleAddClient} isSaving={isSaving} />}
            {activeTab !== 'add_client' && <FloatingBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
          </>
        ) : (
          <div className="p-10"><button onClick={() => setSelectedClient(null)}>Back</button><h1 className="text-3xl mt-6">{selectedClient.name}</h1><p>{selectedClient.goal}</p></div>
        )}
      </div>
    </div>
  );
}

const FloatingBottomNav = ({ activeTab, setActiveTab }) => (
  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 flex justify-between z-50">
      <button onClick={() => setActiveTab('home')} className={`p-4 rounded-full ${activeTab === 'home' ? 'bg-white/10 text-white' : 'text-neutral-600'}`}><Home /></button>
      <button onClick={() => setActiveTab('clients')} className={`p-4 rounded-full ${activeTab === 'clients' ? 'bg-white/10 text-white' : 'text-neutral-600'}`}><Users /></button>
  </div>
);