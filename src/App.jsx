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

// --- 1. GLOBAL STYLES ---
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

// --- 2. AUTH SCREEN ---
const AuthScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onLogin({ username }); };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center relative z-20 bg-[#0a0a0a] overflow-hidden px-6">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[400px] bg-white/[0.03] blur-[100px] pointer-events-none"></div>
      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4"><Dumbbell className="w-8 h-8 text-white" /></div>
          <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">Coach Portal Access</p>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 px-4 text-white text-sm outline-none" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 px-4 text-white text-sm outline-none" />
            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-[20px] mt-2 hover:bg-neutral-200 transition-all shadow-lg">Access Portal</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- 3. COMPONENTS ĐIỀU HƯỚNG ---
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

// --- 4. MODAL GHI NHẬN BUỔI TẬP ---
const RecordWorkoutModal = ({ isOpen, onClose, clientName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="w-full max-w-[420px] bg-[#1a1a1c] border-t border-white/10 rounded-t-[32px] p-6 relative animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <div><h3 className="text-white text-xl font-medium tracking-tight">Record Session</h3><p className="text-blue-400 text-[10px] font-black uppercase mt-1">{clientName}</p></div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-neutral-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4 mb-8">
          <input type="text" placeholder="Workout Focus (VD: Leg Day)" className="w-full bg-black/50 border border-white/10 rounded-[16px] p-4 text-white text-sm outline-none" />
          <textarea rows="3" placeholder="Coach Notes..." className="w-full bg-black/50 border border-white/10 rounded-[16px] p-4 text-white text-sm outline-none resize-none"></textarea>
        </div>
        <button onClick={onClose} className="w-full bg-white text-black font-bold py-4 rounded-[20px] flex items-center justify-center gap-2 shadow-lg"><CheckCircle2 className="w-5 h-5" /> Save Workout</button>
      </div>
    </div>
  );
};

// --- 5. MÀN HÌNH THÊM HỌC VIÊN (BẢN FULL OPTIMIZED) ---
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
    if (!formData.phone) { alert("Nhập SĐT trước khi Sync!"); return; }
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('phone', formData.phone)
        .maybeSingle(); // Fix lỗi 406

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
      <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-[#2a2a2c]/30 to-[#0a0a0a] pointer-events-none"></div>
      
      {/* HEADER STICKY VỚI LỚP NỀN CHẶN CHỮ */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white shadow-md"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Onboarding Form</h2>
         <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 shadow-md ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-5 h-5" />
         </button>
      </div>

      <div className="flex-1 relative z-10 pb-12 pt-4">
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-white tracking-tight mb-2">New Client Profile</h1>
          <p className="text-neutral-500 text-xs">Nhập <b>SĐT</b> và bấm Sync để quét data từ Google Form.</p>
        </div>

        <div className="space-y-4">
          {/* SECTION 1: BẮT BUỘC */}
          <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px] space-y-4">
            <div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">1. Thông tin bắt buộc (*)</h3></div>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="SĐT Liên lạc *" className="w-full bg-black/80 border border-blue-500/30 rounded-[12px] p-3 text-white text-sm outline-none focus:border-blue-500" />
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và Tên *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm outline-none" />
              <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm outline-none"><option>Nam</option><option>Nữ</option><option>Khác</option></select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Chiều cao (cm) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
              <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="Cân nặng (kg) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
            </div>
            <input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="Mục tiêu chính (Giảm cân, tăng cơ...) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
            <textarea name="trainingHistory" value={formData.trainingHistory} onChange={handleChange} rows="2" placeholder="Lịch sử tập luyện? *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm resize-none outline-none"></textarea>
            <select name="commitment" value={formData.commitment} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm outline-none"><option>Sẵn sàng tuân thủ meal plan *</option><option>Có thể tuân thủ phần lớn</option><option>Hơi khó</option></select>
          </div>

          {/* SECTION 2: SINH HOẠT (ACCORDION) */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
            <div onClick={() => toggleSection('lifestyle')} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03]">
              <div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><h3 className="text-white text-sm font-medium">2. Sinh hoạt & Chế độ</h3></div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'lifestyle' ? 'rotate-180' : ''}`} />
            </div>
            {expandedSection === 'lifestyle' && (
              <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4 animate-in fade-in slide-in-from-top-2">
                <input type="text" name="jobType" value={formData.jobType} onChange={handleChange} placeholder="Tính chất công việc" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" name="trainingTime" value={formData.trainingTime} onChange={handleChange} placeholder="Thời gian tập/ngày" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
                  <input type="text" name="targetDuration" value={formData.targetDuration} onChange={handleChange} placeholder="Thời hạn mục tiêu" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
                </div>
                <input type="text" name="sleep" value={formData.sleep} onChange={handleChange} placeholder="Giấc ngủ mỗi tối" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
              </div>
            )}
          </div>

          {/* SECTION 3: DINH DƯỠNG (ACCORDION) */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
            <div onClick={() => toggleSection('nutrition')} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03]">
              <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /><h3 className="text-white text-sm font-medium">3. Dinh dưỡng & Bếp núc</h3></div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'nutrition' ? 'rotate-180' : ''}`} />
            </div>
            {expandedSection === 'nutrition' && (
              <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4 animate-in fade-in slide-in-from-top-2">
                <input type="text" name="cookHabit" value={formData.cookHabit} onChange={handleChange} placeholder="Thói quen ăn uống" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
                <textarea name="favFood" value={formData.favFood} onChange={handleChange} rows="2" placeholder="Thực phẩm yêu thích" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm resize-none outline-none"></textarea>
                <input type="text" name="avoidFood" value={formData.avoidFood} onChange={handleChange} placeholder="Dị ứng / Cần tránh" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm outline-none" />
              </div>
            )}
          </div>

          <div className="mt-8 pb-4">
            <button onClick={() => onSave(formData)} disabled={isSaving} className={`w-full text-black font-bold py-4 rounded-[20px] transition-all flex items-center justify-center gap-2 shadow-2xl ${isSaving ? 'bg-neutral-400' : 'bg-white hover:scale-[1.02] active:scale-[0.98]'}`}>
              {isSaving ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />} {isSaving ? 'Đang lưu...' : 'Lưu Hồ Sơ Khách Hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 6. DASHBOARD VIEW (DẢI CALENDAR GỐC) ---
const DashboardView = ({ onSelectClient }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    const elId = 'date-btn-' + selectedDate.toDateString();
    const el = document.getElementById(elId);
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [viewDate, selectedDate]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000]">
      <div className="flex justify-between items-center p-6 shrink-0">
        <div className="flex items-center gap-4"><img src="https://i.pravatar.cc/150?u=coach" className="w-12 h-12 rounded-full border border-white/10 grayscale-[20%]" /><div><p className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">Aesthetics Hub</p><h1 className="text-xl font-medium text-white tracking-tight">Coach Hoang</h1></div></div>
        <button className="p-3 bg-black border border-white/10 rounded-full text-white shadow-lg"><Bell className="w-5 h-5" /></button>
      </div>
      <div className="px-6 mb-8 shrink-0">
        <div className="flex justify-between items-center mb-5"><h2 className="text-2xl font-light text-white tracking-tight">{viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2><div className="flex gap-2"><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()-1)))} className="p-2 bg-white/[0.05] rounded-full"><ChevronLeft className="w-4 h-4 text-white"/></button><button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth()+1)))} className="p-2 bg-white/[0.05] rounded-full"><ChevronRight className="w-4 h-4 text-white"/></button></div></div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth">
          {days.map(dateObj => {
            const isSelected = dateObj.toDateString() === selectedDate.toDateString();
            return (
              <button key={dateObj.toISOString()} id={'date-btn-' + dateObj.toDateString()} onClick={() => setSelectedDate(dateObj)} className={`flex flex-col items-center justify-center min-w-[58px] h-[84px] rounded-[22px] border transition-all shrink-0 ${isSelected ? 'bg-black border-white/20 shadow-2xl scale-100' : 'bg-white/[0.03] border-white/[0.05] text-neutral-600'}`}>
                <span className="text-[10px] font-bold uppercase mb-1">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-lg font-semibold">{dateObj.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="px-6 mb-4 flex justify-between items-end shrink-0"><h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Work Timeline</h2><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div><span className="text-[9px] font-black text-neutral-400 uppercase">Live</span></div></div>
      <div className="flex-1 overflow-y-auto px-6 pb-32 hide-scrollbar"><div className="relative border-l border-white/5 ml-[54px] pl-6 space-y-8"><div className="text-center text-neutral-500 text-[10px] uppercase font-black tracking-widest mt-10">No sessions scheduled</div></div></div>
    </div>
  );
}

// --- 7. CLIENT LIST VIEW (HIỂN THỊ CÂN NẶNG) ---
const ClientListView = ({ clients, onSelectClient, onOpenAdd, isLoading }) => (
  <div className="h-screen flex flex-col bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000] px-6 py-8 pb-32 overflow-y-auto hide-scrollbar">
    <div className="flex justify-between items-center mb-8 shrink-0">
       <div><h1 className="text-2xl font-medium text-white tracking-tight">Client Pool</h1><p className="text-neutral-500 text-[10px] font-black uppercase">Total: {clients.length} Active</p></div>
       <button onClick={onOpenAdd} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"><UserPlus className="w-5 h-5" /></button>
    </div>
    {isLoading ? <div className="text-center mt-20 text-neutral-500"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" /> Loading...</div> : (
      <div className="space-y-4">
        {clients.map(c => (
          <div key={c.id} onClick={() => onSelectClient(c)} className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-all active:scale-[0.98]">
             <img src={c.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-white" alt="avt" />
             <div className="flex-1 min-w-0"><h3 className="text-white font-medium text-sm truncate">{c.name}</h3><p className="text-blue-400 text-[10px] font-bold uppercase truncate mt-0.5">{c.goal}</p></div>
             <div className="text-right mr-3"><p className="text-[10px] font-black text-neutral-500 uppercase">KG</p><p className="text-xs font-bold text-white">{c.weight || '--'}</p></div>
             <ChevronRight className="w-4 h-4 text-neutral-600" />
          </div>
        ))}
        {clients.length === 0 && <div className="text-center mt-20 text-neutral-600 text-sm">Chưa có khách hàng nào.</div>}
      </div>
    )}
  </div>
);

// --- 8. CLIENT DETAIL VIEW (PROFILE XỊN XÒ) ---
const ClientDetailView = ({ client, onBack, activeTab, setActiveTab, onRecordWorkout }) => {
  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] animate-slide-up overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-[350px] bg-gradient-to-b from-[#2a2a2c]/40 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none"></div>
      <div className="flex justify-between items-center p-6 shrink-0 relative z-50"><button onClick={onBack} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-[10px] font-black text-white/40 uppercase">Profile Settings</h2><button className="p-3 bg-white/[0.03] rounded-full text-neutral-400 border border-white/5"><MoreHorizontal className="w-5 h-5" /></button></div>
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-40 relative z-10 px-6">
        <div className="flex items-center gap-5 mt-4 mb-8">
           <img src={client.avatar} className="w-20 h-20 rounded-full border-2 border-white/10 shadow-2xl bg-white" alt={client.name}/>
           <div className="flex-1 min-w-0"><h1 className="text-2xl font-medium text-white tracking-tight">{client.name}</h1><span className="text-blue-400 text-[10px] font-black uppercase">{client.goal}</span><p className="text-xs text-neutral-400 mt-2"><Phone className="w-3 h-3 inline mr-1"/> {client.phone}</p></div>
        </div>
        <div className="mb-8"><div className="flex bg-white/[0.03] p-1 rounded-[20px] border border-white/[0.05]">{['overview', 'workout', 'nutrition'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>{tab}</button>))}</div></div>
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-black/60 border border-white/10 p-5 rounded-[24px] text-center"><p className="text-white text-lg font-medium">{client.weight || '--'} kg</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Weight</p></div>
               <div className="bg-black/60 border border-white/10 p-5 rounded-[24px] text-center"><p className="text-white text-lg font-medium">{client.height || '--'} cm</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Height</p></div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[24px]"><h3 className="text-[10px] font-black text-neutral-400 uppercase mb-3">Medical / Notes</h3><p className="text-sm text-neutral-300 leading-relaxed">{client.medical}</p></div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 9. MAIN APP COMPONENT (ĐÃ FIX CHỮ THƯỜNG TRƯỜNG DỮ LIỆU) ---
export default function App() {
  const [session, setSession] = useState(null); 
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [clients, setClients] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // FETCH DỮ LIỆU CHỮ THƯỜNG
  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('clients').select('*');
    if (data) {
      setClients(data.map(db => ({
        id: db.id, name: db.name, phone: db.phone, goal: db.goal, weight: db.weight, height: db.height,
        medical: db.medicalconditions || "Không có ghi chú y tế",
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${db.name || 'Guest'}&backgroundColor=eceff4`, 
        package: { total: parseInt(db.sessions) || 12, completed: 0, remaining: parseInt(db.sessions) || 12 }
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => { if (session) fetchClients(); }, [session, activeTab]);

  // LƯU DỮ LIỆU CHỮ THƯỜNG (FIX LỖI AVOIDFOODS)
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
    if (!error) { fetchClients(); setActiveTab('clients'); } else { alert("Lỗi lưu: " + error.message); }
  };

  if (!session) return <div className="min-h-screen bg-black flex justify-center"><div className="w-full max-w-[420px]"><AuthScreen onLogin={setSession} /></div></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans flex justify-center selection:bg-white/20">
      <div className="w-full max-w-[420px] h-screen relative shadow-2xl md:border-x border-white/[0.05] overflow-hidden flex flex-col bg-black">
        <GlobalStyles />
        <div className="absolute top-[-5%] left-[-15%] w-[120%] h-[300px] bg-white/[0.02] blur-[120px] pointer-events-none"></div>

        {!selectedClient ? (
          <>
            {activeTab === 'home' && <DashboardView onSelectClient={setSelectedClient} />}
            {activeTab === 'clients' && <ClientListView clients={clients} isLoading={isLoading} onSelectClient={setSelectedClient} onOpenAdd={() => setActiveTab('add_client')} />}
            {activeTab === 'add_client' && <AddClientView onBack={() => setActiveTab('clients')} onSave={handleAddClient} isSaving={isSaving} />}
            {activeTab !== 'add_client' && <FloatingBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
          </>
        ) : (
          <>
            <ClientDetailView client={selectedClient} onBack={() => setSelectedClient(null)} activeTab={detailTab} setActiveTab={setDetailTab} onRecordWorkout={() => setIsRecordModalOpen(true)} />
            <DetailActionNav onRecordWorkout={() => setIsRecordModalOpen(true)} activeTab={detailTab} setActiveTab={setDetailTab} />
            <RecordWorkoutModal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} clientName={selectedClient.name} />
          </>
        )}
      </div>
    </div>
  );
}