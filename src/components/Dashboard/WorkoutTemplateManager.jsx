import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronDown, ChevronUp, Dumbbell, Plus, RefreshCw, Trash2, UserRound, AlertTriangle, Pencil } from 'lucide-react';
import CreateTemplateModal from './CreateTemplateModal';

const WorkoutTemplateManager = ({ session }) => {
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplateId, setExpandedTemplateId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const fetchData = useCallback(async () => {
    const coachEmail = session?.user?.email;
    if (!coachEmail) return;

    setLoading(true);

    const [{ data: templatesData, error: templatesError }, { data: clientsData }] = await Promise.all([
      supabase
        .from('workout_templates')
        .select('id, name, created_at, template_exercises(*), template_assignments(client_id)')
        .eq('coach_email', coachEmail)
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name')
        .eq('coach_email', coachEmail),
    ]);

    if (templatesError) {
      alert(`Không tải được gói bài tập: ${templatesError.message}`);
      setTemplates([]);
      setClients(clientsData ?? []);
      setLoading(false);
      return;
    }

    setTemplates(templatesData ?? []);
    setClients(clientsData ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  const handleDeleteTemplate = async () => {
    if (!templateToDelete?.id) return;

    setDeletingTemplate(true);
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateToDelete.id);

    if (error) {
      alert(`Không thể xóa gói bài tập: ${error.message}`);
      setDeletingTemplate(false);
      return;
    }

    setTemplateToDelete(null);
    setDeletingTemplate(false);
    void fetchData();
  };

  const clientsById = clients.reduce((acc, client) => {
    acc[client.id] = client.name;
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#161616] via-[#0c0c0d] to-black overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Quản lý</p>
            <h2 className="text-lg font-semibold text-white">Workout Templates</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-[14px] bg-white text-black active:scale-95 transition-all shadow-lg"
            aria-label="Tạo gói bài tập"
            title="Tạo gói bài tập"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 hide-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-5 h-5 text-neutral-500 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Dumbbell className="w-12 h-12 mx-auto text-neutral-800" />
            <div>
              <p className="text-white font-medium">No workout templates yet</p>
              <p className="text-neutral-600 text-xs mt-1">Create templates here so you can quickly add them to sessions.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mx-auto flex items-center gap-2 px-5 py-3 rounded-[18px] bg-white/[0.05] border border-white/[0.08] text-white font-bold text-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create your first template
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const expanded = expandedTemplateId === template.id;
              const assignedNames = (template.template_assignments || [])
                .map((assignment) => clientsById[assignment.client_id])
                .filter(Boolean);
              const exerciseCount = template.template_exercises?.length || 0;

              return (
                <div key={template.id} className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                  <button
                    onClick={() => setExpandedTemplateId(expanded ? null : template.id)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Workout Templates</p>
                      <h3 className="text-white font-semibold text-base truncate mt-1">{template.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500">
                          <Dumbbell className="w-3 h-3 text-neutral-600" />
                          {exerciseCount}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500">
                          <UserRound className="w-3 h-3 text-neutral-600" />
                          {assignedNames.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(template);
                        }}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] border border-white/[0.08] bg-white/[0.04] text-white active:scale-95 transition-all"
                        aria-label={`Sửa ${template.name}`}
                        title="Sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template);
                        }}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-[12px] border border-red-500/15 bg-red-500/10 text-red-400 active:scale-90 transition-all"
                        aria-label={`Xóa ${template.name}`}
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-2">Assigned To</p>
                        {assignedNames.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {assignedNames.map((name) => (
                              <span key={name} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-semibold text-blue-300">
                                <UserRound className="w-3 h-3" />
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-500">No trainees assigned yet.</p>
                        )}
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-2">Exercise List</p>
                        <div className="space-y-2">
                          {[...(template.template_exercises || [])]
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            .map((exercise, idx) => (
                              <div key={exercise.id} className="rounded-[16px] border border-white/[0.05] bg-black/20 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{idx + 1}. {exercise.name}</p>
                                    {exercise.note && (
                                      <p className="text-[11px] text-neutral-500 mt-1">{exercise.note}</p>
                                    )}
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Sets / Reps / Kg</p>
                                    <p className="text-sm font-semibold text-neutral-300">{exercise.sets} / {exercise.reps} / {exercise.weight}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTemplateModal
          session={session}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchData}
        />
      )}

      {editingTemplate && (
        <CreateTemplateModal
          session={session}
          initialTemplate={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onCreated={() => {
            setEditingTemplate(null);
            void fetchData();
          }}
        />
      )}

      {templateToDelete && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[28px] border border-red-500/20 bg-[#111113] p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-red-400/70">Xóa gói bài tập</p>
                <h3 className="text-white font-semibold">{templateToDelete.name}</h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-400">
              Xóa gói này sẽ xóa luôn toàn bộ bài tập và assignment của gói đó. Start Workout sẽ không còn chọn được gói này nữa.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTemplateToDelete(null)}
                className="flex-1 py-3.5 rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white font-bold text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteTemplate}
                disabled={deletingTemplate}
                className="flex-1 py-3.5 rounded-[16px] bg-red-500 text-white font-bold text-sm disabled:opacity-50"
              >
                {deletingTemplate ? 'Đang xóa...' : 'Xóa gói'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutTemplateManager;
