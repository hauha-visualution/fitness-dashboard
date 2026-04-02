import React, { useState, useEffect, useCallback } from 'react';
import { Package, Zap, Plus, Lock, ChevronDown, ChevronUp, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import CreatePackageModal from '../Modals/CreatePackageModal';

const DAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const formatScheduleLabel = (weekly_schedule) => {
  if (!weekly_schedule?.length) return '';
  return weekly_schedule.map(s => `${DAY_VI[s.day]} ${s.time}`).join(' · ');
};

const PackageTab = ({ client, readOnly = false }) => {
  const clientId = client?.id;
  const [packages, setPackages] = useState([]);
  const [sessionCounts, setSessionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedPkg, setExpandedPkg] = useState(null);
  const [packageToDelete, setPackageToDelete] = useState(null);
  const [deletingPackage, setDeletingPackage] = useState(false);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data: pkgs } = await supabase
      .from('packages')
      .select('*')
      .eq('client_id', clientId)
      .order('package_number', { ascending: true });

    if (!pkgs) { setLoading(false); return; }

    const counts = {};
    await Promise.all(pkgs.map(async pkg => {
      const { count: completed } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('package_id', pkg.id)
        .eq('status', 'completed');
      counts[pkg.id] = {
        total: pkg.total_sessions,
        completed: completed ?? 0,
        remaining: pkg.total_sessions - (completed ?? 0),
      };
    }));

    setPackages(pkgs);
    setSessionCounts(counts);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  const handleDeletePackage = async () => {
    if (!packageToDelete?.id) return;
    setDeletingPackage(true);

    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', packageToDelete.id);

    if (error) {
      alert(`Không thể xóa gói tập: ${error.message}`);
      setDeletingPackage(false);
      return;
    }

    setPackageToDelete(null);
    setDeletingPackage(false);
    void fetchData();
  };

  const activePackage = packages.find(p => p.status === 'active');
  const completedPackages = packages.filter(p => p.status === 'completed');
  const ac = activePackage ? (sessionCounts[activePackage.id] ?? {}) : {};
  const remaining = ac.remaining ?? 0;
  const total = ac.total ?? 0;
  const done = ac.completed ?? 0;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const canCreateNew = !activePackage || remaining < 5;
  const nextPackageNumber = packages.length + 1;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );

  if (packages.length === 0) return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center py-16 space-y-4">
        <Package className="w-12 h-12 mx-auto text-neutral-800" />
        <div>
          <p className="text-white font-medium">Chưa có gói tập</p>
          <p className="text-neutral-600 text-xs mt-1">
            {readOnly ? 'Coach chưa tạo gói tập cho bạn.' : 'Tạo gói đầu tiên cho học viên.'}
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowModal(true)}
            className="mx-auto flex items-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-[20px] text-sm active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Tạo Gói Đầu Tiên
          </button>
        )}
      </div>
      {showModal && (
        <CreatePackageModal clientId={clientId} packageNumber={1} onClose={() => setShowModal(false)} onCreated={fetchData} />
      )}
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Active Package Card */}
      {activePackage && (
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/15 border border-white/10 rounded-[32px] p-6 relative overflow-hidden">
          <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/[0.04] rotate-12" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Gói đang tập</p>
              <h3 className="text-white font-medium text-xl mt-0.5">
                Gói #{String(activePackage.package_number).padStart(2, '0')}
                {activePackage.note && <span className="text-sm text-blue-300/70 font-normal ml-2">· {activePackage.note}</span>}
                <span className="text-sm text-neutral-500 font-normal ml-2">· {activePackage.total_sessions} buổi</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && (
                <button
                  onClick={() => setPackageToDelete(activePackage)}
                  className="p-2.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 active:scale-90 transition-all"
                  aria-label="Xóa gói tập"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase">Active</span>
            </div>
          </div>

          <div className="flex justify-around items-center mb-5">
            {[{ val: remaining, label: 'Còn lại' }, { val: done, label: 'Đã tập' }, { val: total, label: 'Tổng buổi' }].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-10 bg-white/10" />}
                <div className="text-center">
                  <p className="text-3xl font-light text-white">{item.val}</p>
                  <p className="text-[8px] font-black text-neutral-500 uppercase mt-0.5">{item.label}</p>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-[9px] text-neutral-600">{progressPct}% hoàn thành</p>

          {activePackage.weekly_schedule?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <p className="text-[11px] text-neutral-500">{formatScheduleLabel(activePackage.weekly_schedule)}</p>
            </div>
          )}
          {activePackage.bonus_sessions > 0 && (
            <p className="text-[10px] text-purple-400 mt-2">🎁 Bao gồm {activePackage.bonus_sessions} buổi tặng</p>
          )}
        </div>
      )}

      {/* Create New Package Button */}
      {!readOnly && (
        canCreateNew ? (
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] text-white font-bold py-4 rounded-[24px] text-sm active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Tạo Gói #{String(nextPackageNumber).padStart(2, '0')}
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-[24px] px-5 py-4">
            <Lock className="w-4 h-4 text-neutral-700 shrink-0" />
            <p className="text-neutral-600 text-xs">
              Gói mới được tạo khi gói hiện tại còn dưới 5 buổi
              <span className="text-neutral-500"> (hiện còn {remaining})</span>
            </p>
          </div>
        )
      )}

      {/* Package History */}
      {completedPackages.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3 ml-1">Lịch sử gói</p>
          <div className="space-y-2">
            {completedPackages.map(pkg => {
              const cnt = sessionCounts[pkg.id] ?? {};
              const expanded = expandedPkg === pkg.id;
              return (
                <div key={pkg.id} className="bg-white/[0.02] border border-white/[0.06] rounded-[20px] overflow-hidden">
                  <button onClick={() => setExpandedPkg(expanded ? null : pkg.id)} className="w-full flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-neutral-600 uppercase">Gói #{String(pkg.package_number).padStart(2, '0')}</span>
                      {pkg.note && <span className="text-[10px] text-neutral-500 font-medium">{pkg.note}</span>}
                      <span className="text-xs text-neutral-500">{pkg.total_sessions} buổi</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-neutral-700 uppercase">Hoàn thành</span>
                      {!readOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPackageToDelete(pkg);
                          }}
                          className="p-2 rounded-full border border-red-500/15 bg-red-500/10 text-red-400 active:scale-90 transition-all"
                          aria-label={`Xóa gói ${pkg.package_number}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {expanded ? <ChevronUp className="w-3.5 h-3.5 text-neutral-600" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-5 pb-4 border-t border-white/[0.04] pt-3 space-y-1.5 text-xs text-neutral-500">
                      <div className="flex justify-between"><span>Tổng buổi</span><span className="text-white">{pkg.total_sessions}</span></div>
                      <div className="flex justify-between"><span>Đã tập</span><span className="text-emerald-400">{cnt.completed ?? 0}</span></div>
                      {pkg.price > 0 && <div className="flex justify-between"><span>Giá tiền</span><span className="text-white">{pkg.price.toLocaleString('vi-VN')} đ</span></div>}
                      {pkg.weekly_schedule?.length > 0 && <div className="flex justify-between"><span>Lịch</span><span className="text-white">{formatScheduleLabel(pkg.weekly_schedule)}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <CreatePackageModal clientId={clientId} packageNumber={nextPackageNumber} onClose={() => setShowModal(false)} onCreated={fetchData} />
      )}

      {packageToDelete && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[28px] border border-red-500/20 bg-[#111113] p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-red-400/70">Xóa gói tập</p>
                <h3 className="text-white font-semibold">Gói #{String(packageToDelete.package_number).padStart(2, '0')}</h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-400">
              Xóa gói này sẽ xóa luôn toàn bộ session thuộc gói do đang dùng liên kết `ON DELETE CASCADE`.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPackageToDelete(null)}
                className="flex-1 py-3.5 rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white font-bold text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleDeletePackage}
                disabled={deletingPackage}
                className="flex-1 py-3.5 rounded-[16px] bg-red-500 text-white font-bold text-sm disabled:opacity-50"
              >
                {deletingPackage ? 'Đang xóa...' : 'Xóa gói'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackageTab;
