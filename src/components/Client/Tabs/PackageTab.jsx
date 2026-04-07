import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Package, Zap, Plus, ChevronDown, ChevronUp, Calendar, Trash2, AlertTriangle, WalletCards, PencilLine, Clock3, MapPin, X } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import CreatePackageModal from '../Modals/CreatePackageModal';
import {
  buildMealPrepPaymentDetail,
  getServiceTotalLabel,
  getServiceTypeLabel,
  parseServiceMeta,
  serializeServiceBooking,
} from '../../../utils/serviceUtils';

const DAY_VI = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatScheduleLabel = (weekly_schedule) => {
  if (!weekly_schedule?.length) return '';
  return weekly_schedule.map(s => `${DAY_VI[s.day]} ${s.time}`).join(' · ');
};

const formatCreatedDate = (iso) => {
  if (!iso) return '--';
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '--';
  return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
};

const PackageTab = ({ client, readOnly = false }) => {
  const clientId = client?.id;
  const [packages, setPackages] = useState([]);
  const [sessionCounts, setSessionCounts] = useState({});
  const [packagePayments, setPackagePayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [expandedPkg, setExpandedPkg] = useState(null);
  const [packageToDelete, setPackageToDelete] = useState(null);
  const [deletingPackage, setDeletingPackage] = useState(false);
  const [creatingPaymentFor, setCreatingPaymentFor] = useState(null);
  const [bookingPackage, setBookingPackage] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('');
  const [bookingEndTime, setBookingEndTime] = useState('');
  const [bookingLocation, setBookingLocation] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [mealPrepDetailPackage, setMealPrepDetailPackage] = useState(null);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [{ data: pkgs }, { data: payments }] = await Promise.all([
      supabase
        .from('packages')
        .select('*')
        .eq('client_id', clientId)
        .order('package_number', { ascending: true }),
      supabase
        .from('payments')
        .select('id, package_id, status')
        .eq('client_id', clientId),
    ]);

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
    setPackagePayments(
      (payments || []).reduce((acc, payment) => {
        if (!payment.package_id) return acc;
        acc[payment.package_id] = acc[payment.package_id] || [];
        acc[payment.package_id].push(payment);
        return acc;
      }, {})
    );
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
      alert(`Unable to delete package: ${error.message}`);
      setDeletingPackage(false);
      return;
    }

    setPackageToDelete(null);
    setDeletingPackage(false);
    void fetchData();
  };

  const activePackages = packages.filter(p => p.status === 'active');
  const completedPackages = packages.filter(p => p.status === 'completed');
  const nextPackageNumber = packages.length + 1;
  
  const handleCreateMealPrepPayment = async (pkg, pkgMetaRaw, pkgMeta) => {
    if (!pkg || !pkgMeta || creatingPaymentFor) return;
    setCreatingPaymentFor(pkg.id);

    const { error } = await supabase.from('payments').insert([{
      client_id: clientId,
      package_id: pkg.id,
      package_number: pkg.package_number,
      amount: Number(pkg.price || 0),
      status: 'pending',
      payment_type: 'prep_meal',
      title: `${pkgMeta.typeLabel} #${String(pkg.package_number).padStart(2, '0')}`,
      detail_note: buildMealPrepPaymentDetail(pkgMetaRaw?.mealPrepItems || [], pkgMeta.coachNote),
      payment_method: 'bank_transfer',
      created_by: 'coach',
    }]);

    if (error) {
      alert(`Unable to create meal prep payment: ${error.message}`);
      setCreatingPaymentFor(null);
      return;
    }

    setCreatingPaymentFor(null);
    void fetchData();
  };

  const openStretchingBooking = (pkg) => {
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setBookingPackage(pkg);
    setBookingDate(isoDate);
    setBookingStartTime('07:00');
    setBookingEndTime('08:00');
    setBookingLocation('');
    setBookingNote('');
  };

  const handleCreateStretchingBooking = async () => {
    if (!bookingPackage || !bookingDate || !bookingStartTime || !bookingEndTime) return;
    setIsCreatingBooking(true);

    const packageSessions = await supabase
      .from('sessions')
      .select('session_number, status')
      .eq('package_id', bookingPackage.id);

    if (packageSessions.error) {
      alert(`Unable to load existing sessions: ${packageSessions.error.message}`);
      setIsCreatingBooking(false);
      return;
    }

    const activeNonCancelledCount = (packageSessions.data || []).filter((item) => item.status !== 'cancelled').length;
    if (activeNonCancelledCount >= bookingPackage.total_sessions) {
      alert('All included sessions have already been scheduled for this service.');
      setIsCreatingBooking(false);
      return;
    }

    const nextSessionNumber = (packageSessions.data || []).reduce((max, item) => Math.max(max, item.session_number || 0), 0) + 1;
    const { error } = await supabase.from('sessions').insert([{
      client_id: clientId,
      package_id: bookingPackage.id,
      session_number: nextSessionNumber,
      scheduled_date: bookingDate,
      scheduled_time: bookingStartTime,
      status: 'scheduled',
      notes: serializeServiceBooking({
        endTime: bookingEndTime,
        location: bookingLocation,
        note: bookingNote,
      }),
      session_kind: 'manual',
    }]);

    if (error) {
      alert(`Unable to create booking: ${error.message}`);
      setIsCreatingBooking(false);
      return;
    }

    setIsCreatingBooking(false);
    setBookingPackage(null);
    void fetchData();
  };

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
          <p className="text-white font-medium">No Active Service Yet</p>
          <p className="text-neutral-600 text-xs mt-1">
            {readOnly
              ? 'Your coach has not assigned a service yet.'
              : 'Create the first service for this trainee.'}
          </p>
          <p className="text-neutral-700 text-[11px] mt-2">
            Training, stretching, and meal prep services can all live here.
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => {
              setEditingPackage(null);
              setShowModal(true);
            }}
            className="app-cta-button mx-auto flex items-center gap-2 border px-6 py-3 rounded-[20px] text-sm active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Create First Service
          </button>
        )}
      </div>
      {showModal && (
        <CreatePackageModal
          clientId={clientId}
          packageNumber={1}
          existingPackage={editingPackage}
          onClose={() => {
            setShowModal(false);
            setEditingPackage(null);
          }}
          onCreated={fetchData}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up lg:space-y-6">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Services</p>
            <p className="mt-1 text-[11px] text-neutral-500">Training packages, stretching sessions, and meal prep support.</p>
          </div>
          <button
            onClick={() => {
              setEditingPackage(null);
              setShowModal(true);
            }}
            className="app-ghost-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white transition-all active:scale-95"
            aria-label="Add service"
            title="Add service"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active Service Cards */}
      {activePackages.length > 0 && (
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:items-start">
          {activePackages.map((pkg) => {
            const pkgMetaRaw = parseServiceMeta(pkg.note);
            const pkgMeta = {
              ...pkgMetaRaw,
              type: pkgMetaRaw.serviceType,
              typeLabel: getServiceTypeLabel(pkgMetaRaw.serviceType),
              detail: pkgMetaRaw.serviceDetail,
              coachNote: pkgMetaRaw.coachNote,
            };
            const counts = sessionCounts[pkg.id] ?? {};
            const pkgRemaining = counts.remaining ?? 0;
            const pkgTotal = counts.total ?? 0;
            const pkgDone = counts.completed ?? 0;
            const pkgProgressPct = pkgTotal > 0 ? Math.round((pkgDone / pkgTotal) * 100) : 0;
            const pkgIsEndingSoon = pkgMeta.type === 'training' && pkgRemaining > 0 && pkgRemaining <= 5;
            const pkgPayments = packagePayments[pkg.id] ?? [];
            const pkgHasOpenMealPrepPayment = pkgPayments.some((payment) => ['pending', 'submitted', 'paid'].includes(payment.status));
            const mealPrepItemsCount = (pkgMetaRaw.mealPrepItems || []).filter((item) => item.foodGroup || item.productName || item.quantity || Number(item.amount || 0) > 0).length;
            const isMealPrep = pkgMeta.type === 'meal_prep';

            return (
              <div key={pkg.id} className="relative overflow-hidden rounded-[28px] border border-[var(--app-accent-soft)] bg-[linear-gradient(135deg,rgba(200,245,63,0.12),rgba(96,180,255,0.08))] p-5 lg:rounded-[30px] lg:p-5.5">
                <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/[0.04] rotate-12" />
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-black text-[var(--app-accent)] uppercase tracking-widest">
                      Service #{String(pkg.package_number).padStart(2, '0')}
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <h3 className="text-[1.45rem] font-medium text-white leading-none">
                        {pkgMeta.typeLabel}
                      </h3>
                    </div>
                    {pkgMeta.detail && !isMealPrep ? (
                      <p className="mt-1 text-[11px] text-neutral-400">{pkgMeta.detail}</p>
                    ) : null}
                    {pkgMeta.coachNote ? (
                      <p className="mt-1 text-[10px] text-neutral-500">{pkgMeta.coachNote}</p>
                    ) : null}
                    {pkgIsEndingSoon && (
                      <div className="mt-2 inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">
                          Training package ending soon · {pkgRemaining} left
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!readOnly && (
                      <button
                        onClick={() => setPackageToDelete(pkg)}
                        className="p-2.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 active:scale-90 transition-all"
                        aria-label="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase">Active</span>
                  </div>
                </div>

                <div className="mb-3.5 flex items-center justify-around">
                  {(isMealPrep
                    ? [
                        { val: formatCreatedDate(pkg.created_at).slice(0, 5), label: 'Created' },
                        { val: mealPrepItemsCount, label: 'Total Items' },
                        { val: pkg.price > 0 ? `${Math.round(Number(pkg.price) / 1000)}K` : '0', label: 'Total Price' },
                      ]
                    : [
                        { val: pkgRemaining, label: 'Remaining' },
                        { val: pkgDone, label: 'Used' },
                        { val: pkgTotal, label: 'Included' },
                      ]
                  ).map((item, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div className="w-px h-9 bg-white/10" />}
                      <div className="text-center">
                        <p className="text-[30px] font-light text-white leading-none">{item.val}</p>
                        <p className="text-[8px] font-black text-neutral-500 uppercase mt-0.5">{item.label}</p>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {!isMealPrep && (
                  <>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-[linear-gradient(90deg,var(--app-accent),var(--app-blue))] rounded-full transition-all duration-700" style={{ width: `${pkgProgressPct}%` }} />
                    </div>
                    <p className="text-[9px] text-neutral-600">{pkgProgressPct}% delivered</p>
                  </>
                )}

                {pkg.weekly_schedule?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    <p className="text-[11px] text-neutral-500">{formatScheduleLabel(pkg.weekly_schedule)}</p>
                  </div>
                )}
                {pkg.bonus_sessions > 0 && (
                  <p className="text-[10px] text-purple-400 mt-1.5">+ {pkg.bonus_sessions} bonus sessions</p>
                )}
                {!readOnly && isMealPrep && (
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      onClick={() => {
                        void handleCreateMealPrepPayment(pkg, pkgMetaRaw, pkgMeta);
                      }}
                      disabled={creatingPaymentFor === pkg.id || pkgHasOpenMealPrepPayment}
                      className="inline-flex items-center gap-2 rounded-[14px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-emerald-300 disabled:opacity-40"
                      >
                        <WalletCards className="h-3.5 w-3.5" />
                        {pkgHasOpenMealPrepPayment ? 'Payment created' : creatingPaymentFor === pkg.id ? 'Creating...' : 'Create payment'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPackage(pkg);
                        setShowModal(true);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300 active:scale-90 transition-all"
                      aria-label="Edit meal prep"
                      title="Edit meal prep"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {readOnly && isMealPrep && (
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      onClick={() => setMealPrepDetailPackage({ pkg, pkgMetaRaw, pkgMeta })}
                      className="inline-flex items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-white"
                    >
                      <Package className="h-3.5 w-3.5" />
                      View details
                    </button>
                  </div>
                )}
                {!readOnly && pkgMeta.type === 'stretching' && (
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>Book your next stretching session</span>
                    </div>
                    <button
                      onClick={() => openStretchingBooking(pkg)}
                      className="inline-flex items-center gap-2 rounded-[14px] border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-blue-300"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Schedule
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Service Button */}
      {!readOnly && (
        <button
          onClick={() => {
            setEditingPackage(null);
            setShowModal(true);
          }}
          className="app-ghost-button w-full flex items-center justify-center gap-2 border hover:bg-white/[0.08] text-white font-bold py-4 rounded-[24px] text-sm active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Another Service
        </button>
      )}

      {/* Service History */}
      {completedPackages.length > 0 && (
        <div className="space-y-3">
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3 ml-1">Service History</p>
          <div className="grid gap-3 lg:grid-cols-3">
            {completedPackages.map(pkg => {
              const cnt = sessionCounts[pkg.id] ?? {};
              const expanded = expandedPkg === pkg.id;
              const pkgMetaRaw = parseServiceMeta(pkg.note);
              const pkgMeta = {
                ...pkgMetaRaw,
                type: pkgMetaRaw.serviceType,
                typeLabel: getServiceTypeLabel(pkgMetaRaw.serviceType),
                detail: pkgMetaRaw.serviceDetail,
                coachNote: pkgMetaRaw.coachNote,
              };
              return (
                <div key={pkg.id} className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.02] lg:rounded-[22px]">
                  <button onClick={() => setExpandedPkg(expanded ? null : pkg.id)} className="w-full flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-neutral-600 uppercase">Service #{String(pkg.package_number).padStart(2, '0')}</span>
                      <span className="text-[10px] text-neutral-500 font-medium">{pkgMeta.typeLabel}</span>
                      <span className="text-xs text-neutral-500">{getServiceTotalLabel(pkgMeta.type, pkg.total_sessions)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-neutral-700 uppercase">Completed</span>
                      {!readOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPackageToDelete(pkg);
                          }}
                          className="p-2 rounded-full border border-red-500/15 bg-red-500/10 text-red-400 active:scale-90 transition-all"
                          aria-label={`Delete service ${pkg.package_number}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {expanded ? <ChevronUp className="w-3.5 h-3.5 text-neutral-600" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />}
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-5 pb-4 border-t border-white/[0.04] pt-3 space-y-1.5 text-xs text-neutral-500">
                      {pkgMeta.detail && <div className="flex justify-between gap-4"><span>Detail</span><span className="text-right text-white">{pkgMeta.detail}</span></div>}
                      {pkgMeta.coachNote && <div className="flex justify-between gap-4"><span>Coach Note</span><span className="text-right text-white">{pkgMeta.coachNote}</span></div>}
                      <div className="flex justify-between"><span>Included</span><span className="text-white">{pkg.total_sessions}</span></div>
                      <div className="flex justify-between"><span>Used</span><span className="text-emerald-400">{cnt.completed ?? 0}</span></div>
                      {pkg.price > 0 && <div className="flex justify-between"><span>Price</span><span className="text-white">{pkg.price.toLocaleString('vi-VN')} đ</span></div>}
                      {pkg.weekly_schedule?.length > 0 && <div className="flex justify-between"><span>Schedule</span><span className="text-white">{formatScheduleLabel(pkg.weekly_schedule)}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <CreatePackageModal
          clientId={clientId}
          packageNumber={editingPackage?.package_number ?? nextPackageNumber}
          existingPackage={editingPackage}
          onClose={() => {
            setShowModal(false);
            setEditingPackage(null);
          }}
          onCreated={fetchData}
        />
      )}

      {bookingPackage && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[240] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[560px] rounded-t-[28px] border border-white/10 bg-[#111113] p-5 pb-8 animate-modal-in lg:rounded-[28px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">
                  Service #{String(bookingPackage.package_number).padStart(2, '0')}
                </p>
                <h3 className="text-lg font-semibold text-white">Schedule Stretching Session</h3>
              </div>
              <button
                onClick={() => setBookingPackage(null)}
                className="rounded-full bg-white/5 p-2 text-neutral-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-neutral-600">Booking Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(event) => setBookingDate(event.target.value)}
                    className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-neutral-600">Location</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
                    <input
                      type="text"
                      value={bookingLocation}
                      onChange={(event) => setBookingLocation(event.target.value)}
                      placeholder="Studio, online, home..."
                      className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-neutral-600">From</label>
                  <input
                    type="time"
                    value={bookingStartTime}
                    onChange={(event) => setBookingStartTime(event.target.value)}
                    className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-neutral-600">To</label>
                  <input
                    type="time"
                    value={bookingEndTime}
                    onChange={(event) => setBookingEndTime(event.target.value)}
                    className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[9px] font-black uppercase tracking-widest text-neutral-600">Booking Note</label>
                <input
                  type="text"
                  value={bookingNote}
                  onChange={(event) => setBookingNote(event.target.value)}
                  placeholder="Optional detail for this booking"
                  className="w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setBookingPackage(null)}
                className="flex-1 rounded-[16px] border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-bold text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleCreateStretchingBooking();
                }}
                disabled={isCreatingBooking || !bookingDate || !bookingStartTime || !bookingEndTime}
                className="flex-1 rounded-[16px] bg-white py-3.5 text-sm font-bold text-black disabled:opacity-50"
              >
                {isCreatingBooking ? 'Scheduling...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {packageToDelete && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[360px] rounded-[28px] border border-red-500/20 bg-[#111113] p-6 shadow-2xl animate-modal-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-red-400/70">Delete Service</p>
                <h3 className="text-white font-semibold">Service #{String(packageToDelete.package_number).padStart(2, '0')}</h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-400">
              Deleting this service will also remove every linked session because the relationship uses `ON DELETE CASCADE`.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPackageToDelete(null)}
                className="flex-1 py-3.5 rounded-[16px] border border-white/[0.08] bg-white/[0.04] text-white font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePackage}
                disabled={deletingPackage}
                className="flex-1 py-3.5 rounded-[16px] bg-red-500 text-white font-bold text-sm disabled:opacity-50"
              >
                {deletingPackage ? 'Deleting...' : 'Delete Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mealPrepDetailPackage && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[240] flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[560px] rounded-t-[28px] border border-white/10 bg-[#111113] p-5 pb-8 animate-modal-in lg:rounded-[28px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">
                  Meal Prep Detail
                </p>
                <h3 className="text-lg font-semibold text-white">
                  Service #{String(mealPrepDetailPackage.pkg.package_number).padStart(2, '0')}
                </h3>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Created {formatCreatedDate(mealPrepDetailPackage.pkg.created_at)}
                </p>
              </div>
              <button
                onClick={() => setMealPrepDetailPackage(null)}
                className="rounded-full bg-white/5 p-2 text-neutral-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Total Items</p>
                <p className="mt-2 text-xl font-light text-white">
                  {(mealPrepDetailPackage.pkgMetaRaw.mealPrepItems || []).filter((item) => item.foodGroup || item.productName || item.quantity || Number(item.amount || 0) > 0).length}
                </p>
              </div>
              <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Total Price</p>
                <p className="mt-2 text-xl font-light text-white">
                  {Number(mealPrepDetailPackage.pkg.price || 0).toLocaleString('vi-VN')} đ
                </p>
              </div>
            </div>

            <div className="hide-scrollbar max-h-[44vh] space-y-2 overflow-y-auto pr-1">
              {(mealPrepDetailPackage.pkgMetaRaw.mealPrepItems || [])
                .filter((item) => item.foodGroup || item.productName || item.quantity || Number(item.amount || 0) > 0)
                .map((item, index) => (
                  <div key={`${item.productName || 'item'}-${index}`} className="rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-white">{item.productName || 'Unnamed item'}</p>
                        <p className="mt-1 text-[10px] font-semibold text-white/35">{item.foodGroup || 'Other'}</p>
                      </div>
                      <p className="text-[11px] font-bold text-white/70">
                        {Number(item.amount || 0).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-white/45">
                      <span>Qty: {item.quantity || '--'} {item.unit || ''}</span>
                    </div>
                  </div>
                ))}
            </div>

            {mealPrepDetailPackage.pkgMeta.coachNote ? (
              <div className="mt-4 rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Coach Note</p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/72">{mealPrepDetailPackage.pkgMeta.coachNote}</p>
              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PackageTab;
