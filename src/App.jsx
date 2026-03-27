import React, { useState, useEffect } from 'react';
import { 
  Users, Dumbbell, Utensils, CreditCard, Home, 
  ChevronRight, ChevronLeft, Bell, Plus, Search, Calendar, 
  TrendingUp, Activity, ArrowLeft, MoreHorizontal, MessageSquare,
  AlertCircle, Coffee, CheckCircle2, Circle, Droplets, Target, Flame, 
  Clock, Camera, History, ChevronDown, Award, BarChart3, Scale, Percent, X,
  Lock, User, UserPlus, FileText, ActivitySquare, HeartPulse, RefreshCw, Phone,
  Play, Pause, Flag
} from 'lucide-react';
import { supabase } from './supabaseClient'; 

// --- 1. GLOBAL STYLES ---
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes pulse-glow {
      0%, 100% { border-color: rgba(255, 255, 255, 0.05); box-shadow: 0 0 0px rgba(255, 255, 255, 0); }
      50% { border-color: rgba(255, 255, 255, 0.2); box-shadow: 0 0 15px rgba(255, 255, 255, 0.1); }
    }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .animate-glow-pulse { animation: pulse-glow 2s infinite ease-in-out; }
    .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
  `}} />
);

// --- 2. AUTH SCREEN (GIỮ NGUYÊN LOGIC LOGIN/SIGNUP) ---
const AuthScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center relative z-20 bg-[#0a0a0a] overflow-hidden px-6">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[400px] bg-white/[0.03] blur-[100px] pointer-events-none"></div>
      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl"><Dumbbell className="w-8 h-8 text-white" /></div>
          <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">Coach Portal Access</p>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
          <div className="flex bg-white/[0.03] p-1 rounded-[20px] mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>Sign In</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${!isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>Sign Up</button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onLogin({ username }); }} className="space-y-4">
            <div className="relative"><User className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-all" /></div>
            <div className="relative"><Lock className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" /><input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-all" /></div>
            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-[20px] mt-2 flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-lg">{isLogin ? 'Access Portal' : 'Create Account'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- 3. WORKOUT PLAYER (GIAO DIỆN PHÒNG TẬP) ---
const WorkoutPlayer = ({ sessionData, onFinish, onBack }) => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [exercises, setExercises] = useState([
    { id: 1, name: 'Bench Press', sets: 4, weight: '60kg', done: false },
    { id: 2, name: 'Incline Dumbbell Fly', sets: 3, weight: '15kg', done: false },
    { id: 3, name: 'Push Up', sets: 3, weight: 'BW', done: false },
  ]);

  useEffect(() => {
    let interval = null;
    if (isActive) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(interval);
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (ts) => {
    const m = Math.floor(ts / 60); const s = ts % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-slide-up">
      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-black/50 backdrop-blur-md">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5"/></button>
        <div className="text-center">
          <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Active Session - {sessionData.group_name}</p>
          <h2 className="text-2xl font-mono text-white tracking-tighter">{formatTime(seconds)}</h2>
        </div>
        <button onClick={() => setIsActive(!isActive)} className={`p-3 rounded-full transition-all ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
          {isActive ? <Pause className="w-5 h-5 fill-current"/> : <Play className="w-5 h-5 fill-current"/>}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
        {exercises.map((ex) => (
          <div key={ex.id} onClick={() => setExercises(exercises.map(e => e.id === ex.id ? {...e, done: !e.done} : e))} className={`p-5 rounded-[24px] border transition-all flex items-center gap-4 ${ex.done ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60' : 'bg-white/[0.03] border-white/5'}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${ex.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>{ex.done && <CheckCircle2 className="w-4 h-4 text-black stroke-[3]"/>}</div>
            <div className="flex-1"><h4 className={`text-sm font-medium ${ex.done ? 'text-neutral-500 line-through' : 'text-white'}`}>{ex.name}</h4><p className="text-[10px] text-neutral-500 font-bold mt-1 uppercase">{ex.sets} Sets • {ex.weight}</p></div>
          </div>
        ))}
      </div>
      <div className="p-6 bg-gradient-to-t from-black via-black to-transparent">
        <button onClick={() => onFinish(seconds)} className="w-full bg-white text-black font-black py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all"><Flag className="w-5 h-5 fill-current"/> FINISH & DEDUCT SESSION</button>
      </div>
    </div>
  );
};

// --- 4. MÀN HÌNH THÊM HỌC VIÊN (BẢN FULL OPTIMIZED VỚI SYNC) ---
const AddClientView = ({ onBack, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'Nam', phone: '', height: '', weight: '', traininghistory: '', goal: '', commitmentlevel: 'Sẵn sàng tuân thủ meal plan',
    jobtype: '', trainingtime: '', targetduration: '', sleephabits: '', cookinghabit: '', cookingtime: '', dietaryrestriction: '', favoritefoods: '', avoidfoods: '', foodbudget: '', medicalconditions: '', supplements: ''
  });
  const [expandedSection, setExpandedSection] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAPI = async () => {
    if (!formData.phone) { alert("Nhập SĐT trước!"); return; }
    setIsSyncing(true);
    try {
      const { data } = await supabase.from('survey_responses').select('*').eq('phone', formData.phone).maybeSingle();
      if (data) {
        setFormData({ ...data }); alert("Đã quét thành công!");
      } else alert("Không thấy dữ liệu form!");
    } catch (e) { alert("Lỗi kết nối!"); }
    setIsSyncing(false);
  };

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] overflow-y-auto px-6 animate-slide-up hide-scrollbar">
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white shadow-md"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Onboarding Form</h2>
         <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 shadow-md ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 relative z-10 pb-12 pt-4 space-y-6">
        <h1 className="text-3xl font-medium text-white tracking-tight">New Client Profile</h1>
        <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-4">
          <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">1. Thông tin bắt buộc (*)</h3></div>
          <input type="tel" placeholder="SĐT Liên lạc *" value={formData.phone} onChange={(e)=>setFormData({...formData, phone:e.target.value})} className="w-full bg-black/80 border border-blue-500/30 rounded-[12px] p-3 text-white text-sm outline-none focus:border-blue-500" />
          <input type="text" placeholder="Họ và Tên *" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
          <div className="grid grid-cols-2 gap-3">
             <input type="text" placeholder="Cao (cm) *" value={formData.height} onChange={(e)=>setFormData({...formData, height:e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
             <input type="text" placeholder="Nặng (kg) *" value={formData.weight} onChange={(e)=>setFormData({...formData, weight:e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
          </div>
          <input type="text" placeholder="Mục tiêu *" value={formData.goal} onChange={(e)=>setFormData({...formData, goal:e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
        </div>
        <button onClick={() => onSave(formData)} disabled={isSaving} className={`w-full text-black font-bold py-4 rounded-[20px] transition-all flex items-center justify-center gap-2 shadow-2xl ${isSaving ? 'bg-neutral-400' : 'bg-white hover:scale-[1.02]'}`}>
          {isSaving ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />} {isSaving ? 'Đang lưu...' : 'Lưu Hồ Sơ Khách Hàng'}
        </button>
      </div>
    </div>
  );
};

// --- 5. DASHBOARD VIEW (DẢI LỊCH GỐC) ---
const DashboardView = ({ onSelectClient }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000]">
      <div className="flex justify-between items-center p-6 shrink-0">
        <div className="flex items-center gap-4"><img src="https://i.pravatar.cc/150?u=coach" className="w-12 h-12 rounded-full border border-white/10" /><div><p className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">Aesthetics Hub</p><h1 className="text-xl font-medium text-white tracking-tight">Coach Hoang</h1></div></div>
        <button className="p-3 bg-black border border-white/10 rounded-full text-white shadow-lg"><Bell className="w-5 h-5" /></button>
      </div>
      <div className="px-6 mb-8 shrink-0">
        <div className="flex justify-between items-center mb-5"><h2 className="text-2xl font-light text-white tracking-tight">{viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2><div className="flex gap-2"><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()-1)))} className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4 text-white"/></button><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()+1)))} className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4 text-white"/></button></div></div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth">
          {days.map(dateObj => (
            <button key={dateObj.toISOString()} onClick={() => setSelectedDate(dateObj)} className={`flex flex-col items-center justify-center min-w-[58px] h-[84px] rounded-[22px] border transition-all shrink-0 ${dateObj.toDateString() === selectedDate.toDateString() ? 'bg-black border-white/20 shadow-2xl' : 'bg-white/[0.03] border-white/[0.05] text-neutral-600'}`}>
              <span className="text-[10px] font-bold uppercase mb-1">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="text-lg font-semibold">{dateObj.getDate()}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-32 hide-scrollbar"><div className="text-center text-neutral-500 text-[10px] uppercase font-black tracking-widest mt-10">No sessions scheduled</div></div>
    </div>
  );
}

// --- 6. CLIENT LIST VIEW ---
const ClientListView = ({ clients, onSelectClient, onOpenAdd, isLoading }) => (
  <div className="h-screen flex flex-col bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000] px-6 py-8 pb-32 overflow-y-auto hide-scrollbar">
    <div className="flex justify-between items-center mb-8 shrink-0">
       <div><h1 className="text-2xl font-medium text-white tracking-tight">Client Pool</h1><p className="text-neutral-500 text-[10px] font-black uppercase">Total: {clients.length} Active</p></div>
       <button onClick={onOpenAdd} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"><UserPlus className="w-5 h-5" /></button>
    </div>
    {isLoading ? <div className="text-center mt-20 text-neutral-500 animate-pulse"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div> : (
      <div className="space-y-4">
        {clients.map(c => (
          <div key={c.id} onClick={() => onSelectClient(c)} className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-all active:scale-[0.98]">
             <img src={c.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-white" alt="avt" />
             <div className="flex-1 min-w-0"><h3 className="text-white font-medium text-sm truncate">{c.name}</h3><p className="text-blue-400 text-[10px] font-bold uppercase truncate mt-0.5">{c.goal}</p></div>
             <div className="text-right mr-3"><p className="text-[10px] font-black text-neutral-500 uppercase">KG</p><p className="text-xs font-bold text-white">{c.weight || '--'}</p></div>
             <ChevronRight className="w-4 h-4 text-neutral-600" />
          </div>
        ))}
      </div>
    )}
  </div>
);

// --- 7. CLIENT DETAIL VIEW (4 TABS) ---
const ClientDetailView = ({ client, onBack, activeTab, setActiveTab, onRecordWorkout }) => {
  const inbodyData = {
    initial: { weight: client.weight || 79, smm: 19.3, pbf: 37.5, vfat: 13 },
    current: { weight: 72.4, smm: 21.2, pbf: 28.5, vfat: 8 }
  };

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] animate-slide-up overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-[350px] bg-gradient-to-b from-[#2a2a2c]/40 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none"></div>
      <div className="flex justify-between items-center p-6 shrink-0 relative z-50">
        <button onClick={onBack} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10"><ArrowLeft className="w-5 h-5" /></button>
        <div className="text-right"><span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-3 py-1 rounded-full border border-emerald-500/20">9/12 SESSIONS</span></div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-40 relative z-10 px-6">
        <div className="flex items-center gap-5 mt-4 mb-8">
           <img src={client.avatar} className="w-20 h-20 rounded-full border-2 border-white/10 shadow-2xl bg-white" alt={client.name}/>
           <div className="flex-1 min-w-0"><h1 className="text-2xl font-medium text-white tracking-tight">{client.name}</h1><span className="text-blue-400 text-[10px] font-black uppercase">{client.goal}</span><p className="text-xs text-neutral-400 mt-2"><Phone className="w-3 h-3 inline mr-1"/> {client.phone}</p></div>
        </div>
        <div className="mb-8 flex bg-white/[0.03] p-1 rounded-[20px] border border-white/[0.05] overflow-x-auto hide-scrollbar flex-nowrap">
          {['summary', 'inbody', 'workout', 'schedule'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 px-4 text-[10px] font-bold uppercase rounded-[16px] transition-all whitespace-nowrap ${activeTab === tab ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>{tab}</button>
          ))}
        </div>
        
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 gap-4">
               <div className="glass p-5 rounded-[24px] text-center"><p className="text-white text-lg font-medium">{client.height || '--'} cm</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Height</p></div>
               <div className="glass p-5 rounded-[24px] text-center"><p className="text-white text-lg font-medium">{client.weight || '--'} kg</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Weight (Start)</p></div>
            </div>
            <div className="glass p-6 rounded-[24px]"><h3 className="text-[10px] font-black text-neutral-400 uppercase mb-3">Training History</h3><p className="text-sm text-neutral-300 leading-relaxed">{client.traininghistory || "No data."}</p></div>
          </div>
        )}

        {activeTab === 'inbody' && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass p-5 rounded-[28px]">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-6">Initial vs Current</h3>
              <div className="space-y-6">
                {[{l:'Weight',k:'weight',u:'kg',i:Scale},{l:'Muscle (SMM)',k:'smm',u:'kg',i:Dumbbell},{l:'Fat (PBF)',k:'pbf',u:'%',i:Percent}].map(item => (
                  <div key={item.k} className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-xl"><item.i className="w-4 h-4 text-neutral-500"/></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-bold mb-2">
                         <span className="text-neutral-500 uppercase">{item.l}</span>
                         <span className={item.k==='pbf'?'text-emerald-400':'text-blue-400'}>{(inbodyData.current[item.k] - inbodyData.initial[item.k]).toFixed(1)} {item.u}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex"><div className="h-full bg-neutral-600" style={{width:'40%'}}></div><div className="h-full bg-white ml-0.5" style={{width:'50%'}}></div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workout' && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass p-5 rounded-[28px] border-l-4 border-blue-500 flex justify-between items-center">
               <div><h4 className="text-white font-bold text-sm">Hypertrophy - Aesthetics</h4><p className="text-[9px] text-neutral-500 font-bold uppercase mt-1">Push Day • 6 Exercises</p></div>
               <button onClick={onRecordWorkout} className="p-3 bg-white text-black rounded-full shadow-lg active:scale-90 transition-all"><Play className="w-4 h-4 fill-current"/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 8. MAIN APP COMPONENT ---
export default function App() {
  const [session, setSession] = useState(null); 
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailTab, setDetailTab] = useState('summary');
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [clients, setClients] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('clients').select('*');
    if (data) {
      setClients(data.map(db => ({
        ...db, id: db.id, name: db.name, avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name}&backgroundColor=eceff4`,
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => { if (session) fetchClients(); }, [session, activeTab]);

  const handleAddClient = async (formData) => {
    setIsSaving(true);
    const { error } = await supabase.from('clients').insert([{ ...formData, sessions: '12' }]);
    setIsSaving(false);
    if (!error) { fetchClients(); setActiveTab('clients'); } else { alert(error.message); }
  };

  if (!session) return <div className="min-h-screen bg-black flex justify-center"><div className="w-full max-w-[420px]"><AuthScreen onLogin={setSession} /></div></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans flex justify-center">
      <div className="w-full max-w-[420px] h-screen relative shadow-2xl md:border-x border-white/[0.05] overflow-hidden flex flex-col bg-black">
        <GlobalStyles />
        <div className="absolute top-[-5%] left-[-15%] w-[120%] h-[300px] bg-white/[0.02] blur-[120px] pointer-events-none"></div>

        {!selectedClient ? (
          <>
            {activeTab === 'home' && <DashboardView onSelectClient={setSelectedClient} />}
            {activeTab === 'calendar' && <div className="p-10 text-center text-neutral-500">Coming Soon</div>}
            {activeTab === 'clients' && <ClientListView clients={clients} isLoading={isLoading} onSelectClient={setSelectedClient} onOpenAdd={() => setActiveTab('add_client')} />}
            {activeTab === 'add_client' && <AddClientView onBack={() => setActiveTab('clients')} onSave={handleAddClient} isSaving={isSaving} />}
            {activeTab !== 'add_client' && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] max-w-[320px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 flex justify-between z-50">
                <button onClick={() => setActiveTab('home')} className={`p-4 rounded-[24px] ${activeTab === 'home' ? 'bg-white/10 text-white shadow-inner' : 'text-neutral-600'}`}><Home className="w-5 h-5"/></button>
                <button onClick={() => setActiveTab('calendar')} className={`p-4 rounded-[24px] ${activeTab === 'calendar' ? 'bg-white/10 text-white shadow-inner' : 'text-neutral-600'}`}><Calendar className="w-5 h-5"/></button>
                <button onClick={() => setActiveTab('clients')} className={`p-4 rounded-[24px] ${activeTab === 'clients' ? 'bg-white/10 text-white shadow-inner' : 'text-neutral-600'}`}><Users className="w-5 h-5"/></button>
              </div>
            )}
          </>
        ) : (
          <>
            <ClientDetailView client={selectedClient} onBack={() => setSelectedClient(null)} activeTab={detailTab} setActiveTab={setDetailTab} onRecordWorkout={() => setIsPlayerOpen(true)} />
            {isPlayerOpen && (
              <WorkoutPlayer sessionData={{ group_name: "Hypertrophy Aesthetics" }} onBack={() => setIsPlayerOpen(false)} onFinish={() => { alert("Session Recorded & Deducted!"); setIsPlayerOpen(false); }} />
            )}
          </>
        )}
      </div>
    </div>
  );
}