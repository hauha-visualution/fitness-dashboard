import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Flame, Battery, BatteryMedium, BatteryWarning, PenTool, Plus } from 'lucide-react';
import CreateTemplateModal from './CreateTemplateModal';

const toLocalISOString = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const QuickLogSheet = ({ onClose, session }) => {
  const [todaySessions, setTodaySessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  
  const [segment, setSegment] = useState('pack'); // 'pack' or 'single'
  const [feeling, setFeeling] = useState(null); // 'tired', 'ok', 'good', 'fire'
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [cancelReason, setCancelReason] = useState('Bận đột xuất');
  const [customReason, setCustomReason] = useState('');

  // Fetch today's sessions
  useEffect(() => {
    const fetchToday = async () => {
      const coachEmail = session?.user?.email;
      if (!coachEmail) { setLoading(false); return; }
      
      const { data: clients } = await supabase.from('clients').select('id, name').eq('coach_email', coachEmail);
      if (!clients?.length) { setLoading(false); return; }
      
      const clientIds = clients.map(c => c.id);
      const todayStr = toLocalISOString(new Date());
      
      const { data: sData } = await supabase
        .from('sessions')
        .select('*')
        .in('client_id', clientIds)
        .eq('scheduled_date', todayStr)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_time');
        
      const clientMap = {};
      clients.forEach(c => clientMap[c.id] = c);
      
      const enriched = (sData || []).map(s => ({ ...s, client_name: clientMap[s.client_id]?.name }));
      setTodaySessions(enriched);
      
      // Auto-select nearest or in-progress
      if (enriched.length > 0) {
        const inProgress = enriched.find(s => s.status === 'in_progress');
        if (inProgress) setSelectedSessionId(inProgress.id);
        else setSelectedSessionId(enriched[0].id); // Just pick first for now
      }
      setLoading(false);
    };
    fetchToday();
  }, [session]);

  const handleSave = async (status) => {
    if (!selectedSessionId || selectedSessionId === 'new') return; // skipping custom creation logic for now
    
    setSaving(true);
    const updates = { 
        status, 
        feeling, 
        notes, 
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        cancelled_at: status === 'cancelled' ? new Date().toISOString() : null,
        cancel_reason: status === 'cancelled' ? (cancelReason === 'Lý do khác' ? customReason : cancelReason) : null
    };
    
    await supabase.from('sessions').update(updates).eq('id', selectedSessionId);
    setSaving(false);
    onClose();
    // Optional: could trigger a global refresh via an event or context
  };

  const selectedSession = todaySessions.find(s => s.id === selectedSessionId);

  // --- RENDERS ---
  if (showCancelReason) {
    return (
      <div className="fixed inset-0 z-[600] flex animate-slide-up">
        {/* Transparent overlay blocks interactions below */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCancelReason(false)} />
        <div className="absolute bottom-0 w-full bg-[#1a1a1c] border-t border-white/10 rounded-t-[32px] p-6 pb-10 shadow-2xl flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-white font-bold text-lg">Lý do hủy buổi tập</h2>
            <button onClick={() => setShowCancelReason(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-neutral-400" /></button>
          </div>
          
          {['Bận đột xuất', 'Không khoẻ', 'Trainer yêu cầu nghỉ', 'Lý do khác'].map(r => (
             <button key={r} onClick={() => setCancelReason(r)} className={`p-4 rounded-[16px] border text-left font-medium transition-all ${cancelReason === r ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/[0.04] border-white/10 text-white'}`}>
                {r}
             </button>
          ))}
          
          {cancelReason === 'Lý do khác' && (
             <input type="text" placeholder="Nhập lý do..." value={customReason} onChange={e => setCustomReason(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[14px] p-4 text-white outline-none focus:border-red-500/30" />
          )}
          
          <button onClick={() => handleSave('cancelled')} disabled={saving || (cancelReason === 'Lý do khác' && !customReason)} className="mt-4 w-full py-4 bg-red-500 text-white font-bold rounded-[18px] active:scale-95 transition-all disabled:opacity-50">
             Xác nhận Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sheet */}
      <div className="absolute bottom-0 w-full bg-[#0d0d0d] border-t border-white/10 rounded-t-[32px] flex flex-col p-6 pb-10 gap-5 animate-slide-up max-h-[90vh] overflow-y-auto hide-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-center">
           <div>
              <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Aesthetics Hub</p>
              <h2 className="text-xl font-bold text-white">Quick Log</h2>
           </div>
           <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-neutral-400" /></button>
        </div>

        {/* [A] Chọn buổi tập */}
        <div>
           <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Buổi tập hôm nay</p>
           <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
             {loading ? <div className="text-neutral-500 text-sm">Đang tải...</div> : todaySessions.map(s => (
               <button 
                  key={s.id} onClick={() => setSelectedSessionId(s.id)}
                  className={`shrink-0 px-4 py-2 border rounded-[12px] text-sm transition-all ${selectedSessionId === s.id ? 'bg-white/[0.08] border-white/20 text-white font-medium' : 'bg-white/[0.04] border-white/[0.08] text-neutral-500'}`}
               >
                 {s.client_name} • {s.scheduled_time?.slice(0,5)}
               </button>
             ))}
             <button 
                onClick={() => setSelectedSessionId('new')}
                className={`shrink-0 px-4 py-2 border rounded-[12px] text-sm transition-all flex items-center gap-1 ${selectedSessionId === 'new' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 font-medium' : 'bg-white/[0.04] border-white/[0.08] text-blue-400/50 block border-dashed'}`}
             >
                + Tự tạo
             </button>
           </div>
        </div>

        {/* [B] Segment control */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[16px] p-1 flex gap-1">
           <button onClick={() => setSegment('pack')} className={`flex-1 py-2 text-sm transition-all rounded-[12px] ${segment === 'pack' ? 'bg-white/[0.08] text-white font-semibold shadow-sm' : 'text-neutral-500'}`}>Gói bài tập</button>
           <button onClick={() => setSegment('single')} className={`flex-1 py-2 text-sm transition-all rounded-[12px] ${segment === 'single' ? 'bg-white/[0.08] text-white font-semibold shadow-sm' : 'text-neutral-500'}`}>Bài tập lẻ</button>
        </div>

        {/* Placeholder for Body based on Segment */}
        {segment === 'pack' ? (
           <div className="bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 text-center">
             <PenTool className="w-6 h-6 mx-auto mb-2 text-neutral-700" />
             <p className="text-xs text-neutral-500 mb-3">(Tính năng chọn Template Exercises sẽ nằm ở đây)</p>
             <button onClick={() => setShowCreateTemplate(true)} className="px-4 py-2 border border-white/10 rounded-[12px] text-xs font-bold text-white bg-white/5 active:scale-95 transition-all">
               + Tạo gói bài tập mới
             </button>
             {showCreateTemplate && <CreateTemplateModal session={session} onClose={() => setShowCreateTemplate(false)} />}
           </div>
        ) : (
           <textarea placeholder="Ghi chú các bài tập đã thực hiện..." className="w-full bg-white/[0.02] border border-white/[0.05] rounded-[14px] py-3 px-4 text-white text-sm outline-none focus:border-white/20 resize-none h-24" />
        )}

        {/* [C] Cảm giác */}
        <div>
           <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Thể trạng học viên</p>
           <div className="grid grid-cols-4 gap-2">
              {[ {id:'tired', label:'Mệt', Icon:BatteryWarning, col:'red'}, {id:'ok', label:'Ổn', Icon:Battery, col:'yellow'}, {id:'good', label:'Tốt', Icon:BatteryMedium, col:'emerald'}, {id:'fire', label:'Bùng nổ', Icon:Flame, col:'purple'} ].map(f => (
                 <button key={f.id} onClick={() => setFeeling(f.id)} className={`flex flex-col items-center justify-center py-3 border rounded-[14px] transition-all gap-1.5 ${feeling === f.id ? `bg-${f.col}-500/15 border-${f.col}-500/30 text-${f.col}-400` : 'bg-white/[0.03] border-white/[0.05] text-neutral-500 hover:bg-white/[0.05]'}`}>
                    <f.Icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{f.label}</span>
                 </button>
              ))}
           </div>
        </div>

        {/* [D] Ghi chú nhanh */}
        <div>
           <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Ghi chú thêm (Tùy chọn)</p>
           <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nhập ghi chú..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-2.5 px-4 text-white text-sm outline-none focus:border-white/30 resize-none h-20" />
        </div>

        {/* [E] 3 Buttons */}
        <div className="flex gap-2 mt-2">
           <button onClick={() => handleSave('in_progress')} disabled={saving || !selectedSessionId || selectedSessionId === 'new'} className="flex-1 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-[18px] text-white font-bold text-sm text-center active:scale-95 transition-all disabled:opacity-50">
             Lưu tạm
           </button>
           <button onClick={() => handleSave('completed')} disabled={saving || !selectedSessionId || selectedSessionId === 'new'} className="flex-1 py-3.5 bg-white text-black font-bold text-sm rounded-[18px] text-center active:scale-[0.98] transition-all disabled:opacity-50">
             Hoàn thành
           </button>
        </div>
        <button onClick={() => setShowCancelReason(true)} disabled={saving || !selectedSessionId || selectedSessionId === 'new'} className="w-full py-3 text-red-400 text-sm font-bold text-center bg-red-500/10 border border-red-500/20 rounded-[18px] active:scale-95 transition-all disabled:opacity-50">
           Hủy buổi tập này
        </button>

      </div>
    </div>
  );
};

export default QuickLogSheet;
