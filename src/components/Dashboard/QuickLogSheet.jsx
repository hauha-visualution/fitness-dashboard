import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Flame, Battery, BatteryMedium, BatteryWarning, PenTool, Plus, GripVertical, Trash2 } from 'lucide-react';
import CreateTemplateModal from './CreateTemplateModal';

const toLocalISOString = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const createExerciseDraft = (id) => ({
  id,
  name: '',
  sets: 3,
  reps: 10,
  video_url: '',
});

const QuickLogSheet = ({ onClose, session, onSaved }) => {
  const [todaySessions, setTodaySessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isManualSessionMode, setIsManualSessionMode] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientSessions, setClientSessions] = useState([]);
  const [loadingClientSessions, setLoadingClientSessions] = useState(false);

  const exerciseIdRef = useRef(1);
  const [exercises, setExercises] = useState([createExerciseDraft('exercise-0')]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  
  const [segment, setSegment] = useState('pack'); // 'pack' or 'single'
  const [feeling, setFeeling] = useState(null); // 'tired', 'ok', 'good', 'fire'
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [cancelReason, setCancelReason] = useState('Bận đột xuất');
  const [customReason, setCustomReason] = useState('');
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const coachEmail = session?.user?.email;
    if (!coachEmail) return;
    setLoadingTemplates(true);
    const { data: tmpls } = await supabase
      .from('workout_templates')
      .select('id, name, template_exercises(*)')
      .eq('coach_email', coachEmail)
      .order('created_at', { ascending: false });
    
    if (tmpls) setTemplates(tmpls);
    setLoadingTemplates(false);
  }, [session]);

  const fetchToday = useCallback(async () => {
    const coachEmail = session?.user?.email;
    if (!coachEmail) { setLoading(false); return; }
    
    const { data: clientsData } = await supabase.from('clients').select('id, name').eq('coach_email', coachEmail);
    if (!clientsData?.length) { setLoading(false); return; }
    
    setClients(clientsData);
    const clientIds = clientsData.map(c => c.id);
    const todayStr = toLocalISOString(new Date());
    
    const { data: sData } = await supabase
      .from('sessions')
      .select('*')
      .in('client_id', clientIds)
      .eq('scheduled_date', todayStr)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_time');
      
    const clientMap = {};
    clientsData.forEach(c => clientMap[c.id] = c);
    
    const enriched = (sData || []).map(s => ({ ...s, client_name: clientMap[s.client_id]?.name }));
    setTodaySessions(enriched);
    
    if (enriched.length > 0) {
      const inProgress = enriched.find(s => s.status === 'in_progress');
      if (inProgress) setSelectedSessionId(inProgress.id);
      else setSelectedSessionId(enriched[0].id);
    }
    setLoading(false);
  }, [session]);

  const fetchClientSessions = useCallback(async (clientId) => {
    if (!clientId) {
      setClientSessions([]);
      return;
    }

    setLoadingClientSessions(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('id, session_number, scheduled_date, scheduled_time, status')
      .eq('client_id', clientId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false });

    if (error) {
      console.error('Load client sessions error:', error.message);
      setClientSessions([]);
      setLoadingClientSessions(false);
      alert(`Không tải được danh sách buổi tập: ${error.message}`);
      return;
    }

    setClientSessions(data || []);
    setLoadingClientSessions(false);
  }, []);

  // Fetch today's sessions
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchToday();
      void fetchTemplates();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchTemplates, fetchToday]);

  const updateExercise = (id, field, value) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };
  const removeExercise = (id) => {
    setExercises(prev => prev.length === 1 ? prev : prev.filter(ex => ex.id !== id));
  };
  const addExercise = () => {
    const nextId = `exercise-${exerciseIdRef.current++}`;
    setExercises(prev => [...prev, createExerciseDraft(nextId)]);
  };

  const handleDragStart = (e, index) => { setDraggedIdx(index); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.classList.add('opacity-50'); };
  const handleDragEnd = (e) => { setDraggedIdx(null); e.currentTarget.classList.remove('opacity-50'); };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    const newEx = [...exercises];
    const draggedItem = newEx[draggedIdx];
    newEx.splice(draggedIdx, 1);
    newEx.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    setExercises(newEx);
  };

  const handleSelectTodaySession = (sessionId) => {
    setIsManualSessionMode(false);
    setSelectedClientId(null);
    setClientSessions([]);
    setSelectedSessionId(sessionId);
  };

  const handleStartManualSessionSelection = () => {
    setIsManualSessionMode(true);
    setSelectedSessionId(null);
    setSelectedClientId(null);
    setClientSessions([]);
  };

  const handleSelectClient = async (clientId) => {
    setSelectedClientId(clientId);
    setSelectedSessionId(null);
    await fetchClientSessions(clientId);
  };

  const handleSave = async (status) => {
    if (!selectedSessionId) return;
    
    setSaving(true);

    try {
      let finalWorkoutData = null;
      if (segment === 'pack' && selectedTemplateId) {
        const selectedTmpl = templates.find(t => t.id === selectedTemplateId);
        if (selectedTmpl && selectedTmpl.template_exercises) {
          finalWorkoutData = selectedTmpl.template_exercises;
        }
      } else if (segment === 'single') {
        finalWorkoutData = exercises
          .filter(ex => ex.name.trim())
          .map((ex, idx) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            video_url: ex.video_url || null,
            sort_order: idx,
          }));
      }
      
      const currTimeIso = new Date().toISOString();
      const updates = { 
          status, 
          feeling, 
          notes, 
          completed_at: status === 'completed' ? currTimeIso : null,
          cancelled_at: status === 'cancelled' ? currTimeIso : null,
          cancel_reason: status === 'cancelled' ? (cancelReason === 'Lý do khác' ? customReason : cancelReason) : null,
          ...(finalWorkoutData ? { workout_data: finalWorkoutData } : {})
      };

      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', selectedSessionId)
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      onClose();
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Quick log save error:', error.message);
      alert(`Không thể lưu Quick Log: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedSession = todaySessions.find(s => s.id === selectedSessionId);
  const manuallySelectedSession = clientSessions.find(s => s.id === selectedSessionId);
  const selectedClientName = isManualSessionMode
    ? clients.find(c => c.id === selectedClientId)?.name
    : selectedSession?.client_name;
  const selectedSessionTime = isManualSessionMode
    ? (manuallySelectedSession
        ? `${manuallySelectedSession.scheduled_date} • ${manuallySelectedSession.scheduled_time?.slice(0, 5)}`
        : 'Chọn một buổi tập')
    : selectedSession?.scheduled_time?.slice(0, 5);
  const hasSingleWorkoutData = exercises.some(ex => ex.name.trim());

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
                  key={s.id} onClick={() => handleSelectTodaySession(s.id)}
                  className={`shrink-0 px-4 py-2 border rounded-[12px] text-sm transition-all ${selectedSessionId === s.id ? 'bg-white/[0.08] border-white/20 text-white font-medium' : 'bg-white/[0.04] border-white/[0.08] text-neutral-500'}`}
               >
                 {s.client_name} • {s.scheduled_time?.slice(0,5)}
               </button>
             ))}
             <button 
                onClick={handleStartManualSessionSelection}
                className={`shrink-0 px-4 py-2 border rounded-[12px] text-sm transition-all flex items-center gap-1 ${isManualSessionMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 font-medium' : 'bg-white/[0.04] border-white/[0.08] text-blue-400/50 block border-dashed'}`}
             >
                + Tự tạo
             </button>
           </div>
        </div>
         {/* [A2] Client/session selector in manual mode */}
         {isManualSessionMode && (
          <div>
             <p className="text-[9px] font-black uppercase tracking-widest mb-3 text-blue-400">Chọn học viên rồi chọn buổi tập có sẵn để ghi nhận log</p>
             <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
               {clients.map(c => (
                 <button 
                    key={c.id} onClick={() => handleSelectClient(c.id)}
                    className={`shrink-0 px-4 py-2 border rounded-[12px] text-sm transition-all ${selectedClientId === c.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 font-medium' : 'bg-white/[0.04] border-white/[0.08] text-neutral-500 hover:bg-white/[0.08]'}`}
                 >
                   {c.name}
                 </button>
               ))}
             </div>

             {selectedClientId && (
               <div className="mt-3 space-y-2">
                 {loadingClientSessions ? (
                   <div className="text-sm text-neutral-500 py-2">Đang tải session của học viên...</div>
                 ) : clientSessions.length === 0 ? (
                   <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] px-4 py-3 text-sm text-neutral-500">
                     Học viên này chưa có session nào ở trạng thái scheduled hoặc in_progress.
                   </div>
                 ) : (
                   clientSessions.map(sessionOption => (
                     <button
                       key={sessionOption.id}
                       onClick={() => setSelectedSessionId(sessionOption.id)}
                       className={`w-full text-left px-4 py-3 rounded-[14px] border transition-all ${
                         selectedSessionId === sessionOption.id
                           ? 'bg-white/[0.08] border-white/20 text-white'
                           : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:bg-white/[0.05]'
                       }`}
                     >
                       <div className="flex items-center justify-between gap-3">
                         <div>
                           <p className="text-sm font-semibold">Buổi #{sessionOption.session_number}</p>
                           <p className="text-[11px] text-neutral-500 mt-1">
                             {sessionOption.scheduled_date} • {sessionOption.scheduled_time?.slice(0, 5)}
                           </p>
                         </div>
                         <div className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                           sessionOption.status === 'in_progress'
                             ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                             : 'bg-white/[0.04] border border-white/[0.08] text-neutral-500'
                         }`}>
                           {sessionOption.status === 'in_progress' ? 'Lưu tạm' : 'Chưa tập'}
                         </div>
                       </div>
                     </button>
                   ))
                 )}
               </div>
             )}
          </div>
         )}
        {/* [B] Segment control */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[16px] p-1 flex gap-1">
           <button onClick={() => setSegment('pack')} className={`flex-1 py-2 text-sm transition-all rounded-[12px] ${segment === 'pack' ? 'bg-white/[0.08] text-white font-semibold shadow-sm' : 'text-neutral-500'}`}>Gói bài tập</button>
           <button onClick={() => setSegment('single')} className={`flex-1 py-2 text-sm transition-all rounded-[12px] ${segment === 'single' ? 'bg-white/[0.08] text-white font-semibold shadow-sm' : 'text-neutral-500'}`}>Bài tập lẻ</button>
        </div>

        {selectedSessionId && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-[18px] p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-1">Buổi đang log</p>
              <p className="text-sm font-semibold text-white truncate">{selectedClientName || 'Chưa chọn học viên'}</p>
            </div>
            <div className="shrink-0 rounded-full bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-400">
              {selectedSessionTime || '--:--'}
            </div>
          </div>
        )}

        {/* Placeholder for Body based on Segment */}
        {segment === 'pack' ? (
           <div className="flex flex-col gap-3">
             {loadingTemplates ? (
               <div className="text-center text-sm text-neutral-500 py-4">Đang tải gói bài tập...</div>
             ) : templates.length === 0 ? (
               <div className="bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4 text-center">
                 <PenTool className="w-6 h-6 mx-auto mb-2 text-neutral-700" />
                 <p className="text-xs text-neutral-500 mb-3">Chưa có gói bài tập nào.</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 gap-2">
                 {templates.map(t => (
                   <button 
                     key={t.id} 
                     onClick={() => setSelectedTemplateId(t.id)}
                     className={`p-3 rounded-[16px] border text-left flex flex-col gap-1 transition-all ${selectedTemplateId === t.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'}`}
                   >
                     <p className={`font-semibold text-sm line-clamp-2 leading-snug ${selectedTemplateId === t.id ? 'text-blue-400' : 'text-white'}`}>{t.name}</p>
                     <p className="text-[10px] text-neutral-500 font-medium">{t.template_exercises?.length || 0} bài tập</p>
                   </button>
                 ))}
               </div>
             )}
             <button onClick={() => setShowCreateTemplate(true)} className="mt-2 w-full py-3.5 border border-dashed border-white/20 rounded-[14px] text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all">
               + Tạo gói bài tập mới
             </button>
             {showCreateTemplate && <CreateTemplateModal session={session} onClose={() => { setShowCreateTemplate(false); fetchTemplates(); }} />}
           </div>
        ) : (
           <div className="flex flex-col gap-3">
             <div className="bg-white/[0.02] border border-white/[0.05] rounded-[16px] p-4">
               <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Builder bài tập lẻ</p>
               <p className="text-xs text-neutral-500 leading-relaxed">Thêm nhanh danh sách bài tập đã thực hiện trong buổi này. Bạn có thể kéo để đổi thứ tự trước khi lưu.</p>
             </div>
             <div className="space-y-3">
               {exercises.map((ex, idx) => (
                 <div
                   key={ex.id}
                   draggable
                   onDragStart={(e) => handleDragStart(e, idx)}
                   onDragEnd={handleDragEnd}
                   onDragOver={(e) => handleDragOver(e, idx)}
                   className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] p-4 flex flex-col gap-3 cursor-move"
                 >
                   <div className="flex gap-3">
                     <GripVertical className="w-5 h-5 text-white/20 mt-3 shrink-0" />
                     <div className="flex-1 min-w-0">
                       <input
                         type="text"
                         placeholder={`Tên bài tập #${idx + 1}`}
                         value={ex.name}
                         onChange={e => updateExercise(ex.id, 'name', e.target.value)}
                         className="w-full bg-transparent border-b border-white/10 pb-2 text-white font-semibold text-base outline-none focus:border-white/30 transition-all"
                       />
                     </div>
                     <button
                       onClick={() => removeExercise(ex.id)}
                       disabled={exercises.length === 1}
                       className="p-2 h-fit text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>

                   <div className="pl-8 flex gap-3">
                     <div className="flex-1 flex items-center bg-white/[0.04] border border-white/[0.08] rounded-[12px] p-1">
                        <span className="text-[10px] font-black text-neutral-600 uppercase px-2 w-[45px]">Sets</span>
                        <button onClick={() => updateExercise(ex.id, 'sets', Math.max(1, ex.sets - 1))} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">-</button>
                        <span className="flex-1 text-center text-white font-semibold">{ex.sets}</span>
                        <button onClick={() => updateExercise(ex.id, 'sets', ex.sets + 1)} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">+</button>
                     </div>
                     <div className="flex-1 flex items-center bg-white/[0.04] border border-white/[0.08] rounded-[12px] p-1">
                        <span className="text-[10px] font-black text-neutral-600 uppercase px-2 w-[45px]">Reps</span>
                        <button onClick={() => updateExercise(ex.id, 'reps', Math.max(1, ex.reps - 1))} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">-</button>
                        <span className="flex-1 text-center text-white font-semibold">{ex.reps}</span>
                        <button onClick={() => updateExercise(ex.id, 'reps', ex.reps + 1)} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">+</button>
                     </div>
                   </div>

                   <div className="pl-8">
                     <input
                       type="text"
                       placeholder="Link video hướng dẫn (tuỳ chọn)"
                       value={ex.video_url}
                       onChange={e => updateExercise(ex.id, 'video_url', e.target.value)}
                       className="w-full bg-black/40 border border-white/[0.05] rounded-[10px] py-2 px-3 text-neutral-400 text-xs outline-none focus:border-white/20 transition-all"
                     />
                   </div>
                 </div>
               ))}
             </div>
             <button onClick={addExercise} className="w-full py-3.5 border border-dashed border-white/20 rounded-[18px] text-neutral-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.02] active:border-white/40 transition-all">
               <Plus className="w-4 h-4" /> Thêm bài tập
             </button>
           </div>
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
           <button onClick={() => handleSave('in_progress')} disabled={saving || !selectedSessionId || (segment === 'single' && !hasSingleWorkoutData)} className="flex-1 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-[18px] text-white font-bold text-sm text-center active:scale-95 transition-all disabled:opacity-50">
             Lưu tạm
           </button>
           <button onClick={() => handleSave('completed')} disabled={saving || !selectedSessionId || (segment === 'single' && !hasSingleWorkoutData)} className="flex-1 py-3.5 bg-white text-black font-bold text-sm rounded-[18px] text-center active:scale-[0.98] transition-all disabled:opacity-50">
             Hoàn thành
           </button>
        </div>
        <button onClick={() => setShowCancelReason(true)} disabled={saving || !selectedSessionId} className="w-full py-3 text-red-400 text-sm font-bold text-center bg-red-500/10 border border-red-500/20 rounded-[18px] active:scale-95 transition-all disabled:opacity-50">
           Hủy buổi tập này
        </button>

      </div>
    </div>
  );
};

export default QuickLogSheet;
