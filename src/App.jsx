import React, { useState, useEffect } from 'react';
import { 
  Users, Dumbbell, Utensils, CreditCard, Home, 
  ChevronRight, ChevronLeft, Bell, Plus, Search, Calendar, 
  TrendingUp, Activity, ArrowLeft, MoreHorizontal, MessageSquare,
  AlertCircle, Coffee, CheckCircle2, Circle, Droplets, Target, Flame, 
  Clock, Camera, History, ChevronDown, Award, BarChart3, Scale, Percent, X,
  Lock, User, UserPlus, FileText, ActivitySquare, HeartPulse, RefreshCw, Phone
} from 'lucide-react';

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
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ username }); 
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center relative z-20 bg-[#0a0a0a] overflow-hidden px-6">
      <div className="absolute top-[-10%] left-[-20%] w-[140%] h-[400px] bg-white/[0.03] blur-[100px] pointer-events-none"></div>
      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)]"><Dumbbell className="w-8 h-8 text-white" /></div>
          <h1 className="text-2xl font-medium text-white tracking-tight">Aesthetics Hub</h1>
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-2">Coach Portal Access</p>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
          <div className="flex bg-white/[0.03] p-1 rounded-[20px] mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>Sign In</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-[16px] transition-all ${!isLogin ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>Sign Up</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative"><User className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" /><input type="text" placeholder="Username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-colors" /></div>
            <div className="relative"><Lock className="w-5 h-5 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" /><input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[20px] py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-blue-500 transition-colors" /></div>
            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-[20px] mt-2 flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">{isLogin ? 'Access Portal' : 'Create Account'} <ArrowLeft className="w-4 h-4 rotate-180" /></button>
          </form>
        </div>
      </div>
    </div>
  );
};

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

// --- MODAL GHI NHẬN BUỔI TẬP ---
const RecordWorkoutModal = ({ isOpen, onClose, clientName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="w-full max-w-[420px] bg-[#1a1a1c] border-t border-white/10 rounded-t-[32px] p-6 relative animate-slide-up shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex justify-between items-center mb-6">
          <div><h3 className="text-white text-xl font-medium tracking-tight">Record Session</h3><p className="text-blue-400 text-[10px] font-black uppercase tracking-wider mt-1">{clientName}</p></div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-5 mb-8">
          <div><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Workout Focus</label><input type="text" placeholder="VD: Push Day..." className="w-full bg-black/50 border border-white/10 rounded-[16px] p-4 text-white text-sm outline-none focus:border-blue-500 transition-colors" /></div>
          <div><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Exercises & Weights</label><input type="text" placeholder="VD: Bench Press 60kg..." className="w-full bg-black/50 border border-white/10 rounded-[16px] p-4 text-white text-sm outline-none focus:border-blue-500 transition-colors" /></div>
          <div><label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Coach Notes</label><textarea rows="3" placeholder="Đánh giá..." className="w-full bg-black/50 border border-white/10 rounded-[16px] p-4 text-white text-sm outline-none focus:border-blue-500 transition-colors resize-none"></textarea></div>
        </div>
        <button onClick={onClose} className="w-full bg-white text-black font-bold py-4 rounded-[20px] flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-lg"><CheckCircle2 className="w-5 h-5" /> Save Workout</button>
      </div>
    </div>
  );
};

// --- MÀN HÌNH THÊM HỌC VIÊN MỚI ---
const AddClientView = ({ onBack, onSave }) => {
  const [formData, setFormData] = useState({
    name: '', dob: '', gender: 'Nam', phone: '', height: '', trainingHistory: '', goal: '', commitment: 'Sẵn sàng tuân thủ meal plan',
    jobType: '', trainingTime: '', targetDuration: '', sleep: '',
    cookHabit: '', cookTime: '', diet: '', favFood: '', avoidFood: '', budget: '',
    medical: '', supplements: ''
  });

  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (sectionName) => {
    setExpandedSection(expandedSection === sectionName ? null : sectionName);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone || !formData.dob || !formData.height || !formData.trainingHistory || !formData.goal) {
      alert("Vui lòng điền đầy đủ các trường bắt buộc có dấu (*)");
      return;
    }
    onSave(formData);
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncAPI = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setFormData({
        name: 'Trần Văn Demo', dob: '1995-05-15', gender: 'Nam', phone: '0901234567', height: '175',
        trainingHistory: 'Đã tập gym được 6 tháng nhưng chưa thấy thay đổi.', goal: 'Giảm cân, Cắt nét', commitment: 'Sẵn sàng tuân thủ meal plan',
        jobType: 'Hành chính 8-10 tiếng', trainingTime: 'Từ 30-60 phút', targetDuration: '3 tháng', sleep: 'Ngủ lúc 11h, 7 tiếng/ngày',
        cookHabit: 'Tự nấu', cookTime: '30-60 phút', diet: 'Không', favFood: 'Thịt bò, ức gà, trứng', avoidFood: 'Dị ứng hải sản', budget: '3 triệu',
        medical: 'Hơi đau lưng dưới do ngồi nhiều', supplements: 'Whey Protein'
      });
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] overflow-y-auto px-6 animate-slide-up hide-scrollbar">
      <div className="absolute top-0 right-0 w-full h-[300px] bg-gradient-to-b from-[#2a2a2c]/30 to-[#0a0a0a] pointer-events-none"></div>
      
      {/* HEADER STICKY: Đã fix lỗi đè chữ. Tạo lớp nền che khuất content bên dưới */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05]">
        <div className="flex justify-between items-center">
           <button onClick={onBack} className="p-3 bg-white/[0.05] border border-white/10 rounded-full text-white shadow-md hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
           <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Onboarding Form</h2>
           <button onClick={handleSyncAPI} className={`p-3 rounded-full text-blue-400 bg-blue-500/10 border border-blue-500/20 shadow-md transition-all ${isSyncing ? 'animate-spin' : 'hover:bg-blue-500/20'}`}>
              <RefreshCw className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="flex-1 relative z-10 pb-12 pt-4">
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-white tracking-tight mb-2">New Client Profile</h1>
          <p className="text-neutral-500 text-sm">Cập nhật thông tin học viên. Bấm vào icon góc trên bên phải để giả lập Sync Data từ Google Form.</p>
        </div>

        <div className="space-y-4">
          
          {/* PHẦN 1: THÔNG TIN BẮT BUỘC */}
          <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px]">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white text-sm font-medium">1. Thông tin bắt buộc (*)</h3>
            </div>
            <div className="space-y-4">
              <div><input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Họ và Tên *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm" /></div>
                <div><select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm"><option>Nam</option><option>Nữ</option><option>Không muốn nêu cụ thể</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="SĐT Liên lạc *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                <div><input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Chiều cao *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
              </div>
              <div><input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="Mục tiêu chính (Giảm cân, tăng cơ...) *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
              <div><textarea name="trainingHistory" value={formData.trainingHistory} onChange={handleChange} rows="2" placeholder="Lịch sử tập luyện trước đây? *" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm resize-none"></textarea></div>
              <div><select name="commitment" value={formData.commitment} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-neutral-400 text-sm"><option>Sẵn sàng tuân thủ meal plan *</option><option>Có thể tuân thủ phần lớn</option><option>Hơi khó vì bận công việc</option></select></div>
            </div>
          </div>

          {/* PHẦN 2: SINH HOẠT */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
            <div onClick={() => toggleSection('goals')} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><h3 className="text-white text-sm font-medium">2. Sinh hoạt & Chế độ</h3></div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'goals' ? 'rotate-180' : ''}`} />
            </div>
            {expandedSection === 'goals' && (
              <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4 animate-in fade-in slide-in-from-top-2">
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Tính chất công việc</label><input type="text" name="jobType" value={formData.jobType} onChange={handleChange} placeholder="Hành chính, tự do..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Thời gian tập/ngày</label><input type="text" name="trainingTime" value={formData.trainingTime} onChange={handleChange} placeholder="30-60 phút" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                  <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Đạt mục tiêu trong</label><input type="text" name="targetDuration" value={formData.targetDuration} onChange={handleChange} placeholder="3 tháng, 6 tháng..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                </div>
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Giấc ngủ mỗi tối</label><input type="text" name="sleep" value={formData.sleep} onChange={handleChange} placeholder="VD: 11h ngủ, ngủ 7 tiếng" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
              </div>
            )}
          </div>

          {/* PHẦN 3: DINH DƯỠNG */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
            <div onClick={() => toggleSection('nutrition')} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /><h3 className="text-white text-sm font-medium">3. Dinh dưỡng & Bếp núc</h3></div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'nutrition' ? 'rotate-180' : ''}`} />
            </div>
            {expandedSection === 'nutrition' && (
              <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Thói quen ăn uống</label><input type="text" name="cookHabit" value={formData.cookHabit} onChange={handleChange} placeholder="Tự nấu, order..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                  <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Thời gian nấu/ngày</label><input type="text" name="cookTime" value={formData.cookTime} onChange={handleChange} placeholder="Dưới 30 phút..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                </div>
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Có đang theo chế độ ăn kiêng nào không?</label><input type="text" name="diet" value={formData.diet} onChange={handleChange} placeholder="VD: Eat clean, Keto..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Thực phẩm yêu thích</label><input type="text" name="favFood" value={formData.favFood} onChange={handleChange} placeholder="Thịt bò, ức gà..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Thực phẩm không ăn/dị ứng</label><input type="text" name="avoidFood" value={formData.avoidFood} onChange={handleChange} placeholder="Hải sản, đậu phộng..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Ngân sách thực phẩm hàng tháng</label><input type="text" name="budget" value={formData.budget} onChange={handleChange} placeholder="VD: 3.000.000 VND" className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
              </div>
            )}
          </div>

          {/* PHẦN 4: Y TẾ */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[24px] overflow-hidden">
            <div onClick={() => toggleSection('medical')} className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-400" /><h3 className="text-white text-sm font-medium">4. Sức khỏe & Y tế</h3></div>
              <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'medical' ? 'rotate-180' : ''}`} />
            </div>
            {expandedSection === 'medical' && (
              <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4 animate-in fade-in slide-in-from-top-2">
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Vấn đề sức khỏe cần lưu ý</label><textarea name="medical" value={formData.medical} onChange={handleChange} rows="2" placeholder="Tiểu đường, tim mạch, xương khớp..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm resize-none"></textarea></div>
                <div><label className="text-[10px] text-neutral-500 ml-1 mb-1 block">Thuốc / TPBS đang dùng</label><input type="text" name="supplements" value={formData.supplements} onChange={handleChange} placeholder="Whey, Vitamin..." className="w-full bg-black/50 border border-white/10 rounded-[12px] p-3 text-white text-sm" /></div>
              </div>
            )}
          </div>

          {/* NÚT LƯU HIỂN THỊ CỐ ĐỊNH Ở CUỐI FORM */}
          <div className="mt-8 pb-4">
            <button onClick={handleSave} className="w-full bg-white text-black font-bold py-4 rounded-[20px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_40px_rgba(255,255,255,0.2)]">
              <CheckCircle2 className="w-5 h-5" /> Lưu Hồ Sơ Khách Hàng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- GIAO DIỆN DANH SÁCH HỌC VIÊN ---
const ClientListView = ({ clients, onSelectClient, onOpenAdd }) => {
  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000] px-6 py-8 pb-32 overflow-y-auto hide-scrollbar">
      <div className="flex justify-between items-center mb-8 shrink-0">
         <div><h1 className="text-2xl font-medium text-white tracking-tight">Client Pool</h1><p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mt-1">Total: {clients.length} Active</p></div>
         <button onClick={onOpenAdd} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"><UserPlus className="w-5 h-5" /></button>
      </div>
      {clients.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 text-center mt-10"><Users className="w-12 h-12 mb-4 text-neutral-600/50" /><p className="text-sm text-neutral-400">Chưa có khách hàng.</p><p className="text-[10px] mt-2 text-neutral-500 uppercase tracking-widest">Nhấn dấu + để thêm</p></div>
      ) : (
         <div className="space-y-4">
            {clients.map(c => (
              <div key={c.id} onClick={() => onSelectClient(c)} className="bg-white/[0.03] border border-white/5 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.05] transition-all active:scale-[0.98]">
                 <img src={c.avatar} className="w-12 h-12 rounded-full border border-white/10 bg-white" alt="avatar" />
                 <div className="flex-1 min-w-0"><h3 className="text-white font-medium text-sm truncate">{c.name}</h3><p className="text-blue-400 text-[10px] font-bold uppercase truncate mt-0.5">{c.goal}</p></div>
                 <div className="text-right mr-3"><p className="text-[10px] font-black text-neutral-500 uppercase">Phone</p><p className="text-xs font-bold text-white">{c.phone}</p></div>
                 <ChevronRight className="w-4 h-4 text-neutral-600" />
              </div>
            ))}
         </div>
      )}
    </div>
  );
};

// --- TRANG CHỦ & TRANG CHI TIẾT ---
const DashboardView = ({ onSelectClient }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    const elId = 'date-btn-' + selectedDate.toDateString();
    const el = document.getElementById(elId);
    if (el) { el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
  }, [viewDate, selectedDate]);

  const nextMonth = () => { const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); setViewDate(next); setSelectedDate(next); };
  const prevMonth = () => { const prev = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); setViewDate(prev); setSelectedDate(prev); };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1));

  return (
    <div className="h-screen flex flex-col relative z-10 bg-gradient-to-b from-[#2a2a2c] via-[#121212] to-[#000000]">
      <div className="flex justify-between items-center p-6 shrink-0"><div className="flex items-center gap-4"><img src="https://i.pravatar.cc/150?u=coach" className="w-12 h-12 rounded-full border border-white/10 grayscale-[20%]" /><div><p className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">Aesthetics Hub</p><h1 className="text-xl font-medium text-white tracking-tight">Coach Hoang</h1></div></div><button className="p-3 bg-black border border-white/10 rounded-full text-white shadow-lg"><Bell className="w-5 h-5" /></button></div>
      <div className="px-6 mb-8 shrink-0">
        <div className="flex justify-between items-center mb-5"><h2 className="text-2xl font-light text-white tracking-tight">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</h2><div className="flex gap-2"><button onClick={prevMonth} className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4 text-white"/></button><button onClick={nextMonth} className="p-2 bg-white/[0.05] rounded-full hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4 text-white"/></button></div></div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth">{days.map(dateObj => {
            const isSelected = dateObj.toDateString() === selectedDate.toDateString();
            const dayNum = dateObj.getDate();
            const shortDay = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); 
            return (<button key={dateObj.toISOString()} id={'date-btn-' + dateObj.toDateString()} onClick={() => setSelectedDate(dateObj)} className={`flex flex-col items-center justify-center min-w-[58px] h-[84px] rounded-[22px] border transition-all shrink-0 ${isSelected ? 'bg-black border-white/20 shadow-2xl scale-100' : 'bg-white/[0.03] border-white/[0.05] text-neutral-600 hover:bg-white/[0.08]'}`}><span className="text-[10px] font-bold uppercase mb-1">{shortDay}</span><span className="text-lg font-semibold">{dayNum}</span></button>)
          })}</div>
      </div>
      <div className="px-6 mb-4 flex justify-between items-end shrink-0"><h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Work Timeline</h2><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div><span className="text-[9px] font-black text-neutral-400 uppercase">Live</span></div></div>
      <div className="flex-1 overflow-y-auto px-6 pb-32 hide-scrollbar"><div className="relative border-l border-white/5 ml-[54px] pl-6 space-y-8"><div className="text-center text-neutral-500 text-[10px] uppercase font-black tracking-widest mt-10">No sessions scheduled</div></div></div>
    </div>
  );
}

const ClientDetailView = ({ client, onBack, activeTab, setActiveTab }) => {
  return (
    <div className="h-screen flex flex-col relative z-20 bg-[#0a0a0a] animate-slide-up overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-[350px] bg-gradient-to-b from-[#2a2a2c]/40 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none"></div>
      <div className="flex justify-between items-center p-6 shrink-0 relative z-50"><button onClick={onBack} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white border border-white/10 shadow-md"><ArrowLeft className="w-5 h-5" /></button><h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Profile Settings</h2><button className="p-3 bg-white/[0.03] rounded-full text-neutral-400 border border-white/5"><MoreHorizontal className="w-5 h-5" /></button></div>
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-40 relative z-10 px-6">
        <div className="flex items-center gap-5 mt-4 mb-8">
           <div className="relative shrink-0"><img src={client.avatar} className="w-20 h-20 rounded-full border-2 border-white/10 shadow-2xl bg-white" alt={client.name}/><div className="absolute -bottom-1 -right-1 bg-white text-black rounded-full p-1 border border-black"><Award className="w-3 h-3" /></div></div>
           <div className="flex-1 min-w-0"><h1 className="text-2xl font-medium text-white tracking-tight">{client.name}</h1><span className="text-blue-400 text-[10px] font-black uppercase tracking-wider">{client.goal}</span><div className="mt-4"><p className="text-xs text-neutral-400"><Phone className="w-3 h-3 inline mr-1"/> {client.phone}</p></div></div>
        </div>
        <div className="mb-8"><div className="flex bg-white/[0.03] backdrop-blur-xl p-1 rounded-[20px] border border-white/[0.05]">{['overview', 'workout', 'nutrition'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-[10px] font-bold tracking-wider uppercase rounded-[16px] transition-all ${activeTab === tab ? 'bg-black text-white shadow-lg border border-white/10' : 'text-neutral-600'}`}>{tab}</button>))}</div></div>
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-slide-up">
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-black/60 border border-white/10 p-4 rounded-[24px] text-center shadow-lg"><p className="text-[14px] text-white font-medium">{client.height} cm</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Height</p></div>
               <div className="bg-black/60 border border-white/10 p-4 rounded-[24px] text-center shadow-lg"><p className="text-[14px] text-white font-medium">{client.gender}</p><p className="text-[8px] text-neutral-600 font-black uppercase mt-1">Gender</p></div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[24px]">
               <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Medical / Notes</h3>
               <p className="text-sm text-neutral-300 leading-relaxed">{client.medical}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function App() {
  const [session, setSession] = useState(null); 
  const [activeTab, setActiveTab] = useState('home');
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [clients, setClients] = useState([]); 

  const handleBack = () => { setSelectedClient(null); setDetailTab('overview'); };

  const handleAddClient = (formData) => {
    const newClient = {
      id: Date.now(),
      name: formData.name,
      phone: formData.phone,
      gender: formData.gender,
      height: formData.height,
      medical: formData.medical || "Không có vấn đề sức khỏe đặc biệt",
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${formData.name}&backgroundColor=eceff4`, 
      goal: formData.goal,
      package: { total: 12, bonus: 0, completed: 0, remaining: 12 },
      status: "active",
      sessionHistory: []
    };
    
    setClients([...clients, newClient]);
    setActiveTab('clients'); 
  };

  if (!session) { return <div className="min-h-screen bg-[#050505] font-sans flex justify-center"><div className="w-full max-w-[420px] h-screen relative shadow-2xl border-x border-white/[0.05] overflow-hidden flex flex-col bg-black"><AuthScreen onLogin={(user) => setSession(user)} /></div></div>; }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans flex justify-center selection:bg-white/20">
      <div className="w-full max-w-[420px] h-screen relative shadow-2xl md:border-x border-white/[0.05] overflow-hidden flex flex-col bg-black">
        <GlobalStyles />
        <div className="absolute top-[-5%] left-[-15%] w-[120%] h-[300px] bg-white/[0.02] blur-[120px] pointer-events-none"></div>

        {!selectedClient ? (
          <>
            {activeTab === 'home' && <DashboardView onSelectClient={setSelectedClient} />}
            {activeTab === 'clients' && <ClientListView clients={clients} onSelectClient={setSelectedClient} onOpenAdd={() => setActiveTab('add_client')} />}
            {activeTab === 'add_client' && <AddClientView onBack={() => setActiveTab('clients')} onSave={handleAddClient} />}
            {activeTab !== 'add_client' && <FloatingBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
          </>
        ) : (
          <>
            <ClientDetailView client={selectedClient} onBack={handleBack} activeTab={detailTab} setActiveTab={setDetailTab} />
            <DetailActionNav onRecordWorkout={() => setIsRecordModalOpen(true)} activeTab={detailTab} setActiveTab={setDetailTab} />
            <RecordWorkoutModal isOpen={isRecordModalOpen} onClose={() => setIsRecordModalOpen(false)} clientName={selectedClient.name} />
          </>
        )}
      </div>
    </div>
  );
}