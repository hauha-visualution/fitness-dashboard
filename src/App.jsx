import React, { useState, useEffect } from 'react';
import { 
  Users, Dumbbell, Utensils, CreditCard, Home, 
  ChevronRight, Bell, Plus, Search, Calendar, 
  TrendingUp, Activity, ArrowLeft, MoreHorizontal, MessageSquare,
  AlertCircle, Coffee, CheckCircle2, Circle, Droplets, Target, Flame, 
  Clock, Camera, History, ChevronDown, Award, BarChart3, Scale, Percent
} from 'lucide-react';

// --- DỮ LIỆU MẪU (MOCK DATABASE) ---
const CLIENT_POOL = {
  1: { 
    id: 1, 
    name: "Mr. Hau", 
    avatar: "https://i.pravatar.cc/150?u=anhhau", 
    goal: "Cutting Phase 1", 
    package: { total: 50, bonus: 2, completed: 46, remaining: 6 }, 
    status: "active",
    startStats: { weight: "85.0 kg", bodyFat: "28.5%", height: "160cm", date: "30/01/2026", waist: "98cm", chest: "105cm" },
    currentStats: { weight: "79.3 kg", bodyFat: "24.0%", height: "160cm", date: "18/03/2026", waist: "90cm", chest: "102cm" },
    targetWeight: "76 kg",
    photos: {
      before: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400&auto=format&fit=crop",
      after: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=400&auto=format&fit=crop"
    },
    sessionHistory: [
      { id: 46, date: "16/03/2026", focus: "Push Day", note: "Tăng tạ Bench Press thêm 5kg. Năng lượng tốt.", exercises: "Bench Press, Shoulder Press, Dips" },
      { id: 45, date: "14/03/2026", focus: "Legs Day", note: "Form Squat cải thiện rõ rệt.", exercises: "Squats, Leg Press, Lunges" },
    ]
  },
  2: { id: 2, name: "Thai Hung", avatar: "https://i.pravatar.cc/150?u=thaihung", goal: "Lean, Get Fit", package: { total: 72, bonus: 2, completed: 70, remaining: 4 }, status: "warning" },
};

const DAILY_SCHEDULES = {
  "18": [
    { ...CLIENT_POOL[1], time: "07:30", ampm: "AM", timestamp: 7.5 },
    { ...CLIENT_POOL[2], time: "09:00", ampm: "AM", timestamp: 9 },
    { ...CLIENT_POOL[1], time: "04:30", ampm: "PM", timestamp: 16.5 }
  ]
};

// --- STYLES & ANIMATIONS ---
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes pulse-glow {
      0%, 100% { border-color: rgba(255, 255, 255, 0.05); box-shadow: 0 0 0px rgba(255, 255, 255, 0); }
      50% { border-color: rgba(255, 255, 255, 0.2); box-shadow: 0 0 15px rgba(255, 255, 255, 0.1); }
    }
    .animate-glow-pulse { animation: pulse-glow 2s infinite ease-in-out; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}} />
);

// --- CÁC THÀNH PHẦN ĐIỀU HƯỚNG ---

const FloatingBottomNav = ({ activeTab, setActiveTab }) => {
  const navItems = [{ id: 'home', icon: Home }, { id: 'calendar', icon: Calendar }, { id: 'messages', icon: MessageSquare }, { id: 'clients', icon: Users }];
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] max-w-[320px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl z-50 p-1.5 flex justify-between items-center">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`relative flex-1 py-4 rounded-[26px] transition-all flex justify-center items-center ${activeTab === item.id ? 'text-white' : 'text-neutral-600'}`}>
            {activeTab === item.id && <div className="absolute inset-0 bg-white/5 rounded-[26px] border border-white/10 shadow-inner"></div>}
            <item.icon className={`w-5 h-5 relative z-10 ${activeTab === item.id ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`} />
          </button>
        ))}
    </div>
  );
};

const DetailActionNav = ({ onRecordWorkout, activeTab, setActiveTab }) => (
  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[380px] bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[35px] shadow-2xl z-50 p-2 flex justify-between items-center">
      <button onClick={() => setActiveTab('overview')} className={`p-4 rounded-full ${activeTab === 'overview' ? 'text-white bg-white/5' : 'text-neutral-600'}`}><BarChart3 className="w-5 h-5" /></button>
      <button onClick={() => setActiveTab('workout')} className={`p-4 rounded-full ${activeTab === 'workout' ? 'text-white bg-white/5' : 'text-neutral-600'}`}><Dumbbell className="w-5 h-5" /></button>
      <button onClick={onRecordWorkout} className="mx-2 bg-white text-black w-14 h-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center"><Plus className="w-6 h-6 stroke-[3]" /></button>
      <button onClick={() => setActiveTab('nutrition')} className={`p-4 rounded-full ${activeTab === 'nutrition' ? 'text-white bg-white/5' : 'text-neutral-600'}`}><Utensils className="w-5 h-5" /></button>
      <button onClick={() => setActiveTab('finance')} className={`p-4 rounded-full ${activeTab === 'finance' ? 'text-white bg-white/5' : 'text-neutral-600'}`}><CreditCard className="w-5 h-5" /></button>
  </div>
);

// --- GIAO DIỆN TRANG CHỦ (MILESTONE TIMELINE) ---

const DashboardView = ({ onSelectClient }) => {
  const [selectedDate, setSelectedDate] = useState("18");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const nowHour = currentTime.getHours() + currentTime.getMinutes() / 60;
  const sessions = DAILY_SCHEDULES[selectedDate] || [];

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000]">
      {/* Header */}
      <div className="flex justify-between items-center p-6 shrink-0">
        <div className="flex items-center gap-4">
          <img src="https://i.pravatar.cc/150?u=coach" className="w-12 h-12 rounded-full border border-white/10 grayscale-[20%]" />
          <div><p className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">Aesthetics Hub</p><h1 className="text-xl font-medium text-white tracking-tight">Coach Hoang</h1></div>
        </div>
        <button className="p-3 bg-black border border-white/10 rounded-full text-white shadow-lg"><Bell className="w-5 h-5" /></button>
      </div>

      {/* Date Slider Cố định */}
      <div className="px-6 mb-8 shrink-0">
        <h2 className="text-2xl font-light text-white mb-5 tracking-tight">March 2026</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
          {["16", "17", "18", "19", "20", "21", "22"].map(date => (
            <button key={date} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center justify-center min-w-[58px] h-[84px] rounded-[22px] border transition-all ${selectedDate === date ? 'bg-black border-white/20 shadow-2xl scale-100' : 'bg-white/[0.03] border-white/[0.05] text-neutral-600'}`}>
              <span className="text-[10px] font-bold uppercase mb-1">Day</span>
              <span className="text-lg font-semibold">{date}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 mb-4 flex justify-between items-end shrink-0">
        <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Work Timeline</h2>
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div><span className="text-[9px] font-black text-neutral-400 uppercase">Live</span></div>
      </div>

      {/* MILESTONE TIMELINE FEATURE (Khôi phục từ V5) */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 hide-scrollbar">
        <div className="relative border-l border-white/5 ml-[54px] pl-6 space-y-8">
          {sessions.map((session, i) => {
            const isLive = nowHour >= session.timestamp && nowHour <= session.timestamp + 1;
            const isUpcoming = (session.timestamp - nowHour <= 0.25) && (session.timestamp - nowHour > 0);
            const isPast = nowHour > session.timestamp + 1;

            let cardStyles = isLive ? 'bg-black border-white/30 shadow-2xl animate-glow-pulse scale-[1.02]' : 
                             isUpcoming ? 'bg-black/60 border-white/10 animate-pulse' :
                             isPast ? 'bg-white/[0.01] border-white/[0.02] opacity-30 grayscale' : 'bg-white/[0.03] border-white/[0.05] opacity-60';

            return (
              <div key={i} onClick={() => onSelectClient(session)} className={`relative p-4 rounded-[26px] border transition-all cursor-pointer active:scale-95 ${cardStyles}`}>
                {/* Time Label bên trái vạch */}
                <div className="absolute right-full mr-6 top-1/2 -translate-y-1/2 text-right whitespace-nowrap">
                   <p className={`text-xs font-black ${isLive || isUpcoming ? 'text-white' : 'text-neutral-600'}`}>{session.time}</p>
                   <p className="text-[8px] font-bold text-neutral-700">{session.ampm}</p>
                </div>
                {/* Dấu chấm mốc thời gian */}
                <div className={`absolute right-[calc(100%+20px)] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-black z-10 transition-all ${isLive ? 'bg-white shadow-[0_0_10px_white]' : 'bg-neutral-800'}`}></div>
                
                <div className="flex items-center gap-4">
                  <img src={session.avatar} className="w-11 h-11 rounded-full border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm truncate">{session.name}</h3>
                    <p className="text-neutral-500 text-[10px] font-bold uppercase truncate">{session.goal}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-700" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- GIAO DIỆN HỒ SƠ CHI TIẾT (CLIENT PROFILE) ---

const ClientDetailView = ({ client, onBack, activeTab, setActiveTab }) => {
  const [expandedSession, setExpandedSession] = useState(null);
  const completedRatio = (client.package.completed / (client.package.total + client.package.bonus)) * 100;

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] animate-in slide-in-from-right duration-500 overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-[350px] bg-gradient-to-b from-[#2a2a2c]/40 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none"></div>

      {/* Profile Header */}
      <div className="flex justify-between items-center p-6 shrink-0 relative z-50">
         <button onClick={onBack} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 shadow-md"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Profile Settings</h2>
         <button className="p-3 bg-white/[0.03] rounded-full text-neutral-400 border border-white/5"><MoreHorizontal className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-40 relative z-10 px-6">
        
        {/* Avatar & Contract Info */}
        <div className="flex items-center gap-5 mt-4 mb-8">
           <div className="relative shrink-0">
              <img src={client.avatar} className="w-20 h-20 rounded-full border-2 border-white/10 shadow-2xl" alt={client.name}/>
              <div className="absolute -bottom-1 -right-1 bg-white text-black rounded-full p-1 border border-black"><Award className="w-3 h-3" /></div>
           </div>
           <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-medium text-white tracking-tight">{client.name}</h1>
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-wider">{client.goal}</span>
              <div className="mt-4 flex flex-col gap-2 max-w-[160px]">
                 <div className="flex justify-between items-end"><span className="text-[9px] font-black text-neutral-600 uppercase">Sessions</span><span className="text-[11px] font-black text-white">{client.package.remaining} LEFT</span></div>
                 <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.03]"><div className="h-full bg-white rounded-full shadow-[0_0_8px_white]" style={{ width: `${completedRatio}%` }}></div></div>
              </div>
           </div>
        </div>

        {/* Profile Tabs */}
        <div className="mb-8">
           <div className="flex bg-white/[0.03] backdrop-blur-xl p-1 rounded-[20px] border border-white/[0.05]">
              {['overview', 'workout', 'nutrition'].map(tab => (
                <button 
                  key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[10px] font-bold tracking-wider uppercase rounded-[16px] transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}
                >
                  {tab}
                </button>
              ))}
           </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
               <div className="bg-black/60 border border-white/10 p-4 rounded-[24px] text-center shadow-lg"><Scale className="w-4 h-4 text-neutral-500 mx-auto mb-2" /><p className="text-[14px] text-white font-medium">{client.currentStats.weight}</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Weight</p></div>
               <div className="bg-black/60 border border-white/10 p-4 rounded-[24px] text-center shadow-lg"><Percent className="w-4 h-4 text-neutral-500 mx-auto mb-2" /><p className="text-[14px] text-white font-medium">{client.currentStats.bodyFat}</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Body Fat</p></div>
               <div className="bg-black/60 border border-white/10 p-4 rounded-[24px] text-center shadow-lg"><Target className="w-4 h-4 text-blue-500/80 mx-auto mb-2" /><p className="text-[14px] text-blue-400 font-medium">{client.targetWeight}</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Goal</p></div>
            </div>

            {/* Evolution Table */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] overflow-hidden shadow-2xl">
               <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between"><h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Evolution Tracking</h3><TrendingUp className="w-3 h-3 text-emerald-500" /></div>
               <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-white">
                  <thead><tr className="border-b border-white/5 text-[9px] font-black uppercase"><th className="p-4">Metric</th><th className="p-4 text-center">Initial</th><th className="p-4 text-center text-blue-500">Latest</th></tr></thead>
                  <tbody className="divide-y divide-white/[0.02] text-[12px]">
                    {[ { l: 'Weight', s: client.startStats.weight, c: client.currentStats.weight, e: true }, { l: 'Body Fat', s: client.startStats.bodyFat, c: client.currentStats.bodyFat, e: true }, { l: 'Waist', s: client.startStats.waist, c: client.currentStats.waist, e: true } ].map((row, i) => (
                      <tr key={i}><td className="p-4 text-neutral-500 font-bold uppercase">{row.l}</td><td className="p-4 text-center opacity-40">{row.s}</td><td className={`p-4 text-center font-bold ${row.e ? 'text-emerald-400' : ''}`}>{row.c}</td></tr>
                    ))}
                  </tbody>
               </table></div>
            </div>

            {/* Visual Progress */}
            <div className="grid grid-cols-2 gap-3">
               <div className="relative rounded-[28px] h-64 overflow-hidden grayscale opacity-40"><img src={client.photos.before} className="w-full h-full object-cover" /><div className="absolute top-4 left-4 bg-black/80 px-2 py-1 rounded text-[8px] font-black">BEFORE</div></div>
               <div className="relative rounded-[28px] h-64 overflow-hidden border border-white/10"><img src={client.photos.after} className="w-full h-full object-cover" /><div className="absolute top-4 left-4 bg-white text-black px-2 py-1 rounded text-[8px] font-black">NOW</div></div>
            </div>

            {/* Session Logs Accordion */}
            <div className="space-y-2 pb-8">
               <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">Session Log</h3>
               {client.sessionHistory.map(session => (
                  <div key={session.id} onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)} className={`bg-white/[0.02] border ${expandedSession === session.id ? 'border-white/20 bg-black' : 'border-white/[0.04]'} p-4 rounded-[24px] cursor-pointer`}>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center text-[11px] font-black">{session.id}</div><div><p className="text-[13px] font-bold text-white">{session.focus}</p><p className="text-[9px] text-neutral-600 uppercase">{session.date}</p></div></div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedSession === session.id ? 'rotate-180' : ''}`} />
                     </div>
                     {expandedSession === session.id && <div className="mt-5 pt-5 border-t border-white/[0.05] animate-in fade-in"><p className="text-[9px] font-black text-neutral-600 uppercase mb-2">Training Content</p><p className="text-[12px] text-white/80 leading-relaxed mb-4">{session.exercises}</p><p className="text-[12px] text-emerald-400 italic">" {session.note} "</p></div>}
                  </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');

  const handleBack = () => { setSelectedClient(null); setDetailTab('overview'); };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans flex justify-center selection:bg-white/20">
      <div className="w-full max-w-[420px] h-screen relative shadow-2xl md:border-x border-white/[0.05] overflow-hidden flex flex-col bg-black">
        <GlobalStyles />
        <div className="absolute top-[-5%] left-[-15%] w-[120%] h-[300px] bg-white/[0.02] blur-[120px] pointer-events-none"></div>

        {!selectedClient ? (
          <>
            {activeTab === 'home' && <DashboardView onSelectClient={setSelectedClient} />}
            {activeTab === 'clients' && <div className="p-10 text-2xl font-light">Client List Module</div>}
            <FloatingBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
          </>
        ) : (
          <>
            <ClientDetailView client={selectedClient} onBack={handleBack} activeTab={detailTab} setActiveTab={setDetailTab} />
            <DetailActionNav onRecordWorkout={() => {}} activeTab={detailTab} setActiveTab={setDetailTab} />
          </>
        )}
      </div>
    </div>
  );
}