import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Library,
  Plus,
  RefreshCw,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { notifyPaymentConfirmed, fetchClientNotifInfo } from '../../utils/notificationUtils';
import CreatePaymentModal from '../Payments/CreatePaymentModal';
import { toast } from '../../utils/toast';
import {
  fmtDate,
  fmtVNDAbridged,
  fmtVND,
  getPaymentDisplayTitle,
  getPaymentStatusMeta,
  getPaymentTypeMeta,
  getToneClasses,
  isOutstandingPayment,
} from '../../utils/paymentUtils';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'paid', label: 'Paid' },
];

const buildCompactTimeline = (payment) => {
  const created = fmtDate(payment.created_at);

  if (payment.status === 'paid') {
    const finalDate = fmtDate(payment.paid_at || payment.coach_confirmed_at || payment.customer_marked_at || payment.created_at);
    return `Created ${created} · Paid ${finalDate}`;
  }

  if (payment.status === 'submitted') {
    const submittedDate = fmtDate(payment.customer_marked_at || payment.created_at);
    return `Created ${created} · Submitted ${submittedDate}`;
  }

  if (payment.status === 'cancelled') {
    const cancelledDate = fmtDate(payment.cancelled_at || payment.created_at);
    return `Created ${created} · Voided ${cancelledDate}`;
  }

  return `Created ${created}`;
};

const CoachPaymentsView = ({ clients = [] }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [activeClientId, setActiveClientId] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExactTotals, setShowExactTotals] = useState(false);

  const clientIds = useMemo(
    () => clients.map((client) => client.id).filter(Boolean),
    [clients]
  );

  const clientMap = useMemo(
    () =>
      clients.reduce((acc, client) => {
        acc[client.id] = client;
        return acc;
      }, {}),
    [clients]
  );

  const fetchPayments = useCallback(async () => {
    if (clientIds.length === 0) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(`Unable to load payments: ${error.message}`);
      setLoading(false);
      return;
    }

    setPayments(data || []);
    setLoading(false);
  }, [clientIds]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPayments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchPayments]);

  const runUpdate = async (paymentId, payload, errorPrefix) => {
    setActioningId(paymentId);

    const { error } = await supabase
      .from('payments')
      .update(payload)
      .eq('id', paymentId);

    if (error) {
      toast.error(`${errorPrefix}: ${error.message}`);
      setActioningId(null);
      return;
    }

    await fetchPayments();
    setActioningId(null);
  };

  const handleMarkPaid = async (payment) => {
    await runUpdate(
      payment.id,
      {
        status: 'paid',
        coach_confirmed_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      },
      'Unable to update payment'
    );

    // ─── Notify trainee: payment confirmed (fire-and-forget) ─────────────
    void (async () => {
      const clientInfo = await fetchClientNotifInfo(payment.client_id);
      if (clientInfo?.auth_user_id) {
        await notifyPaymentConfirmed({
          clientAuthUserId: clientInfo.auth_user_id,
          amount: payment.amount,
          paymentTitle: payment.title,
        });
      }
    })();
    // ───────────────────────────────────────────────────────
  };

  const handleVoid = async (payment) => {
    await runUpdate(
      payment.id,
      {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      },
      'Unable to void payment'
    );
  };

  // Payments scoped to selected client (for summary + feed)
  const clientScopedPayments = useMemo(
    () =>
      activeClientId === 'all'
        ? payments
        : payments.filter((p) => p.client_id === activeClientId),
    [payments, activeClientId]
  );

  // Payments further filtered by status
  const visiblePayments = useMemo(
    () =>
      clientScopedPayments.filter((payment) => {
        if (activeStatusFilter === 'open') return isOutstandingPayment(payment.status);
        if (activeStatusFilter === 'submitted') return payment.status === 'submitted';
        if (activeStatusFilter === 'paid') return payment.status === 'paid';
        return true;
      }),
    [clientScopedPayments, activeStatusFilter]
  );

  // Summary numbers follow the client scope
  const totalOutstanding = clientScopedPayments
    .filter((p) => isOutstandingPayment(p.status))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalPaid = clientScopedPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalCancelled = clientScopedPayments.filter((p) => p.status === 'cancelled').length;

  const summaryCards = [
    {
      label: 'Open',
      value: showExactTotals ? fmtVND(totalOutstanding) : fmtVNDAbridged(totalOutstanding),
      caption: `${clientScopedPayments.filter((p) => isOutstandingPayment(p.status)).length} open`,
      classes: 'border-red-500/20 bg-red-500/[0.06]',
      textClass: 'text-red-300/80',
      icon: Clock3,
      isCurrency: true,
    },
    {
      label: 'Submitted',
      value: `${clientScopedPayments.filter((p) => p.status === 'submitted').length}`,
      caption: 'Awaiting confirmation',
      classes: 'border-amber-500/20 bg-amber-500/[0.06]',
      textClass: 'text-amber-300/80',
      icon: RefreshCw,
      isCurrency: false,
    },
    {
      label: 'Paid',
      value: showExactTotals ? fmtVND(totalPaid) : fmtVNDAbridged(totalPaid),
      caption: `${clientScopedPayments.filter((p) => p.status === 'paid').length} Paid`,
      classes: 'border-[rgba(200,245,63,0.2)] bg-[rgba(200,245,63,0.06)]',
      textClass: 'text-[rgba(200,245,63,0.85)]',
      icon: CheckCircle2,
      isCurrency: true,
    },
    {
      label: 'Voided',
      value: `${totalCancelled}`,
      caption: 'Cancelled',
      classes: 'border-white/[0.08] bg-white/[0.03]',
      textClass: 'text-neutral-400',
      icon: X,
      isCurrency: false,
    },
  ];

  // Only show clients that have at least one payment
  const clientsWithPayments = useMemo(() => {
    const ids = new Set(payments.map((p) => p.client_id));
    return clients.filter((c) => ids.has(c.id));
  }, [clients, payments]);

  return (
    <>
      <div className="app-screen-shell flex flex-col flex-1 overflow-hidden animate-slide-up">

      {/* PAGE TITLE */}
      <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-white">Service Payments</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => { void fetchPayments(); }}
            className="app-ghost-button w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-all"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="app-cta-button w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-all"
            aria-label="Create payment"
            title="Create payment"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pt-6 app-mobile-nav-spacing lg:pb-8">

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-5">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => {
                  if (card.isCurrency) setShowExactTotals((current) => !current);
                }}
                className={`rounded-[18px] border px-3 py-2.5 text-left ${card.classes} ${card.isCurrency ? 'cursor-pointer active:scale-[0.98] transition-transform' : 'cursor-default'}`}
                title={card.isCurrency ? 'Toggle between compact and exact totals' : undefined}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${card.textClass}`} />
                  <span className={`text-[6px] font-black uppercase tracking-[0.2em] ${card.textClass}`}>
                    {card.label}
                  </span>
                </div>
                <p className="text-white text-[13px] font-semibold leading-none">{card.value}</p>
                <p className="text-neutral-500 text-[9px] mt-1 leading-none">{card.caption}</p>
              </button>
            );
          })}
        </div>

        {/* CLIENT FILTER */}
        {clientsWithPayments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 mb-3">
            <button
              type="button"
              onClick={() => setActiveClientId('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
                activeClientId === 'all'
                  ? 'border-white/20 bg-white/[0.1] text-white'
                  : 'border-white/10 bg-white/[0.03] text-neutral-500'
              }`}
            >
              <User className="w-3 h-3" />
              All clients
            </button>
            {clientsWithPayments.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveClientId(c.id)}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap transition-all ${
                  activeClientId === c.id
                    ? 'border-[var(--app-accent)]/40 bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                    : 'border-white/10 bg-white/[0.03] text-neutral-500'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* STATUS FILTER */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 mb-4">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveStatusFilter(filter.id)}
              className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all ${
                activeStatusFilter === filter.id
                  ? 'border-white/10 bg-white/[0.08] text-white'
                  : 'border-white/10 bg-white/[0.03] text-neutral-500'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* PAYMENT FEED */}
        <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-neutral-600 mb-1">
                Payment Feed
              </p>
              <p className="text-white text-sm font-medium">
                {activeClientId === 'all'
                  ? 'All Payment Requests'
                  : `${clientMap[activeClientId]?.name || ''} · Payments`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-neutral-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-neutral-600 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : visiblePayments.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <CreditCard className="w-10 h-10 mx-auto mb-3 text-neutral-800" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-neutral-600 mb-2">
                No Matching Payments
              </p>
              <p className="text-neutral-500 text-sm">
                Try another filter or create a new payment request for an extra service.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE: flat row list */}
              <div className="divide-y divide-white/[0.06] lg:hidden">
                {visiblePayments.map((payment) => {
                  const client = clientMap[payment.client_id];
                  const statusMeta = getPaymentStatusMeta(payment.status);
                  const typeMeta = getPaymentTypeMeta(payment.payment_type);
                  const tone = getToneClasses(statusMeta.tone);
                  const title = getPaymentDisplayTitle(payment);
                  const detailNote = payment.detail_note?.trim() || '';
                  const timeline = buildCompactTimeline(payment);
                  const isBusy = actioningId === payment.id;

                  return (
                    <div
                      key={payment.id}
                      className="px-5 py-4 flex items-start gap-4 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${tone.icon}`}>
                        {payment.payment_type === 'package' ? (
                          <Library className="w-4 h-4" />
                        ) : (
                          <Wallet className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${tone.badge}`}>
                            {typeMeta.label}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${tone.badge}`}>
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white">
                          <p className="font-semibold truncate">{client?.name || 'Trainee'}</p>
                          <span className="text-neutral-600">·</span>
                          <span className="truncate">{title}</span>
                        </div>

                        {payment.payment_method && (
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                            {payment.payment_method.replace('_', ' ')}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
                          <span className="font-semibold text-white tabular-nums">{fmtVND(payment.amount)}</span>
                          {payment.package_number && (
                            <span className="text-neutral-500">
                              Package #{String(payment.package_number).padStart(2, '0')}
                            </span>
                          )}
                          <span className="text-neutral-600">{timeline}</span>
                        </div>

                        {detailNote && (
                          <p className="text-neutral-300 text-[12px] mt-2 leading-relaxed">
                            {detailNote}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {payment.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => { void handleMarkPaid(payment); }}
                              disabled={isBusy}
                              className="min-w-[88px] px-4 py-2 rounded-[12px] border border-[rgba(200,245,63,0.3)] bg-[rgba(200,245,63,0.14)] text-[var(--app-accent)] text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                              {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => { void handleVoid(payment); }}
                              disabled={isBusy}
                              className="min-w-[88px] px-4 py-2 rounded-[12px] border border-white/10 bg-white/[0.04] text-neutral-300 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                              <X className="w-3 h-3" />
                              Void
                            </button>
                          </>
                        )}

                        {payment.status === 'submitted' && (
                          <>
                            <button
                              type="button"
                              onClick={() => { void handleMarkPaid(payment); }}
                              disabled={isBusy}
                              className="min-w-[88px] px-4 py-2 rounded-[12px] border border-[rgba(200,245,63,0.3)] bg-[rgba(200,245,63,0.14)] text-[var(--app-accent)] text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                              {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => { void handleVoid(payment); }}
                              disabled={isBusy}
                              className="min-w-[88px] px-4 py-2 rounded-[12px] border border-white/10 bg-white/[0.04] text-neutral-300 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                              <X className="w-3 h-3" />
                              Void
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP: 4-column grouped layout (same as client PaymentTab) */}
              <div className="hidden lg:block lg:p-4">
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    { id: 'pending',   label: 'Open',      description: 'Waiting for payment',          items: visiblePayments.filter((p) => p.status === 'pending') },
                    { id: 'submitted', label: 'Submitted',  description: 'Awaiting coach confirmation',   items: visiblePayments.filter((p) => p.status === 'submitted') },
                    { id: 'paid',      label: 'Paid',       description: 'Completed payments',            items: visiblePayments.filter((p) => p.status === 'paid') },
                    { id: 'cancelled', label: 'Cancelled',  description: 'Voided requests',               items: visiblePayments.filter((p) => p.status === 'cancelled') },
                  ].map((group) => (
                    <div key={group.id} className="space-y-2.5">
                      {/* Column header */}
                      <div className="flex items-center justify-between gap-3 px-1">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/85">{group.label}</p>
                          <p className="text-neutral-500 text-[11px]">{group.description}</p>
                        </div>
                        <span className="text-neutral-500 text-[11px] font-semibold">{group.items.length}</span>
                      </div>

                      {/* Empty state */}
                      {group.items.length === 0 ? (
                        <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-[11px] text-neutral-600">
                          No payments
                        </div>
                      ) : (
                        <div className="grid gap-2.5">
                          {group.items.map((payment) => {
                            const client = clientMap[payment.client_id];
                            const statusMeta = getPaymentStatusMeta(payment.status);
                            const typeMeta = getPaymentTypeMeta(payment.payment_type);
                            const tone = getToneClasses(statusMeta.tone);
                            const title = getPaymentDisplayTitle(payment);
                            const detailNote = payment.detail_note?.trim() || '';
                            const timeline = buildCompactTimeline(payment);
                            const isBusy = actioningId === payment.id;
                            const packageLabel = payment.package_number
                              ? `Package #${String(payment.package_number).padStart(2, '0')}`
                              : null;
                            const shouldShowPackageMeta =
                              packageLabel && title.trim().toLowerCase() !== packageLabel.toLowerCase();

                            return (
                              <div
                                key={payment.id}
                                className={`rounded-[22px] border px-4 py-3.5 transition-all min-h-[132px] ${tone.panel}`}
                              >
                                <div className="flex items-start justify-between gap-2.5 h-full">
                                  <div className="flex-1 min-w-0 flex h-full flex-col">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] ${tone.badge}`}>
                                        {payment.payment_type === 'package' ? (
                                          <Library className="h-2.5 w-2.5" />
                                        ) : (
                                          <Wallet className="h-2.5 w-2.5" />
                                        )}
                                        {typeMeta.label}
                                      </span>
                                      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] ${tone.badge}`}>
                                        <CheckCircle2 className="h-2.5 w-2.5" />
                                        {statusMeta.label}
                                      </span>
                                      {shouldShowPackageMeta && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-neutral-400">
                                          {packageLabel}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-semibold text-neutral-400 leading-tight truncate">
                                          {client?.name || 'Trainee'}
                                        </p>
                                        <p className="text-[14px] font-semibold leading-tight text-white">{title}</p>
                                      </div>
                                      <div className="mt-0.5 shrink-0 text-right text-white">
                                        <p className="text-[16px] font-bold leading-none tabular-nums">
                                          {fmtVND(payment.amount)}
                                        </p>
                                      </div>
                                    </div>

                                    {payment.payment_method && (
                                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                                        {payment.payment_method.replace('_', ' ')}
                                      </p>
                                    )}

                                    {detailNote && (
                                      <p className="mt-auto pt-1.5 line-clamp-1 text-[11px] leading-snug text-neutral-400">
                                        {detailNote}
                                      </p>
                                    )}

                                    <div className={`${detailNote ? 'mt-1.5' : 'mt-auto pt-2'} flex min-w-0 items-center gap-1.5 text-[9.5px] text-neutral-600`}>
                                      <CalendarClock className="h-3 w-3 shrink-0" />
                                      <p className="truncate">{timeline}</p>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    {payment.status === 'pending' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => { void handleMarkPaid(payment); }}
                                          disabled={isBusy}
                                          className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-[rgba(200,245,63,0.3)] bg-[rgba(200,245,63,0.14)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--app-accent)] transition-all active:scale-95 disabled:opacity-50"
                                        >
                                          {isBusy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                          Paid
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { void handleVoid(payment); }}
                                          disabled={isBusy}
                                          className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-neutral-300 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                          <X className="h-3 w-3" />
                                          Void
                                        </button>
                                      </>
                                    )}
                                    {payment.status === 'submitted' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => { void handleMarkPaid(payment); }}
                                          disabled={isBusy}
                                          className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-[rgba(200,245,63,0.3)] bg-[rgba(200,245,63,0.14)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--app-accent)] transition-all active:scale-95 disabled:opacity-50"
                                        >
                                          {isBusy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                          Confirm
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { void handleVoid(payment); }}
                                          disabled={isBusy}
                                          className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-neutral-300 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                          <X className="h-3 w-3" />
                                          Void
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      </div>{/* end app-screen-shell wrapper */}

      {showCreateModal && (
        <CreatePaymentModal
          clients={clients}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            void fetchPayments();
          }}
        />
      )}
    </>
  );
};

export default CoachPaymentsView;
