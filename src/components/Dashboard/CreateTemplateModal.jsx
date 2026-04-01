import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Plus, GripVertical, Check, Trash2 } from 'lucide-react';

const CreateTemplateModal = ({ onClose, session }) => {
  const [templateName, setTemplateName] = useState('');
  
  // Clients assignment
  const [clients, setClients] = useState([]);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  
  // Exercises map
  const [exercises, setExercises] = useState([
    { id: Date.now().toString(), name: '', sets: 3, reps: 10, video_url: '' }
  ]);
  
  const [saving, setSaving] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);

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

  const toggleClient = (id) => {
    setSelectedClientIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const updateExercise = (id, field, value) => {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const removeExercise = (id) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const addExercise = () => {
    setExercises(prev => [...prev, { id: Date.now().toString(), name: '', sets: 3, reps: 10, video_url: '' }]);
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
    if (!templateName.trim() || exercises.length === 0) return;
    
    setSaving(true);
    const coachEmail = session?.user?.email;

    // 1. Insert Template
    const { data: tmplData, error: tmplErr } = await supabase
      .from('workout_templates')
      .insert({ coach_email: coachEmail, name: templateName })
      .select('id')
      .single();
      
    if (tmplErr) { console.error('Tmpl Error:', tmplErr); setSaving(false); return; }
    const templateId = tmplData.id;

    // 2. Insert exercises
    const exDocs = exercises.map((ex, idx) => ({
      template_id: templateId,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      sort_order: idx,
      video_url: ex.video_url || null
    }));
    await supabase.from('template_exercises').insert(exDocs);

    // 3. Insert assignments if any
    if (selectedClientIds.length > 0) {
      const assignDocs = selectedClientIds.map(clientId => ({
        template_id: templateId,
        client_id: clientId
      }));
      await supabase.from('template_assignments').insert(assignDocs);
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sheet / Full modal */}
      <div className="absolute bottom-0 w-full h-[92vh] bg-[#0d0d0d] border-t border-white/10 rounded-t-[32px] flex flex-col overflow-hidden animate-slide-up shadow-2xl">
        
        {/* Header (Sticky) */}
        <div className="bg-[#0d0d0d]/95 backdrop-blur-xl z-10 px-6 pt-5 pb-4 border-b border-white/[0.06] flex flex-col shrink-0 gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest shrink-0">Tạo Gói Mới</span>
            <button onClick={onClose} className="p-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-neutral-500 active:scale-90 transition-all shrink-0"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 hide-scrollbar flex flex-col gap-6">
           
           {/* Section 1: Template Name */}
           <div>
             <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Tên gói bài tập</label>
             <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="VD: Full body A — Thứ 4" className="w-full bg-white/[0.04] border border-white/[0.1] rounded-[14px] py-3 px-4 text-white text-sm font-medium outline-none focus:border-white/30 transition-all" />
           </div>

           {/* Section 2: Assign To */}
           <div>
             <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Áp dụng cho học viên</label>
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
             <label className="block text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">Danh sách bài tập ({exercises.length})</label>
             
             <div className="space-y-4">
               {exercises.map((ex, idx) => (
                 <div key={ex.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragEnd={handleDragEnd} onDragOver={(e) => handleDragOver(e, idx)} className="bg-white/[0.03] border border-white/[0.06] rounded-[20px] p-4 flex flex-col gap-3 relative cursor-move">
                   
                   <div className="flex gap-3">
                     <GripVertical className="w-5 h-5 text-white/20 mt-3 shrink-0" />
                     <div className="flex-1 min-w-0">
                       <input type="text" placeholder="Tên bài tập..." value={ex.name} onChange={e => updateExercise(ex.id, 'name', e.target.value)} className="w-full bg-transparent border-b border-white/10 pb-2 text-white font-semibold text-lg outline-none focus:border-white/30 transition-all" />
                     </div>
                     <button onClick={() => removeExercise(ex.id)} className="p-2 h-fit text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>

                   {/* Sets & Reps Stepper */}
                   <div className="pl-8 flex gap-3">
                     {/* Sets */}
                     <div className="flex-1 flex items-center bg-white/[0.04] border border-white/[0.08] rounded-[12px] p-1">
                        <span className="text-[10px] font-black text-neutral-600 uppercase px-2 w-[45px]">Sets</span>
                        <button onClick={() => updateExercise(ex.id, 'sets', Math.max(1, ex.sets - 1))} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">-</button>
                        <span className="flex-1 text-center text-white font-semibold">{ex.sets}</span>
                        <button onClick={() => updateExercise(ex.id, 'sets', ex.sets + 1)} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">+</button>
                     </div>
                     {/* Reps */}
                     <div className="flex-1 flex items-center bg-white/[0.04] border border-white/[0.08] rounded-[12px] p-1">
                        <span className="text-[10px] font-black text-neutral-600 uppercase px-2 w-[45px]">Reps</span>
                        <button onClick={() => updateExercise(ex.id, 'reps', Math.max(1, ex.reps - 1))} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">-</button>
                        <span className="flex-1 text-center text-white font-semibold">{ex.reps}</span>
                        <button onClick={() => updateExercise(ex.id, 'reps', ex.reps + 1)} className="p-1 text-neutral-400 active:bg-white/10 rounded-md transition-all">+</button>
                     </div>
                   </div>

                   {/* Video URL */}
                   <div className="pl-8">
                     <input type="text" placeholder="Link video YouTube hướng dẫn (tuỳ chọn)" value={ex.video_url} onChange={e => updateExercise(ex.id, 'video_url', e.target.value)} className="w-full bg-black/40 border border-white/[0.05] rounded-[10px] py-2 px-3 text-neutral-400 text-xs outline-none focus:border-white/20 transition-all" />
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
        <div className="bg-[#0d0d0d]/95 backdrop-blur-xl shrink-0 p-5 pt-3 border-t border-white/[0.06] flex gap-3 pb-8">
           <button onClick={onClose} disabled={saving} className="flex-1 py-4 bg-white/[0.04] border border-white/[0.08] text-white font-bold rounded-[18px] active:scale-95 transition-all text-sm disabled:opacity-50">
             Huỷ
           </button>
           <button onClick={handleSave} disabled={saving || !templateName.trim() || exercises.length === 0} className="flex-1 py-4 bg-white text-black font-bold rounded-[18px] active:scale-[0.98] transition-all text-sm disabled:opacity-50">
             {saving ? 'Đang tạo...' : 'Tạo gói bài tập'}
           </button>
        </div>

      </div>
    </div>
  );
};

export default CreateTemplateModal;
