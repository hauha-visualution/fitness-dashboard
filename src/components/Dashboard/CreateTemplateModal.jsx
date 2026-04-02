import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Plus, GripVertical, Check, Trash2 } from 'lucide-react';

const createExerciseDraft = (id) => ({
  id,
  name: '',
  sets: 3,
  reps: 10,
  weight: 0,
  note: '',
});

const normalizeExerciseDraft = (exercise, fallbackSortOrder) => ({
  name: exercise.name.trim(),
  sets: Math.max(1, Number(exercise.sets) || 1),
  reps: Math.max(1, Number(exercise.reps) || 1),
  weight: Math.max(0, Number(exercise.weight) || 0),
  sort_order: fallbackSortOrder,
  note: exercise.note.trim() || null,
});

const mapInitialExercise = (exercise, fallbackIndex = 0) => ({
  id: exercise.id ?? `template-exercise-${fallbackIndex}`,
  name: exercise.name ?? '',
  sets: Math.max(1, Number(exercise.sets) || 1),
  reps: Math.max(1, Number(exercise.reps) || 1),
  weight: Math.max(0, Number(exercise.weight) || 0),
  note: exercise.note ?? '',
});

const CreateTemplateModal = ({ onClose, onCreated, session, initialTemplate = null }) => {
  const isEditMode = Boolean(initialTemplate?.id);
  const [templateName, setTemplateName] = useState('');
  
  // Clients assignment
  const [clients, setClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  
  // Exercises map
  const exerciseIdRef = useRef(1);
  const [exercises, setExercises] = useState([createExerciseDraft('template-exercise-0')]);
  
  const [saving, setSaving] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch coach's clients
  useEffect(() => {
    const fetchClients = async () => {
      const coachEmail = session?.user?.email;
      if (!coachEmail) return;
      const { data } = await supabase.from('clients').select('id, name').eq('coach_email', coachEmail);
      if (data) setClients(data);
    };
    fetchClients();
  }, [session]);

  useEffect(() => {
    if (!initialTemplate) return;

    setTemplateName(initialTemplate.name || '');
    setSelectedClientIds((initialTemplate.template_assignments || []).map((assignment) => assignment.client_id));

    const nextExercises = (initialTemplate.template_exercises || []).length > 0
      ? [...initialTemplate.template_exercises]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((exercise, idx) => mapInitialExercise(exercise, idx))
      : [createExerciseDraft('template-exercise-0')];

    exerciseIdRef.current = nextExercises.length + 1;
    setExercises(nextExercises);
  }, [initialTemplate]);

  const toggleClient = (id) => {
    setErrorMessage('');
    setSelectedClientIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const updateExercise = (id, field, value) => {
    setErrorMessage('');
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const removeExercise = (id) => {
    setErrorMessage('');
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const addExercise = () => {
    const nextId = `template-exercise-${exerciseIdRef.current++}`;
    setErrorMessage('');
    setExercises(prev => [...prev, createExerciseDraft(nextId)]);
  };

  // HTML5 Drag and drop
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e) => {
    setDraggedIdx(null);
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    // Swap elements
    const newEx = [...exercises];
    const draggedItem = newEx[draggedIdx];
    newEx.splice(draggedIdx, 1);
    newEx.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setExercises(newEx);
  };

  // Save logic
  const handleSave = async () => {
    const cleanName = templateName.trim();
    const cleanedExercises = exercises
      .map((exercise, idx) => normalizeExerciseDraft(exercise, idx))
      .filter(exercise => exercise.name);

    if (!cleanName) {
      setErrorMessage('Vui lòng nhập tên gói bài tập.');
      return;
    }

    if (cleanedExercises.length === 0) {
      setErrorMessage('Cần ít nhất 1 bài tập có tên để tạo gói.');
      return;
    }

    if (cleanedExercises.length !== exercises.length) {
      setErrorMessage('Một số bài tập đang để trống tên. Hãy điền hoặc xoá trước khi lưu.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    const coachEmail = session?.user?.email;
    if (!coachEmail) {
      setErrorMessage('Không tìm thấy thông tin coach. Hãy đăng nhập lại rồi thử lại.');
      setSaving(false);
      return;
    }

    try {
      let templateId = initialTemplate?.id ?? null;

      if (isEditMode) {
        const { error: templateUpdateError } = await supabase
          .from('workout_templates')
          .update({ name: cleanName })
          .eq('id', templateId)
          .eq('coach_email', coachEmail);

        if (templateUpdateError) throw templateUpdateError;

        const { error: deleteExercisesError } = await supabase
          .from('template_exercises')
          .delete()
          .eq('template_id', templateId);

        if (deleteExercisesError) throw deleteExercisesError;

        const { error: deleteAssignmentsError } = await supabase
          .from('template_assignments')
          .delete()
          .eq('template_id', templateId);

        if (deleteAssignmentsError) throw deleteAssignmentsError;
      } else {
        const { data: tmplData, error: tmplErr } = await supabase
          .from('workout_templates')
          .insert({ coach_email: coachEmail, name: cleanName })
          .select('id')
          .single();

        if (tmplErr) {
          throw tmplErr;
        }

        templateId = tmplData.id;
      }

      // 2. Insert exercises
      const exDocs = cleanedExercises.map(exercise => ({
        template_id: templateId,
        ...exercise,
      }));
      const { error: exerciseError } = await supabase.from('template_exercises').insert(exDocs);
      if (exerciseError) {
        throw exerciseError;
      }

      // 3. Insert assignments if any
      if (selectedClientIds.length > 0) {
        const assignDocs = selectedClientIds.map(clientId => ({
          template_id: templateId,
          client_id: clientId,
        }));
        const { error: assignmentError } = await supabase.from('template_assignments').insert(assignDocs);
        if (assignmentError) {
          throw assignmentError;
        }
      }

      onCreated?.();
      onClose();
    } catch (error) {
      console.error('Create template error:', error);
      setErrorMessage(error.message || 'Không thể tạo gói bài tập. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!saving) onClose(); }} />
      
      {/* Sheet / Full modal */}
      <div className="absolute bottom-0 w-full h-[92vh] bg-[#0d0d0d] border-t border-white/10 rounded-t-[32px] flex flex-col overflow-hidden animate-slide-up shadow-2xl">
        
        {/* Header (Sticky) */}
        <div className="bg-[#0d0d0d]/95 backdrop-blur-xl z-10 px-6 pt-5 pb-4 border-b border-white/[0.06] flex flex-col shrink-0 gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest shrink-0">{isEditMode ? 'Chỉnh Sửa Gói' : 'Tạo Gói Mới'}</span>
            <button onClick={onClose} disabled={saving} className="p-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-neutral-500 active:scale-90 transition-all shrink-0 disabled:opacity-40"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 hide-scrollbar flex flex-col gap-6">
           
           {/* Section 1: Template Name */}
           <div>
             <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Tên gói bài tập</label>
             <input type="text" value={templateName} onChange={e => { setTemplateName(e.target.value); setErrorMessage(''); }} placeholder="VD: Full body A — Thứ 4" className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[14px] py-3 px-4 text-white text-sm font-medium outline-none focus:border-white/30 transition-all" />
           </div>

           {/* Section 2: Assign To */}
           <div>
             <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Assigned To</label>
             <div className="flex flex-wrap gap-2">
               {clients.map(c => {
                 const isSel = selectedClientIds.includes(c.id);
                 return (
                   <button key={c.id} onClick={() => toggleClient(c.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${isSel ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' : 'bg-white/[0.04] border border-white/[0.08] text-neutral-500 hover:bg-white/[0.08]'}`}>
                     {isSel && <Check className="w-3.5 h-3.5" />}
                     {c.name}
                   </button>
                 );
               })}
             </div>
           </div>

           {/* Section 3: Exercises List */}
           <div>
             <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Exercise List ({exercises.length})</label>
             
             <div className="space-y-3">
               {exercises.map((ex, idx) => (
                 <div key={ex.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragEnd={handleDragEnd} onDragOver={(e) => handleDragOver(e, idx)} className="bg-white/[0.03] border border-white/[0.06] rounded-[18px] p-3 flex flex-col gap-2.5 relative cursor-move">
                   <div className="flex items-center gap-2">
                     <GripVertical className="w-4 h-4 text-white/20 shrink-0" />
                     <input type="text" placeholder={`Tên bài tập #${idx + 1}`} value={ex.name} onChange={e => updateExercise(ex.id, 'name', e.target.value)} className="flex-1 min-w-0 bg-transparent text-white font-semibold text-sm outline-none placeholder:text-neutral-600" />
                     <button type="button" onClick={() => removeExercise(ex.id)} className="p-1.5 h-fit text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>

                   <div className="pl-6 grid grid-cols-3 gap-2">
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

                   <div className="pl-6">
                     <input type="text" placeholder="Ghi chú bài tập (tuỳ chọn)" value={ex.note} onChange={e => updateExercise(ex.id, 'note', e.target.value)} className="w-full bg-black/40 border border-white/[0.05] rounded-[10px] py-2 px-3 text-neutral-300 text-xs outline-none focus:border-white/20 transition-all" />
                   </div>
                 </div>
               ))}
               
               <button onClick={addExercise} className="w-full py-3.5 border border-dashed border-white/20 rounded-[18px] text-neutral-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.02] active:border-white/40 transition-all">
                 <Plus className="w-4 h-4" /> Thêm bài tập
               </button>
             </div>
           </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0d0d0d]/95 backdrop-blur-xl shrink-0 p-5 pt-3 border-t border-white/[0.06] pb-8">
           {errorMessage && (
             <div className="mb-3 rounded-[16px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
               {errorMessage}
             </div>
           )}
           <div className="flex gap-3">
           <button onClick={onClose} disabled={saving} className="flex-1 py-4 bg-white/[0.04] border border-white/[0.08] text-white font-bold rounded-[18px] active:scale-95 transition-all text-sm disabled:opacity-50">
             Huỷ
           </button>
           <button onClick={handleSave} disabled={saving || !templateName.trim() || exercises.length === 0} className="flex-1 py-4 bg-white text-black font-bold rounded-[18px] active:scale-[0.98] transition-all text-sm disabled:opacity-50">
             {saving ? (isEditMode ? 'Đang lưu...' : 'Đang tạo...') : (isEditMode ? 'Lưu thay đổi' : 'Tạo gói bài tập')}
           </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default CreateTemplateModal;
