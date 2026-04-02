import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  X,
  Flame,
  Battery,
  BatteryMedium,
  BatteryWarning,
  PenTool,
  Plus,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  CalendarDays,
  UserRound,
} from 'lucide-react';
import CreateTemplateModal from './CreateTemplateModal';

const toLocalISOString = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatShortSessionDate = (dateStr) => {
  if (!dateStr) return '--/--';
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
};

const createExerciseDraft = (id) => ({
  id,
  name: '',
  sets: 3,
  reps: 10,
  weight: 0,
  note: '',
  is_completed: false,
});

const normalizeExerciseRow = (exercise, fallbackIndex = 0) => ({
  id: exercise.id ?? `exercise-${fallbackIndex}`,
  name: exercise.name ?? '',
  sets: Math.max(1, Number(exercise.sets) || 1),
  reps: Math.max(1, Number(exercise.reps) || 1),
  weight: Math.max(0, Number(exercise.weight) || 0),
  note: exercise.note ?? '',
  is_completed: Boolean(exercise.is_completed),
  sort_order: exercise.sort_order ?? fallbackIndex,
});

const mapWorkoutDataToDrafts = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [createExerciseDraft('exercise-0')];
  }

  return [...items]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((exercise, idx) => normalizeExerciseRow(exercise, idx));
};

const normalizeQuickLogSelection = (selection = null) => {
  if (!selection) return null;

  return {
    ...selection,
    sessionId: selection.sessionId ?? selection.id ?? null,
    id: selection.sessionId ?? selection.id ?? null,
    clientId: selection.clientId ?? selection.client_id ?? null,
    client_id: selection.clientId ?? selection.client_id ?? null,
    clientName: selection.clientName ?? selection.client_name ?? null,
    client_name: selection.clientName ?? selection.client_name ?? null,
    scheduledDate: selection.scheduledDate ?? selection.scheduled_date ?? null,
    scheduled_date: selection.scheduledDate ?? selection.scheduled_date ?? null,
    scheduledTime: selection.scheduledTime ?? selection.scheduled_time ?? null,
    scheduled_time: selection.scheduledTime ?? selection.scheduled_time ?? null,
    packageId: selection.packageId ?? selection.package_id ?? null,
    package_id: selection.packageId ?? selection.package_id ?? null,
    sessionKind: selection.sessionKind ?? selection.session_kind ?? 'fixed',
    session_kind: selection.sessionKind ?? selection.session_kind ?? 'fixed',
    manualMode: Boolean(selection.manualMode),
  };
};

const QuickLogSheet = ({ onClose, session, onSaved, initialSelection = null }) => {
  const normalizedInitialSelection = normalizeQuickLogSelection(initialSelection);
  const [todaySessions, setTodaySessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(normalizedInitialSelection?.sessionId ?? null);
  const [isManualSessionMode, setIsManualSessionMode] = useState(normalizedInitialSelection?.manualMode ?? false);
  
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(normalizedInitialSelection?.clientId ?? null);
  const [clientSessions, setClientSessions] = useState([]);
  const [directSelectedSession, setDirectSelectedSession] = useState(null);
  const [loadingClientSessions, setLoadingClientSessions] = useState(false);
  const [showAllClientSessions, setShowAllClientSessions] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(!(normalizedInitialSelection?.clientId ?? null));

  const exerciseIdRef = useRef(1);
  const [exercises, setExercises] = useState([createExerciseDraft('exercise-0')]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  
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
  const [showPackagePicker, setShowPackagePicker] = useState(true);
  const [previousWorkoutSource, setPreviousWorkoutSource] = useState(null);

  const fetchTemplates = useCallback(async () => {
    const coachEmail = session?.user?.email;
    if (!coachEmail) return;
    setLoadingTemplates(true);
    const { data: tmpls } = await supabase
      .from('workout_templates')
      .select('id, name, template_exercises(*), template_assignments(client_id)')
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
    
    if (!selectedSessionId && enriched.length > 0) {
      const inProgress = enriched.find(s => s.status === 'in_progress');
      if (inProgress) setSelectedSessionId(inProgress.id);
      else setSelectedSessionId(enriched[0].id);
    }
    setLoading(false);
  }, [selectedSessionId, session]);

  const fetchClientSessions = useCallback(async (clientId) => {
    if (!clientId) {
      setClientSessions([]);
      return [];
    }

    setLoadingClientSessions(true);
    const now = new Date();
    const toDateTime = (sessionItem) => new Date(`${sessionItem.scheduled_date}T${sessionItem.scheduled_time}`);

    const { data, error } = await supabase
      .from('sessions')
      .select('id, client_id, package_id, session_kind, session_number, scheduled_date, scheduled_time, status, workout_data')
      .eq('client_id', clientId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Load client sessions error:', error.message);
      setClientSessions([]);
      setLoadingClientSessions(false);
      alert(`Không tải được danh sách buổi tập: ${error.message}`);
      return [];
    }

    const sortedSessions = [...(data || [])].sort((a, b) => {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;

      const aDate = toDateTime(a);
      const bDate = toDateTime(b);
      const aDiff = aDate.getTime() - now.getTime();
      const bDiff = bDate.getTime() - now.getTime();

      const aPriority = aDiff >= 0 ? 0 : 1;
      const bPriority = bDiff >= 0 ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;

      if (aPriority === 0) return aDiff - bDiff;
      return bDate.getTime() - aDate.getTime();
    });

    setClientSessions(sortedSessions);
    setLoadingClientSessions(false);
    return sortedSessions;
  }, []);

  const fetchPreviousWorkoutData = useCallback(async (sessionRecord) => {
    if (!sessionRecord?.client_id || !sessionRecord?.scheduled_date) {
      return null;
    }

    const { data, error } = await supabase
      .from('sessions')
      .select('id, session_number, scheduled_date, scheduled_time, workout_data')
      .eq('client_id', sessionRecord.client_id)
      .neq('id', sessionRecord.id)
      .or(`scheduled_date.lt.${sessionRecord.scheduled_date},and(scheduled_date.eq.${sessionRecord.scheduled_date},scheduled_time.lt.${sessionRecord.scheduled_time})`)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Load previous workout data error:', error.message);
      return null;
    }

    return data;
  }, []);

  const initialSession = normalizedInitialSelection?.sessionId === selectedSessionId ? normalizedInitialSelection : null;
  const selectedSession = todaySessions.find(s => s.id === selectedSessionId);
  const manuallySelectedSession = clientSessions.find(s => s.id === selectedSessionId);
  const selectedSessionRecord = isManualSessionMode ? manuallySelectedSession : (selectedSession || directSelectedSession || initialSession);
  const selectedSessionPackageId = selectedSessionRecord?.package_id ?? selectedSessionRecord?.packageId ?? null;
  const selectedSessionKind = selectedSessionRecord?.session_kind ?? selectedSessionRecord?.sessionKind ?? 'fixed';
  const visibleClientSessions = showAllClientSessions ? clientSessions : clientSessions.slice(0, 8);
  const activeClientId = selectedSessionRecord?.client_id ?? selectedClientId ?? normalizedInitialSelection?.clientId ?? null;
  const sortedTemplates = [...templates].sort((a, b) => {
    const aAssigned = activeClientId ? (a.template_assignments || []).some((assignment) => assignment.client_id === activeClientId) : false;
    const bAssigned = activeClientId ? (b.template_assignments || []).some((assignment) => assignment.client_id === activeClientId) : false;

    if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const selectedClientName = isManualSessionMode
    ? clients.find(c => c.id === selectedClientId)?.name
    : selectedSession?.client_name || initialSession?.clientName;
  const manualSelectedClientName = clients.find(c => c.id === selectedClientId)?.name;
  const selectedSessionTime = isManualSessionMode
    ? (manuallySelectedSession
        ? `${manuallySelectedSession.scheduled_date} • ${manuallySelectedSession.scheduled_time?.slice(0, 5)}`
        : 'Chọn một buổi tập')
    : (selectedSession
        ? selectedSession.scheduled_time?.slice(0, 5)
        : initialSession?.scheduledDate
          ? `${initialSession.scheduledDate} • ${initialSession.scheduledTime?.slice(0, 5)}`
          : initialSession?.scheduledTime?.slice(0, 5));
  const hasWorkoutData = exercises.some(ex => ex.name.trim());
  const activeTemplate = templates.find(template => template.id === selectedTemplateId);

  // Fetch today's sessions
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchToday();
      void fetchTemplates();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchTemplates, fetchToday]);

  useEffect(() => {
    let isCancelled = false;

    const fetchDirectSession = async () => {
      if (!selectedSessionId || selectedSession || manuallySelectedSession || isManualSessionMode) {
        if (!isCancelled) setDirectSelectedSession(null);
        return;
      }

      const { data, error } = await supabase
        .from('sessions')
        .select('id, client_id, package_id, session_kind, session_number, scheduled_date, scheduled_time, status, workout_data')
        .eq('id', selectedSessionId)
        .maybeSingle();

      if (error) {
        console.error('Load direct session error:', error.message);
        if (!isCancelled) setDirectSelectedSession(null);
        return;
      }

      if (!isCancelled) {
        setDirectSelectedSession(data || null);
      }
    };

    void fetchDirectSession();

    return () => {
      isCancelled = true;
    };
  }, [isManualSessionMode, manuallySelectedSession, selectedSession, selectedSessionId]);

  useEffect(() => {
    let isCancelled = false;

    const hydrateExercises = async () => {
      if (selectedSessionRecord?.workout_data?.length) {
        if (!isCancelled) {
          setExercises(mapWorkoutDataToDrafts(selectedSessionRecord.workout_data));
          setSelectedTemplateId(null);
          setPreviousWorkoutSource(null);
        }
        return;
      }

      if (selectedSessionRecord?.id) {
        const previousSession = await fetchPreviousWorkoutData(selectedSessionRecord);
        if (!isCancelled && previousSession?.workout_data?.length) {
          setExercises(mapWorkoutDataToDrafts(previousSession.workout_data));
          setSelectedTemplateId(null);
          setPreviousWorkoutSource({
            sessionNumber: previousSession.session_number,
            scheduledDate: previousSession.scheduled_date,
            scheduledTime: previousSession.scheduled_time,
          });
          return;
        }
      }

      if (!isCancelled) {
        setExercises([createExerciseDraft('exercise-0')]);
        setSelectedTemplateId(null);
        setPreviousWorkoutSource(null);
      }
    };

    void hydrateExercises();

    return () => {
      isCancelled = true;
    };
  }, [fetchPreviousWorkoutData, selectedSessionRecord]);

  const updateExercise = (id, field, value) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };
  const toggleExerciseCompleted = (id) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, is_completed: !ex.is_completed } : ex));
  };
  const removeExercise = (id) => {
    setExercises(prev => prev.length === 1 ? prev : prev.filter(ex => ex.id !== id));
  };
  const addExercise = () => {
    const nextId = `exercise-${exerciseIdRef.current++}`;
    setExercises(prev => [...prev, createExerciseDraft(nextId)]);
  };
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const selectedTemplate = templates.find(template => template.id === templateId);
    setExercises(mapWorkoutDataToDrafts(selectedTemplate?.template_exercises || []));
    setShowPackagePicker(false);
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
    setShowAllClientSessions(false);
    setShowClientPicker(true);
    setSelectedSessionId(sessionId);
  };

  const handleStartManualSessionSelection = () => {
    if (selectedClientId) {
      setIsManualSessionMode(true);
      setShowClientPicker(prev => !prev);
      return;
    }

    setIsManualSessionMode(true);
    setShowClientPicker(true);
    setSelectedSessionId(null);
    setSelectedClientId(null);
    setClientSessions([]);
    setShowAllClientSessions(false);
  };

  const handleSelectClient = async (clientId) => {
    setSelectedClientId(clientId);
    setSelectedSessionId(null);
    setShowAllClientSessions(false);
    setShowClientPicker(false);
    const sortedSessions = await fetchClientSessions(clientId);
    if (sortedSessions.length > 0) {
      setSelectedSessionId(sortedSessions[0].id);
    }
  };

  const handleSave = async (status) => {
    if (!selectedSessionId) return;
    
    setSaving(true);

    try {
      const finalWorkoutData = exercises
        .filter(ex => ex.name.trim())
        .map((ex, idx) => ({
          name: ex.name.trim(),
          sets: Math.max(1, Number(ex.sets) || 1),
          reps: Math.max(1, Number(ex.reps) || 1),
          weight: Math.max(0, Number(ex.weight) || 0),
          note: ex.note.trim() || null,
          is_completed: Boolean(ex.is_completed),
          sort_order: idx,
        }));
      
      const currTimeIso = new Date().toISOString();
      let error = null;

      if (status === 'cancelled' && selectedSessionPackageId && selectedSessionKind === 'fixed') {
        const rpcResult = await supabase.rpc('cancel_and_shift_fixed_session', {
          p_session_id: selectedSessionId,
          p_cancel_reason: cancelReason === 'Lý do khác' ? customReason : cancelReason,
        });
        error = rpcResult.error;

        if (!error) {
          const repairResult = await supabase.rpc('repair_package_schedule', {
            p_package_id: selectedSessionPackageId,
          });
          error = repairResult.error;
        }
      } else {
        const updates = { 
            status, 
            feeling, 
            notes, 
            completed_at: status === 'completed' ? currTimeIso : null,
            cancelled_at: status === 'cancelled' ? currTimeIso : null,
            cancel_reason: status === 'cancelled' ? (cancelReason === 'Lý do khác' ? customReason : cancelReason) : null,
            ...(finalWorkoutData ? { workout_data: finalWorkoutData } : {})
        };

        const updateResult = await supabase
          .from('sessions')
          .update(updates)
          .eq('id', selectedSessionId)
          .select('id')
          .single();

        error = updateResult.error;
      }

      if (error) {
        throw error;
      }

      onClose();
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Quick log save error:', error.message);
      alert(`Không thể lưu buổi tập: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- RENDERS ---
  if (showCancelReason) {
    return (
      <div className="fixed inset-0 z-[600] flex animate-slide-up">
        {/* Transparent overlay blocks interactions below */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCancelReason(false)} />
        <div className="absolute bottom-0 w-full bg-[#1a1a1c] border-t border-white/10 rounded-t-[32px] p-6 pb-10 shadow-2xl flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-white font-bold text-lg">Session Cancellation Reason</h2>
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
             Confirm Cancellation
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
              <h2 className="text-xl font-bold text-white">Start Workout</h2>
           </div>
           <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-neutral-400" /></button>
        </div>

        {/* [A] Chọn buổi tập */}
        <div className="space-y-2.5">
           <div className="flex items-center justify-between gap-3">
             <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Today's Sessions</p>
             <button 
                onClick={handleStartManualSessionSelection}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border rounded-[12px] text-[11px] font-black tracking-wide transition-all ${isManualSessionMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:bg-white/[0.05]'}`}
             >
                <UserRound className="w-3.5 h-3.5" />
                {manualSelectedClientName || 'Trainee'}
             </button>
           </div>
           <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
             {loading ? <div className="text-neutral-500 text-sm">Đang tải...</div> : todaySessions.map(s => (
               <button 
                  key={s.id} onClick={() => handleSelectTodaySession(s.id)}
                  className={`shrink-0 px-3 py-2.5 border rounded-[14px] text-left transition-all min-w-[118px] ${selectedSessionId === s.id ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.08)]' : 'bg-white/[0.03] border-white/[0.06] text-neutral-300 hover:bg-white/[0.05]'}`}
               >
                 <p className={`text-[9px] font-black uppercase tracking-widest ${selectedSessionId === s.id ? 'text-black/45' : 'text-neutral-600'}`}>{s.client_name}</p>
                 <p className={`text-sm font-semibold mt-1 ${selectedSessionId === s.id ? 'text-black' : 'text-white'}`}>{s.scheduled_time?.slice(0,5)}</p>
               </button>
             ))}
           </div>
        </div>
         {/* [A2] Client/session selector in manual mode */}
         {isManualSessionMode && (
          <div className="space-y-2.5">
             {showClientPicker ? (
               <>
                 <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Choose a trainee</p>
                 <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                   {clients.map(c => (
                     <button 
                        key={c.id} onClick={() => handleSelectClient(c.id)}
                        className={`shrink-0 px-3 py-2 border rounded-[12px] text-[11px] font-black tracking-wide transition-all ${selectedClientId === c.id ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/[0.04] border-white/[0.08] text-neutral-500 hover:bg-white/[0.08]'}`}
                     >
                       {c.name}
                     </button>
                   ))}
                 </div>
               </>
             ) : null}

             {selectedClientId && !showClientPicker && (
               <div className="mt-3 space-y-2">
                 {loadingClientSessions ? (
                   <div className="text-sm text-neutral-500 py-2">Đang tải session của học viên...</div>
                 ) : clientSessions.length === 0 ? (
                   <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] px-4 py-3 text-sm text-neutral-500">
                     Học viên này chưa có session nào ở trạng thái scheduled hoặc in_progress.
                   </div>
                 ) : (
                   <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                     {visibleClientSessions.map(sessionOption => (
                       <button
                         key={sessionOption.id}
                         onClick={() => setSelectedSessionId(sessionOption.id)}
                         className={`shrink-0 min-w-[118px] rounded-[16px] border px-3 py-2.5 text-left transition-all ${
                           selectedSessionId === sessionOption.id
                             ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.08)]'
                             : 'bg-white/[0.03] border-white/[0.06] text-neutral-300 hover:bg-white/[0.05]'
                         }`}
                       >
                         <div className="flex items-start justify-between gap-2">
                           <div>
                             <p className={`text-[10px] font-black uppercase tracking-widest ${selectedSessionId === sessionOption.id ? 'text-black/50' : 'text-neutral-600'}`}>
                               Buổi #{String(sessionOption.session_number).padStart(2, '0')}
                             </p>
                             <p className={`text-sm font-semibold mt-1 ${selectedSessionId === sessionOption.id ? 'text-black' : 'text-white'}`}>
                               {formatShortSessionDate(sessionOption.scheduled_date)}
                             </p>
                             <p className={`text-[11px] mt-0.5 ${selectedSessionId === sessionOption.id ? 'text-black/60' : 'text-neutral-500'}`}>
                               {sessionOption.scheduled_time?.slice(0, 5)}
                             </p>
                           </div>
                           <div className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${
                             sessionOption.status === 'in_progress'
                               ? selectedSessionId === sessionOption.id
                                 ? 'bg-blue-500/15 text-blue-700'
                                 : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                               : selectedSessionId === sessionOption.id
                                 ? 'bg-black/5 text-black/55'
                                 : 'bg-white/[0.04] border border-white/[0.08] text-neutral-500'
                           }`}>
                             {sessionOption.status === 'in_progress' ? 'Lưu tạm' : 'Chưa tập'}
                           </div>
                         </div>
                       </button>
                     ))}
                   </div>
                 )}

                 {!loadingClientSessions && clientSessions.length > 8 && (
                   <button
                     onClick={() => setShowAllClientSessions(prev => !prev)}
                     className="w-full py-3 rounded-[14px] border border-white/[0.08] bg-white/[0.03] text-[11px] font-black uppercase tracking-wider text-neutral-400 hover:bg-white/[0.05] transition-all"
                   >
                     {showAllClientSessions ? 'Thu gọn danh sách' : `Xem thêm ${clientSessions.length - 8} buổi`}
                   </button>
                 )}
               </div>
             )}
          </div>
         )}
        {selectedSessionId && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-white">
              <UserRound className="w-3.5 h-3.5 text-neutral-500" />
              <span className="truncate max-w-[140px]">{selectedClientName || 'No trainee selected'}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-neutral-300">
              <CalendarDays className="w-3.5 h-3.5 text-neutral-500" />
              <span>{selectedSessionTime || '--:--'}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] overflow-hidden">
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => setShowPackagePicker(prev => !prev)}
                className="flex-1 min-w-0 flex items-center gap-2 rounded-[14px] px-3 py-2.5 hover:bg-white/[0.03] transition-all"
              >
                <Dumbbell className="w-4 h-4 text-neutral-500 shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Workout Templates</p>
                  <p className="text-sm font-semibold text-white truncate">
                    {activeTemplate?.name || 'Choose a template'}
                  </p>
                </div>
                {showPackagePicker ? <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateTemplate(true)}
                className="shrink-0 w-10 h-10 rounded-[12px] border border-dashed border-white/20 text-neutral-400 flex items-center justify-center hover:text-white hover:bg-white/[0.05] transition-all"
                aria-label="Tạo gói bài tập"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showPackagePicker && (
              <div className="px-2 pb-2">
                {loadingTemplates ? (
                  <div className="rounded-[14px] border border-white/[0.05] bg-black/20 px-4 py-4 text-center text-sm text-neutral-500">Đang tải gói bài tập...</div>
                ) : sortedTemplates.length === 0 ? (
                  <div className="rounded-[14px] border border-white/[0.05] bg-black/20 px-4 py-5 text-center">
                    <PenTool className="w-5 h-5 mx-auto mb-2 text-neutral-700" />
                    <p className="text-xs text-neutral-500">No workout templates yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedTemplates.map(t => {
                      const isAssigned = activeClientId ? (t.template_assignments || []).some((assignment) => assignment.client_id === activeClientId) : false;
                      return (
                      <button 
                        key={t.id} 
                        onClick={() => handleSelectTemplate(t.id)}
                        className={`w-full px-3 py-3 rounded-[14px] border text-left flex items-center justify-between gap-3 transition-all ${selectedTemplateId === t.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/20 border-white/[0.06] hover:bg-white/[0.04]'}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className={`font-semibold text-sm truncate ${selectedTemplateId === t.id ? 'text-blue-400' : 'text-white'}`}>{t.name}</p>
                            {isAssigned && (
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
                                Đã gán
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-medium">{t.template_exercises?.length || 0} bài tập</p>
                        </div>
                        {selectedTemplateId === t.id && <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                      </button>
                    )})}
                  </div>
                )}
              </div>
            )}
          </div>

          {previousWorkoutSource && (
            <div className="rounded-[14px] border border-blue-500/15 bg-blue-500/8 px-3 py-2 text-[11px] text-blue-300">
              Đã gọi bài tập từ buổi trước
              {previousWorkoutSource.sessionNumber ? ` #${String(previousWorkoutSource.sessionNumber).padStart(2, '0')}` : ''}
              {previousWorkoutSource.scheduledDate ? ` · ${previousWorkoutSource.scheduledDate}` : ''}
              {previousWorkoutSource.scheduledTime ? ` · ${previousWorkoutSource.scheduledTime.slice(0, 5)}` : ''}
            </div>
          )}

          <div className="space-y-2">
            {exercises.map((ex, idx) => (
              <div
                key={ex.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, idx)}
                className={`rounded-[16px] border px-3 py-2.5 transition-all ${ex.is_completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}
              >
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => toggleExerciseCompleted(ex.id)} className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black transition-all ${ex.is_completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/12 text-transparent hover:border-emerald-400/50'}`}>
                    ✓
                  </button>
                  <GripVertical className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  <input
                    type="text"
                    placeholder={`Tên bài tập #${idx + 1}`}
                    value={ex.name}
                    onChange={e => updateExercise(ex.id, 'name', e.target.value)}
                    className={`flex-1 min-w-0 bg-transparent text-sm font-semibold outline-none ${ex.is_completed ? 'text-emerald-100 line-through' : 'text-white'} placeholder:text-neutral-600`}
                  />
                  <button
                    type="button"
                    onClick={() => removeExercise(ex.id)}
                    disabled={exercises.length === 1}
                    className="p-1.5 h-fit text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 pl-6 grid grid-cols-3 gap-2">
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-2 py-1.5">
                    <div className="text-[8px] font-black text-neutral-600 uppercase text-center">Sets</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button type="button" onClick={() => updateExercise(ex.id, 'sets', Math.max(1, ex.sets - 1))} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all">-</button>
                      <span className="min-w-[14px] text-center text-white text-[11px] font-semibold">{ex.sets}</span>
                      <button type="button" onClick={() => updateExercise(ex.id, 'sets', ex.sets + 1)} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all">+</button>
                    </div>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-2 py-1.5">
                    <div className="text-[8px] font-black text-neutral-600 uppercase text-center">Reps</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button type="button" onClick={() => updateExercise(ex.id, 'reps', Math.max(1, ex.reps - 1))} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all">-</button>
                      <span className="min-w-[20px] text-center text-white text-[11px] font-semibold">{ex.reps}</span>
                      <button type="button" onClick={() => updateExercise(ex.id, 'reps', ex.reps + 1)} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all">+</button>
                    </div>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-2 py-1.5">
                    <div className="text-[8px] font-black text-neutral-600 uppercase text-center">Weight</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button type="button" onClick={() => updateExercise(ex.id, 'weight', Math.max(0, ex.weight - 1))} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all">-</button>
                      <span className="min-w-[14px] text-center text-white text-[11px] font-semibold">{ex.weight}</span>
                      <button type="button" onClick={() => updateExercise(ex.id, 'weight', ex.weight + 1)} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all">+</button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pl-6">
                  <input
                    type="text"
                    placeholder="Ghi chú bài tập (tuỳ chọn)"
                    value={ex.note}
                    onChange={e => updateExercise(ex.id, 'note', e.target.value)}
                    className="w-full bg-black/30 border border-white/[0.05] rounded-[10px] py-1.5 px-3 text-neutral-300 text-[11px] outline-none focus:border-white/20 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          <button onClick={addExercise} className="w-full py-3 border border-dashed border-white/20 rounded-[16px] text-neutral-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.02] active:border-white/40 transition-all">
            <Plus className="w-4 h-4" /> Thêm bài tập
          </button>

          {showCreateTemplate && (
            <CreateTemplateModal
              session={session}
              onClose={() => setShowCreateTemplate(false)}
              onCreated={() => fetchTemplates()}
            />
          )}
        </div>

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
           <button onClick={() => handleSave('in_progress')} disabled={saving || !selectedSessionId || !hasWorkoutData} className="flex-1 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-[18px] text-white font-bold text-sm text-center active:scale-95 transition-all disabled:opacity-50">
             Save Draft
           </button>
           <button onClick={() => handleSave('completed')} disabled={saving || !selectedSessionId || !hasWorkoutData} className="flex-1 py-3.5 bg-white text-black font-bold text-sm rounded-[18px] text-center active:scale-[0.98] transition-all disabled:opacity-50">
             Complete
           </button>
        </div>
        <button onClick={() => setShowCancelReason(true)} disabled={saving || !selectedSessionId} className="w-full py-3 text-red-400 text-sm font-bold text-center bg-red-500/10 border border-red-500/20 rounded-[18px] active:scale-95 transition-all disabled:opacity-50">
           Cancel
        </button>

      </div>
    </div>
  );
};

export default QuickLogSheet;
