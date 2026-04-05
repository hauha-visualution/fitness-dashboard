import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { parseServiceMeta } from '../../utils/serviceUtils';
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
  HeartPulse,
  Move,
  Waves,
} from 'lucide-react';
import CreateTemplateModal from './CreateTemplateModal';
import {
  notifySessionCompleted,
  notifySessionCancelled,
  checkAndNotifyLowSessions,
  fetchClientNotifInfo,
} from '../../utils/notificationUtils';

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
    workoutTemplateId: selection.workoutTemplateId ?? selection.workout_template_id ?? null,
    workout_template_id: selection.workoutTemplateId ?? selection.workout_template_id ?? null,
    sessionKind: selection.sessionKind ?? selection.session_kind ?? 'fixed',
    session_kind: selection.sessionKind ?? selection.session_kind ?? 'fixed',
    manualMode: Boolean(selection.manualMode),
  };
};

const isMissingWorkoutTemplateColumnError = (error) =>
  String(error?.message || '').toLowerCase().includes('workout_template_id');

const createEmptySketchingRecord = () => ({
  record_type: 'sketching_therapy',
  focusArea: '',
  painBefore: '',
  restrictedMovement: '',
  targetTissues: '',
  techniquesUsed: '',
  dosage: '',
  painAfter: '',
  romAfter: '',
  coachNotes: '',
  homeProtocol: '',
  nextSessionFocus: '',
});

const normalizeSketchingRecord = (raw) => {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
    return createEmptySketchingRecord();
  }

  return {
    ...createEmptySketchingRecord(),
    ...raw,
    record_type: 'sketching_therapy',
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
  const [cancelReason, setCancelReason] = useState('💼 Work conflict');
  const [customReason, setCustomReason] = useState('');
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showPackagePicker, setShowPackagePicker] = useState(true);
  const [previousWorkoutSource, setPreviousWorkoutSource] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [selectedPackageMeta, setSelectedPackageMeta] = useState(null);
  const [sketchingRecord, setSketchingRecord] = useState(createEmptySketchingRecord());

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
      .select('*')
      .eq('client_id', clientId)
      .in('status', ['scheduled', 'in_progress', 'completed'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('Load client sessions error:', error.message);
      setClientSessions([]);
      setLoadingClientSessions(false);
      alert(`Unable to load sessions: ${error.message}`);
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

  const fetchLatestTemplateWorkoutData = useCallback(async (sessionRecord, templateId) => {
    if (!sessionRecord?.client_id || !sessionRecord?.scheduled_date || !templateId) {
      return null;
    }

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('client_id', sessionRecord.client_id)
      .eq('status', 'completed')
      .eq('workout_template_id', templateId)
      .neq('id', sessionRecord.id)
      .or(`scheduled_date.lt.${sessionRecord.scheduled_date},and(scheduled_date.eq.${sessionRecord.scheduled_date},scheduled_time.lt.${sessionRecord.scheduled_time})`)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (!isMissingWorkoutTemplateColumnError(error)) {
        console.error('Load template workout history error:', error.message);
      }
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
  const isReviewMode = selectedSessionRecord?.status === 'completed';
  const selectedServiceType = selectedPackageMeta?.serviceType || 'training';
  const isSketchingSession = selectedServiceType === 'sketching';
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
        : 'Choose a session')
    : (selectedSession
        ? selectedSession.scheduled_time?.slice(0, 5)
        : initialSession?.scheduledDate
          ? `${initialSession.scheduledDate} • ${initialSession.scheduledTime?.slice(0, 5)}`
          : initialSession?.scheduledTime?.slice(0, 5));
  const hasWorkoutData = isSketchingSession
    ? Boolean(
        sketchingRecord.focusArea.trim() ||
        sketchingRecord.targetTissues.trim() ||
        sketchingRecord.techniquesUsed.trim() ||
        sketchingRecord.coachNotes.trim()
      )
    : exercises.some(ex => ex.name.trim());
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
        .select('*')
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

    const fetchSelectedPackageMeta = async () => {
      if (!selectedSessionPackageId) {
        if (!isCancelled) setSelectedPackageMeta(null);
        return;
      }

      const { data, error } = await supabase
        .from('packages')
        .select('id, note')
        .eq('id', selectedSessionPackageId)
        .maybeSingle();

      if (error) {
        console.error('Load package meta error:', error.message);
        if (!isCancelled) setSelectedPackageMeta(null);
        return;
      }

      if (!isCancelled) {
        setSelectedPackageMeta(parseServiceMeta(data?.note));
      }
    };

    void fetchSelectedPackageMeta();

    return () => {
      isCancelled = true;
    };
  }, [selectedSessionPackageId]);

  useEffect(() => {
    let isCancelled = false;

    const hydrateExercises = async () => {
      if (isSketchingSession) {
        if (!isCancelled) {
          setExercises([createExerciseDraft('exercise-0')]);
          setPreviousWorkoutSource(null);
        }
        return;
      }

      if (selectedSessionRecord?.workout_data?.length) {
        if (!isCancelled) {
          setExercises(mapWorkoutDataToDrafts(selectedSessionRecord.workout_data));
          setPreviousWorkoutSource(null);
        }
        return;
      }

      if (selectedSessionRecord?.status === 'completed') {
        if (!isCancelled) {
          setExercises([createExerciseDraft('exercise-0')]);
          setPreviousWorkoutSource(null);
        }
        return;
      }

      if (selectedSessionRecord?.id && selectedTemplateId) {
        const previousSession = await fetchLatestTemplateWorkoutData(selectedSessionRecord, selectedTemplateId);
        if (!isCancelled && previousSession?.workout_data?.length) {
          setExercises(mapWorkoutDataToDrafts(previousSession.workout_data));
          setPreviousWorkoutSource({
            type: 'template-history',
            templateName: templates.find((template) => template.id === selectedTemplateId)?.name,
            sessionNumber: previousSession.session_number,
            scheduledDate: previousSession.scheduled_date,
            scheduledTime: previousSession.scheduled_time,
          });
          return;
        }

        const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
        if (!isCancelled && selectedTemplate) {
          setExercises(mapWorkoutDataToDrafts(selectedTemplate.template_exercises || []));
          setPreviousWorkoutSource({
            type: 'template-default',
            templateName: selectedTemplate.name,
          });
          return;
        }
      }

      if (!isCancelled) {
        setExercises([createExerciseDraft('exercise-0')]);
        setPreviousWorkoutSource(null);
      }
    };

    void hydrateExercises();

    return () => {
      isCancelled = true;
    };
  }, [fetchLatestTemplateWorkoutData, isSketchingSession, selectedSessionRecord, selectedTemplateId, templates]);

  useEffect(() => {
    setSelectedTemplateId(selectedSessionRecord?.workout_template_id ?? selectedSessionRecord?.workoutTemplateId ?? null);
    setFeeling(selectedSessionRecord?.feeling ?? null);
    setNotes(selectedSessionRecord?.notes ?? '');
    setSketchingRecord(normalizeSketchingRecord(selectedSessionRecord?.workout_data));
    setSaveFeedback('');
  }, [selectedSessionRecord]);

  const updateSketchingRecord = (field, value) => {
    setSketchingRecord((prev) => ({ ...prev, [field]: value }));
  };

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
    setPreviousWorkoutSource(null);
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

  const syncSessionRecord = useCallback((updatedSession) => {
    if (!updatedSession?.id) return;

    setTodaySessions((prev) =>
      prev.map((sessionItem) => (sessionItem.id === updatedSession.id ? { ...sessionItem, ...updatedSession } : sessionItem))
    );
    setClientSessions((prev) =>
      prev.map((sessionItem) => (sessionItem.id === updatedSession.id ? { ...sessionItem, ...updatedSession } : sessionItem))
    );

    if (selectedSessionId === updatedSession.id) {
      setDirectSelectedSession((prev) => ({ ...(prev || {}), ...updatedSession }));
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (!saveFeedback) return undefined;
    const timeoutId = window.setTimeout(() => setSaveFeedback(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [saveFeedback]);

  const handleSave = async (status) => {
    if (!selectedSessionId) return;
    
    setSaving(true);

    try {
      const finalWorkoutData = isSketchingSession
        ? normalizeSketchingRecord(sketchingRecord)
        : exercises
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
          p_cancel_reason: cancelReason === '📝 Other reason' ? customReason : cancelReason,
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
            feeling: isSketchingSession ? null : feeling,
            notes: isSketchingSession ? (selectedSessionRecord?.notes ?? null) : notes,
            completed_at: status === 'completed' ? currTimeIso : null,
            cancelled_at: status === 'cancelled' ? currTimeIso : null,
            cancel_reason: status === 'cancelled' ? (cancelReason === '📝 Other reason' ? customReason : cancelReason) : null,
            workout_template_id: isSketchingSession
              ? (selectedSessionRecord?.workout_template_id ?? null)
              : (selectedTemplateId ?? null),
            ...(finalWorkoutData ? { workout_data: finalWorkoutData } : {})
        };

        let updateResult = await supabase
          .from('sessions')
          .update(updates)
          .eq('id', selectedSessionId)
          .select('*')
          .single();

        if (updateResult.error && isMissingWorkoutTemplateColumnError(updateResult.error)) {
          const { workout_template_id, ...legacyUpdates } = updates;
          updateResult = await supabase
            .from('sessions')
            .update(legacyUpdates)
            .eq('id', selectedSessionId)
            .select('*')
            .single();
        }

        error = updateResult.error;
        if (!error && updateResult.data) {
          syncSessionRecord(updateResult.data);
        }
      }

      if (error) {
        throw error;
      }

      if (status === 'in_progress') {
        setSaveFeedback('Draft saved');
        if (onSaved) onSaved();
        if (selectedClientId) {
          void fetchClientSessions(selectedClientId);
        }
        void fetchToday();
        return;
      }

      onClose();
      if (onSaved) onSaved();

      // ─── Notifications (fire-and-forget) ───────────────────
      const coachAuthUserId = session?.user?.id ?? null;
      const clientIdForNotif = selectedSessionRecord?.client_id ?? selectedClientId ?? null;
      const pkgIdForNotif = selectedSessionPackageId;
      const sessNum = selectedSessionRecord?.session_number ?? null;
      const sessDate = selectedSessionRecord?.scheduled_date ?? null;

      if (status === 'completed' || status === 'cancelled') {
        void (async () => {
          const clientInfo = await fetchClientNotifInfo(clientIdForNotif);
          const clientAuthUserId = clientInfo?.auth_user_id ?? null;

          if (status === 'completed') {
            await notifySessionCompleted({ clientAuthUserId, sessionNumber: sessNum, scheduledDate: sessDate });
            await checkAndNotifyLowSessions({ packageId: pkgIdForNotif, clientId: clientIdForNotif, coachAuthUserId });
          } else {
            const reason = cancelReason === '📝 Other reason' ? customReason : cancelReason;
            await notifySessionCancelled({ clientAuthUserId, sessionNumber: sessNum, scheduledDate: sessDate, reason });
          }
        })();
      }
      // ───────────────────────────────────────────────────────
    } catch (error) {
      console.error('Quick log save error:', error.message);
      alert(`Unable to save session: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- RENDERS ---
  if (showCancelReason) {
    return (
      <div className="fixed inset-0 z-[600] flex">
        {/* Transparent overlay blocks interactions below */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowCancelReason(false)} />
        <div className="absolute bottom-0 w-full bg-[var(--app-bg-dialog)] border-t border-white/10 rounded-t-[32px] p-6 pb-10 shadow-2xl flex flex-col gap-4 animate-modal-in">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-white font-bold text-lg">Session Cancellation Reason</h2>
            <button onClick={() => setShowCancelReason(false)} className="app-ghost-button p-2 border rounded-full"><X className="w-5 h-5 text-neutral-400" /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {[
              '🤒 Sick / Unwell',
              '🏥 Injury / Medical',
              '💼 Work conflict',
              '👪 Family matter',
              '✈️ Travel / Out of town',
              '🚗 Transport issue',
              '🌧️ Weather',
              '😓 Coach sick',
              '📅 Coach schedule conflict',
              '🏋️ Facility unavailable',
              '🔁 Rescheduled',
              '⚠️ No show',
              '📝 Other reason',
            ].map(r => (
              <button key={r} onClick={() => setCancelReason(r)} className={`p-3 rounded-[16px] border text-left text-[13px] font-medium transition-all ${cancelReason === r ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/[0.04] border-white/10 text-white'}`}>
                {r}
              </button>
            ))}
          </div>
          
          {cancelReason === '📝 Other reason' && (
             <input type="text" placeholder="Enter a reason..." value={customReason} onChange={e => setCustomReason(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[14px] p-4 text-white outline-none focus:border-red-500/30" />
          )}
          
          <button onClick={() => handleSave('cancelled')} disabled={saving || (cancelReason === '📝 Other reason' && !customReason)} className="mt-4 w-full py-4 bg-red-500 text-white font-bold rounded-[18px] active:scale-95 transition-all disabled:opacity-50">
             Confirm Cancellation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* Sheet */}
      <div className="absolute bottom-0 w-full bg-[var(--app-bg-dialog)] border-t border-white/10 rounded-t-[32px] flex flex-col p-6 pb-10 gap-5 max-h-[90vh] overflow-y-auto hide-scrollbar animate-modal-in">
        
        {/* Header */}
          <div className="flex justify-between items-center">
           <div>
              <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Aesthetics Hub</p>
              <h2 className="text-xl font-bold text-white">
                {isSketchingSession ? (isReviewMode ? 'Therapy Record' : 'Start Therapy') : (isReviewMode ? 'Workout Log' : 'Start Workout')}
              </h2>
           </div>
           <button onClick={onClose} className="app-ghost-button p-2 border rounded-full"><X className="w-5 h-5 text-neutral-400" /></button>
        </div>

        {isReviewMode && (
          <div className="rounded-[16px] border border-[rgba(200,245,63,0.18)] bg-[rgba(200,245,63,0.08)] px-4 py-3 text-[11px] text-[rgba(235,255,190,0.88)]">
            This session is already completed. You are viewing the saved {isSketchingSession ? 'therapy record' : 'workout log'} in read-only mode.
          </div>
        )}

        {saveFeedback && (
          <div className="rounded-[16px] border border-[rgba(96,180,255,0.16)] bg-[rgba(96,180,255,0.10)] px-4 py-3 text-[11px] font-semibold text-[rgba(180,225,255,0.92)]">
            {saveFeedback}
          </div>
        )}

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
             {loading ? <div className="text-neutral-500 text-sm">Loading...</div> : todaySessions.map(s => (
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
                   <div className="text-sm text-neutral-500 py-2">Loading trainee sessions...</div>
                 ) : clientSessions.length === 0 ? (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] px-4 py-3 text-sm text-neutral-500">
                     This trainee does not have any scheduled, draft, or completed sessions yet.
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
                               Session #{String(sessionOption.session_number).padStart(2, '0')}
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
                               : sessionOption.status === 'completed'
                                 ? selectedSessionId === sessionOption.id
                                   ? 'bg-[rgba(200,245,63,0.2)] text-black/65'
                                   : 'bg-[rgba(200,245,63,0.08)] border border-[rgba(200,245,63,0.18)] text-[var(--app-accent)]'
                               : selectedSessionId === sessionOption.id
                                 ? 'bg-black/5 text-black/55'
                                 : 'bg-white/[0.04] border border-white/[0.08] text-neutral-500'
                           }`}>
                             {sessionOption.status === 'in_progress' ? 'Draft' : sessionOption.status === 'completed' ? 'Completed' : 'Not Started'}
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
                     {showAllClientSessions ? 'Show Less' : `Show ${clientSessions.length - 8} More`}
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
            {isSketchingSession ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/8 px-3 py-2 text-[11px] font-semibold text-emerald-300">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-300/80" />
                <span>Therapy Session</span>
              </div>
            ) : null}
          </div>
        )}

        {!isSketchingSession ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] overflow-hidden">
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => !isReviewMode && setShowPackagePicker(prev => !prev)}
                className="flex-1 min-w-0 flex items-center gap-2 rounded-[14px] px-3 py-2.5 hover:bg-white/[0.03] transition-all"
              >
                <Dumbbell className="w-4 h-4 text-neutral-500 shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Workout Templates</p>
                  <p className="text-sm font-semibold text-white truncate">
                    {activeTemplate?.name || (isReviewMode ? 'Saved workout log' : 'Choose a template')}
                  </p>
                </div>
                {showPackagePicker ? <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />}
              </button>
              {!isReviewMode && (
                <button
                  type="button"
                  onClick={() => setShowCreateTemplate(true)}
                  className="shrink-0 w-10 h-10 rounded-[12px] border border-[var(--app-accent-soft)] bg-[linear-gradient(135deg,rgba(200,245,63,0.22),rgba(96,180,255,0.12))] text-[var(--app-accent)] shadow-[0_12px_24px_rgba(200,245,63,0.14)] flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
                  aria-label="Create template"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {showPackagePicker && (
              <div className="px-2 pb-2">
                {loadingTemplates ? (
                  <div className="rounded-[14px] border border-white/[0.05] bg-black/20 px-4 py-4 text-center text-sm text-neutral-500">Loading templates...</div>
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
                        onClick={() => !isReviewMode && handleSelectTemplate(t.id)}
                        disabled={isReviewMode}
                        className={`w-full px-3 py-3 rounded-[14px] border text-left flex items-center justify-between gap-3 transition-all ${selectedTemplateId === t.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/20 border-white/[0.06] hover:bg-white/[0.04]'}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className={`font-semibold text-sm truncate ${selectedTemplateId === t.id ? 'text-blue-400' : 'text-white'}`}>{t.name}</p>
                            {isAssigned && (
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
                                Assigned
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-medium">{t.template_exercises?.length || 0} exercises</p>
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
              {previousWorkoutSource.type === 'template-default'
                ? `Loaded the default structure from ${previousWorkoutSource.templateName || 'the selected template'}.`
                : `Loaded the latest completed ${previousWorkoutSource.templateName || 'template'} log`}
              {previousWorkoutSource.sessionNumber ? ` #${String(previousWorkoutSource.sessionNumber).padStart(2, '0')}` : ''}
              {previousWorkoutSource.scheduledDate ? ` · ${previousWorkoutSource.scheduledDate}` : ''}
              {previousWorkoutSource.scheduledTime ? ` · ${previousWorkoutSource.scheduledTime.slice(0, 5)}` : ''}
            </div>
          )}

          <div className="space-y-2">
            {exercises.map((ex, idx) => (
              <div
                key={ex.id}
                draggable={!isReviewMode}
                onDragStart={isReviewMode ? undefined : (e) => handleDragStart(e, idx)}
                onDragEnd={isReviewMode ? undefined : handleDragEnd}
                onDragOver={isReviewMode ? undefined : (e) => handleDragOver(e, idx)}
                className={`rounded-[16px] border px-3 py-2.5 transition-all ${ex.is_completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !isReviewMode && toggleExerciseCompleted(ex.id)}
                    disabled={isReviewMode}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black transition-all disabled:opacity-90 ${ex.is_completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/12 text-transparent hover:border-emerald-400/50'}`}
                  >
                    ✓
                  </button>
                  <GripVertical className={`w-3.5 h-3.5 text-white/20 shrink-0 ${isReviewMode ? 'opacity-40' : ''}`} />
                  <input
                    type="text"
                    placeholder={`Exercise #${idx + 1}`}
                    value={ex.name}
                    onChange={e => updateExercise(ex.id, 'name', e.target.value)}
                    readOnly={isReviewMode}
                    className={`flex-1 min-w-0 bg-transparent text-sm font-semibold outline-none ${ex.is_completed ? 'text-emerald-100 line-through' : 'text-white'} placeholder:text-neutral-600 ${isReviewMode ? 'cursor-default' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => !isReviewMode && removeExercise(ex.id)}
                    disabled={isReviewMode || exercises.length === 1}
                    className="p-1.5 h-fit text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 pl-6 grid grid-cols-3 gap-2">
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-2 py-1.5">
                    <div className="text-[8px] font-black text-neutral-600 uppercase text-center">Sets</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button type="button" onClick={() => !isReviewMode && updateExercise(ex.id, 'sets', Math.max(1, ex.sets - 1))} disabled={isReviewMode} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all disabled:opacity-30">-</button>
                      <span className="min-w-[14px] text-center text-white text-[11px] font-semibold">{ex.sets}</span>
                      <button type="button" onClick={() => !isReviewMode && updateExercise(ex.id, 'sets', ex.sets + 1)} disabled={isReviewMode} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all disabled:opacity-30">+</button>
                    </div>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-2 py-1.5">
                    <div className="text-[8px] font-black text-neutral-600 uppercase text-center">Reps</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button type="button" onClick={() => !isReviewMode && updateExercise(ex.id, 'reps', Math.max(1, ex.reps - 1))} disabled={isReviewMode} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all disabled:opacity-30">-</button>
                      <span className="min-w-[20px] text-center text-white text-[11px] font-semibold">{ex.reps}</span>
                      <button type="button" onClick={() => !isReviewMode && updateExercise(ex.id, 'reps', ex.reps + 1)} disabled={isReviewMode} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all disabled:opacity-30">+</button>
                    </div>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-2 py-1.5">
                    <div className="text-[8px] font-black text-neutral-600 uppercase text-center">Weight</div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button type="button" onClick={() => !isReviewMode && updateExercise(ex.id, 'weight', Math.max(0, ex.weight - 1))} disabled={isReviewMode} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all disabled:opacity-30">-</button>
                      <span className="min-w-[14px] text-center text-white text-[11px] font-semibold">{ex.weight}</span>
                      <button type="button" onClick={() => !isReviewMode && updateExercise(ex.id, 'weight', ex.weight + 1)} disabled={isReviewMode} className="w-4 h-4 rounded-md text-neutral-400 active:bg-white/10 transition-all disabled:opacity-30">+</button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pl-6">
                  <input
                    type="text"
                    placeholder="Exercise note (optional)"
                    value={ex.note}
                    onChange={e => updateExercise(ex.id, 'note', e.target.value)}
                    readOnly={isReviewMode}
                    className="w-full bg-black/30 border border-white/[0.05] rounded-[10px] py-1.5 px-3 text-neutral-300 text-[11px] outline-none focus:border-white/20 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {!isReviewMode && (
            <button onClick={addExercise} className="w-full py-3 border border-[rgba(96,180,255,0.3)] bg-[rgba(96,180,255,0.12)] rounded-[16px] text-[var(--app-blue)] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[rgba(96,180,255,0.16)] active:scale-[0.99] transition-all shadow-[0_12px_28px_rgba(96,180,255,0.12)]">
              <Plus className="w-4 h-4" /> Add Exercise
            </button>
          )}

          {showCreateTemplate && (
            <CreateTemplateModal
              session={session}
              onClose={() => setShowCreateTemplate(false)}
              onCreated={() => fetchTemplates()}
            />
          )}
        </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Session Focus</p>
              <input
                type="text"
                value={sketchingRecord.focusArea}
                onChange={(e) => updateSketchingRecord('focusArea', e.target.value)}
                readOnly={isReviewMode}
                placeholder="Example: Hip flexors · post-match tightness"
                className="mt-3 w-full rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Pain Before</p>
                  <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2">
                    <HeartPulse className="h-4 w-4 text-amber-300/80" />
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={sketchingRecord.painBefore}
                      onChange={(e) => updateSketchingRecord('painBefore', e.target.value)}
                      readOnly={isReviewMode}
                      placeholder="0-10"
                      className="w-full bg-transparent text-sm text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Pain After</p>
                  <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2">
                    <HeartPulse className="h-4 w-4 text-emerald-300/80" />
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={sketchingRecord.painAfter}
                      onChange={(e) => updateSketchingRecord('painAfter', e.target.value)}
                      readOnly={isReviewMode}
                      placeholder="0-10"
                      className="w-full bg-transparent text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Restricted Movement</p>
                <textarea
                  value={sketchingRecord.restrictedMovement}
                  onChange={(e) => updateSketchingRecord('restrictedMovement', e.target.value)}
                  readOnly={isReviewMode}
                  placeholder="Example: Limited hip internal rotation on the left side"
                  className="mt-2 h-20 w-full resize-none rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Assessment</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Target Muscles / Tissues</p>
                  <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2">
                    <Move className="h-4 w-4 text-blue-300/80" />
                    <input
                      type="text"
                      value={sketchingRecord.targetTissues}
                      onChange={(e) => updateSketchingRecord('targetTissues', e.target.value)}
                      readOnly={isReviewMode}
                      placeholder="Example: Hip flexor, adductor, TFL"
                      className="w-full bg-transparent text-sm text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Technique Used</p>
                  <textarea
                    value={sketchingRecord.techniquesUsed}
                    onChange={(e) => updateSketchingRecord('techniquesUsed', e.target.value)}
                    readOnly={isReviewMode}
                    placeholder="Example: PNF stretch, myofascial release, breathing reset"
                    className="mt-2 h-20 w-full resize-none rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Duration / Dosage</p>
                  <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2">
                    <Waves className="h-4 w-4 text-purple-300/80" />
                    <input
                      type="text"
                      value={sketchingRecord.dosage}
                      onChange={(e) => updateSketchingRecord('dosage', e.target.value)}
                      readOnly={isReviewMode}
                      placeholder="Example: 3 x 45s each side · 20 min release"
                      className="w-full bg-transparent text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Response After Treatment</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">ROM / Response</p>
                  <textarea
                    value={sketchingRecord.romAfter}
                    onChange={(e) => updateSketchingRecord('romAfter', e.target.value)}
                    readOnly={isReviewMode}
                    placeholder="Example: Improved overhead reach and less hip pinch"
                    className="mt-2 h-20 w-full resize-none rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Coach Notes</p>
                  <textarea
                    value={sketchingRecord.coachNotes}
                    onChange={(e) => updateSketchingRecord('coachNotes', e.target.value)}
                    readOnly={isReviewMode}
                    placeholder="Example: Left side still guarding under fatigue"
                    className="mt-2 h-20 w-full resize-none rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Follow-up</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Home Protocol</p>
                  <textarea
                    value={sketchingRecord.homeProtocol}
                    onChange={(e) => updateSketchingRecord('homeProtocol', e.target.value)}
                    readOnly={isReviewMode}
                    placeholder="Example: 90/90 breathing + couch stretch daily"
                    className="mt-2 h-20 w-full resize-none rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Next Session Focus</p>
                  <textarea
                    value={sketchingRecord.nextSessionFocus}
                    onChange={(e) => updateSketchingRecord('nextSessionFocus', e.target.value)}
                    readOnly={isReviewMode}
                    placeholder="Example: Recheck hip IR and add ankle mobility progression"
                    className="mt-2 h-20 w-full resize-none rounded-[12px] border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!isSketchingSession && (
        <div>
           <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Trainee Condition</p>
           <div className="grid grid-cols-4 gap-2">
              {[ {id:'tired', label:'Tired', Icon:BatteryWarning, col:'red'}, {id:'ok', label:'Okay', Icon:Battery, col:'yellow'}, {id:'good', label:'Good', Icon:BatteryMedium, col:'emerald'}, {id:'fire', label:'On Fire', Icon:Flame, col:'purple'} ].map(f => (
                 <button key={f.id} onClick={() => !isReviewMode && setFeeling(f.id)} disabled={isReviewMode} className={`flex flex-col items-center justify-center py-3 border rounded-[14px] transition-all gap-1.5 disabled:opacity-100 ${feeling === f.id ? `bg-${f.col}-500/15 border-${f.col}-500/30 text-${f.col}-400` : 'bg-white/[0.03] border-white/[0.05] text-neutral-500 hover:bg-white/[0.05]'}`}>
                    <f.Icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{f.label}</span>
                 </button>
              ))}
           </div>
        </div>
        )}

        {!isSketchingSession && (
        <div>
           <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Extra Notes (Optional)</p>
           <textarea value={notes} onChange={e => setNotes(e.target.value)} readOnly={isReviewMode} placeholder="Add a note..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-2.5 px-4 text-white text-sm outline-none focus:border-white/30 resize-none h-20" />
        </div>
        )}

        {/* [E] 3 Buttons */}
        {isReviewMode ? (
          <div className="w-full py-3 text-center text-[11px] font-semibold text-white/45 border border-white/[0.06] bg-white/[0.03] rounded-[18px]">
            Completed sessions are view-only.
          </div>
        ) : (
          <>
            <div className="flex gap-2 mt-2">
               <button onClick={() => handleSave('in_progress')} disabled={saving || !selectedSessionId || !hasWorkoutData} className="app-ghost-button flex-1 py-3.5 border rounded-[18px] text-white font-bold text-sm text-center active:scale-95 transition-all disabled:opacity-50">
                 Save Draft
               </button>
               <button onClick={() => handleSave('completed')} disabled={saving || !selectedSessionId || !hasWorkoutData} className="app-cta-button flex-1 py-3.5 border text-black font-bold text-sm rounded-[18px] text-center active:scale-[0.98] transition-all disabled:opacity-50">
                 Complete
               </button>
            </div>
            <button onClick={() => setShowCancelReason(true)} disabled={saving || !selectedSessionId} className="w-full py-3 text-red-400 text-sm font-bold text-center bg-red-500/10 border border-red-500/20 rounded-[18px] active:scale-95 transition-all disabled:opacity-50">
               Cancel
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default QuickLogSheet;
