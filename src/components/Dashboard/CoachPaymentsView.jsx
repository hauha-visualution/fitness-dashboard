import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Library,
  RefreshCw,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import CreatePaymentModal from '../Payments/CreatePaymentModal';
import {
  fmtDate,
  fmtVNDAbridged,
  fmtVND,
  getPaymentStatusMeta,
  getPaymentTitle,
  getPaymentTypeMeta,
  getToneClasses,
  isOutstandingPayment,
} from '../../utils/paymentUtils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'paid', label: 'Paid' },
];

const CoachPaymentsView = ({ clients = [] }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
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
      alert(`Không tải được thanh toán: ${error.message}`);
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
      alert(`${errorPrefix}: ${error.message}`);
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
      'Không thể cập nhật payment'
    );
  };

  const handleVoid = async (payment) => {
    await runUpdate(
      payment.id,
      {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      },
      'Không thể hủy payment'
    );
  };

  const visiblePayments = payments.filter((payment) => {
    if (activeFilter === 'open') return isOutstandingPayment(payment.status);
    if (activeFilter === 'submitted') return payment.status === 'submitted';
    if (activeFilter === 'paid') return payment.status === 'paid';
    return true;
  });

  const totalOutstanding = payments
    .filter((payment) => isOutstandingPayment(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalPaid = payments
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalCancelled = payments.filter((payment) => payment.status === 'cancelled').length;

  const summaryCards = [
    {
      label: 'Open',
      value: showExactTotals ? fmtVND(totalOutstanding) : fmtVNDAbridged(totalOutstanding),
      caption: `${payments.filter((payment) => isOutstandingPayment(payment.status)).length} open`,
      classes: 'border-red-500/20 bg-red-500/[0.06]',
      textClass: 'text-red-300/80',
      icon: Clock3,
      isCurrency: true,
    },
    {
      label: 'Submitted',
      value: `${payments.filter((payment) => payment.status === 'submitted').length}`,
      caption: 'Awaiting confirmation',
      classes: 'border-amber-500/20 bg-amber-500/[0.06]',
      textClass: 'text-amber-300/80',
      icon: RefreshCw,
      isCurrency: false,
    },
    {
      label: 'Paid',
      value: showExactTotals ? fmtVND(totalPaid) : fmtVNDAbridged(totalPaid),
      caption: `${payments.filter((payment) => payment.status === 'paid').length} Paid`,
      classes: 'border-emerald-500/20 bg-emerald-500/[0.06]',
      textClass: 'text-emerald-300/80',
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

  return (
    <>
      <div className="flex-1 overflow-y-auto hide-scrollbar px-5 pt-6 pb-28 animate-slide-up">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-neutral-600 mb-2">
              Payments
            </p>
            <h1 className="text-white text-[28px] leading-none font-semibold">
              Thu tiền dịch vụ
            </h1>
            <p className="text-neutral-500 text-sm mt-2">
              Coach tạo khoản thu, khách báo đã chuyển, rồi coach xác nhận hoàn tất.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void fetchPayments();
              }}
              className="w-11 h-11 rounded-full border border-white/10 bg-white/[0.04] text-neutral-300 flex items-center justify-center active:scale-95 transition-all"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-3 rounded-[16px] border border-blue-400/20 bg-blue-500/[0.12] text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
            >
              New
            </button>
          </div>
        </div>

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
                title={card.isCurrency ? 'Tap để đổi giữa số rút gọn và số đầy đủ' : undefined}
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

        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 mb-4">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all ${
                activeFilter === filter.id
                  ? 'border-white/10 bg-white/[0.08] text-white'
                  : 'border-white/10 bg-white/[0.03] text-neutral-500'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-neutral-600 mb-1">
                Payment Feed
              </p>
              <p className="text-white text-sm font-medium">Tất cả khoản thanh toán</p>
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
                Không có payment phù hợp
              </p>
              <p className="text-neutral-500 text-sm">
                Thử đổi bộ lọc hoặc tạo khoản thu mới cho một dịch vụ phát sinh.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {visiblePayments.map((payment) => {
                const client = clientMap[payment.client_id];
                const statusMeta = getPaymentStatusMeta(payment.status);
                const typeMeta = getPaymentTypeMeta(payment.payment_type);
                const tone = getToneClasses(statusMeta.tone);
                const title = getPaymentTitle(payment);
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

                      <div className="flex items-center gap-2 text-neutral-500 text-[12px] mt-1">
                        <UserRound className="w-3.5 h-3.5" />
                        <span className="truncate">{statusMeta.description}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
                        <span className="text-white font-semibold">{fmtVND(payment.amount)}</span>
                        {payment.package_number && (
                          <span className="text-neutral-500">
                            Package #{String(payment.package_number).padStart(2, '0')}
                          </span>
                        )}
                        <span className="text-neutral-600">Tạo {fmtDate(payment.created_at)}</span>
                        {payment.customer_marked_at && (
                          <span className="text-amber-300/80">Khách báo {fmtDate(payment.customer_marked_at)}</span>
                        )}
                        {payment.paid_at && (
                          <span className="text-emerald-300/80">Paid {fmtDate(payment.paid_at)}</span>
                        )}
                      </div>

                      {payment.detail_note && (
                        <p className="text-neutral-300 text-[12px] mt-2 leading-relaxed">
                          {payment.detail_note}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {payment.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              void handleMarkPaid(payment);
                            }}
                            disabled={isBusy}
                            className="min-w-[88px] px-4 py-2 rounded-[12px] border border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                          >
                            {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleVoid(payment);
                            }}
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
                            onClick={() => {
                              void handleMarkPaid(payment);
                            }}
                            disabled={isBusy}
                            className="min-w-[88px] px-4 py-2 rounded-[12px] border border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                          >
                            {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleVoid(payment);
                            }}
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
          )}
        </div>
      </div>

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
