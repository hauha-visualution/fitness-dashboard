import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Library,
  RefreshCw,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import CreatePaymentModal from '../../Payments/CreatePaymentModal';
import {
  fmtDate,
  fmtVNDAbridged,
  fmtVND,
  getPaymentStatusMeta,
  getPaymentTitle,
  getPaymentTypeMeta,
  getToneClasses,
  isOutstandingPayment,
} from '../../../utils/paymentUtils';

const PaymentTab = ({ client, readOnly = false }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExactTotals, setShowExactTotals] = useState(false);

  const isCoachView = !readOnly;

  const fetchPayments = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert(`Không tải được payment: ${error.message}`);
      setLoading(false);
      return;
    }

    setPayments(data || []);
    setLoading(false);
  }, [client.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPayments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchPayments]);

  const runCoachUpdate = async (paymentId, payload, errorPrefix) => {
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
    await runCoachUpdate(
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
    await runCoachUpdate(
      payment.id,
      {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      },
      'Không thể hủy payment'
    );
  };

  const handleClientSubmit = async (paymentId) => {
    setActioningId(paymentId);

    const { error } = await supabase.rpc('client_submit_payment', {
      p_payment_id: paymentId,
    });

    if (error) {
      alert(`Không thể báo đã chuyển: ${error.message}`);
      setActioningId(null);
      return;
    }

    await fetchPayments();
    setActioningId(null);
  };

  const outstandingPayments = payments.filter((payment) => isOutstandingPayment(payment.status));
  const submittedPayments = payments.filter((payment) => payment.status === 'submitted');
  const totalOutstanding = outstandingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalPaid = payments
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalCancelled = payments.filter((payment) => payment.status === 'cancelled').length;

  const buildTimeline = (payment) => {
    const entries = [`Tạo ${fmtDate(payment.created_at)}`];
    if (payment.customer_marked_at) entries.push(`Khách báo ${fmtDate(payment.customer_marked_at)}`);
    if (payment.coach_confirmed_at) entries.push(`Coach xác nhận ${fmtDate(payment.coach_confirmed_at)}`);
    if (payment.paid_at) entries.push(`Hoàn tất ${fmtDate(payment.paid_at)}`);
    if (payment.cancelled_at) entries.push(`Hủy ${fmtDate(payment.cancelled_at)}`);
    return entries.join(' · ');
  };

  const summaryCards = [
    {
      label: 'Chờ xử lý',
      value: showExactTotals ? fmtVND(totalOutstanding) : fmtVNDAbridged(totalOutstanding),
      caption: `${outstandingPayments.length} open`,
      classes: 'border-red-500/20 bg-red-500/[0.06]',
      textClass: 'text-red-300/80',
      icon: Clock3,
      isCurrency: true,
    },
    {
      label: 'Khách báo chuyển',
      value: `${submittedPayments.length}`,
      caption: 'Awaiting confirmation',
      classes: 'border-amber-500/20 bg-amber-500/[0.06]',
      textClass: 'text-amber-300/80',
      icon: RefreshCw,
      isCurrency: false,
    },
    {
      label: 'Đã thanh toán',
      value: showExactTotals ? fmtVND(totalPaid) : fmtVNDAbridged(totalPaid),
      caption: `${payments.filter((payment) => payment.status === 'paid').length} Paid`,
      classes: 'border-emerald-500/20 bg-emerald-500/[0.06]',
      textClass: 'text-emerald-300/80',
      icon: CheckCircle2,
      isCurrency: true,
    },
    {
      label: 'Đã hủy',
      value: `${totalCancelled}`,
      caption: 'Voided',
      classes: 'border-white/[0.08] bg-white/[0.03]',
      textClass: 'text-neutral-400',
      icon: X,
      isCurrency: false,
    },
  ];

  const paymentGroups = [
    {
      id: 'open',
      label: 'Open',
      description: 'Đang chờ xử lý hoặc chờ coach xác nhận',
      items: payments.filter((payment) => isOutstandingPayment(payment.status)),
    },
    {
      id: 'paid',
      label: 'Paid',
      description: 'Các khoản đã hoàn tất',
      items: payments.filter((payment) => payment.status === 'paid'),
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      description: 'Các khoản đã hủy',
      items: payments.filter((payment) => payment.status === 'cancelled'),
    },
  ].filter((group) => group.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-700">
        <RefreshCw className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 animate-slide-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-neutral-600 mb-1">
              Payments
            </p>
            <p className="text-neutral-500 text-sm">
              {isCoachView
                ? 'Quản lý yêu cầu thanh toán, xác nhận chuyển khoản và chốt công nợ.'
                : 'Theo dõi khoản cần thanh toán và báo cho coach khi bạn đã chuyển khoản.'}
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
              <RefreshCw className="w-4 h-4" />
            </button>

            {isCoachView && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-3 rounded-[16px] border border-blue-400/20 bg-blue-500/[0.12] text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
              >
                New
              </button>
            )}
          </div>
        </div>

        {payments.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => {
                    if (card.isCurrency) setShowExactTotals((current) => !current);
                  }}
                  className={`rounded-[16px] border px-3 py-2.5 text-left ${card.classes} ${card.isCurrency ? 'cursor-pointer active:scale-[0.98] transition-transform' : 'cursor-default'}`}
                  title={card.isCurrency ? 'Tap để đổi giữa số rút gọn và số đầy đủ' : undefined}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${card.textClass}`} />
                    <p className={`text-[6px] font-black uppercase tracking-[0.2em] ${card.textClass}`}>
                      {card.label}
                    </p>
                  </div>
                  <p className="text-white text-[13px] font-semibold leading-none">{card.value}</p>
                  <p className="text-neutral-500 text-[9px] mt-1 leading-none">{card.caption}</p>
                </button>
              );
            })}
          </div>
        )}

        {payments.length === 0 ? (
          <div className="text-center py-12 text-neutral-700 rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
            <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-[10px] font-black uppercase tracking-[0.28em]">Chưa có payment nào</p>
            <p className="text-neutral-500 text-sm mt-2 px-6">
              {isCoachView
                ? 'Bạn có thể tạo payment thủ công cho dịch vụ mới hoặc tạo package để hệ thống sinh công nợ tự động.'
                : 'Coach chưa tạo yêu cầu thanh toán nào cho bạn.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentGroups.map((group) => (
              <div key={group.id} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/85">
                      {group.label}
                    </p>
                    <p className="text-neutral-500 text-[11px]">{group.description}</p>
                  </div>
                  <span className="text-neutral-500 text-[11px] font-semibold">
                    {group.items.length}
                  </span>
                </div>

                {group.items.map((payment) => {
                  const statusMeta = getPaymentStatusMeta(payment.status);
                  const tone = getToneClasses(statusMeta.tone);
                  const typeMeta = getPaymentTypeMeta(payment.payment_type);
                  const title = getPaymentTitle(payment);
                  const isBusy = actioningId === payment.id;
                  const packageLabel = payment.package_number
                    ? `Package #${String(payment.package_number).padStart(2, '0')}`
                    : null;
                  const shouldShowPackageMeta =
                    packageLabel && title.trim().toLowerCase() !== packageLabel.toLowerCase();
                  const timeline = buildTimeline(payment);
                  const supportingCopy = payment.detail_note?.trim() || (payment.status === 'pending' || payment.status === 'submitted'
                    ? statusMeta.description
                    : '');

                  return (
                    <div
                      key={payment.id}
                      className={`rounded-[22px] border px-4 py-3.5 transition-all ${tone.panel}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${tone.badge}`}>
                              {payment.payment_type === 'package' ? (
                                <Library className="w-3 h-3" />
                              ) : (
                                <Wallet className="w-3 h-3" />
                              )}
                              {typeMeta.label}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${tone.badge}`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {statusMeta.label}
                            </span>
                            {shouldShowPackageMeta && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400">
                                <Tag className="w-3 h-3" />
                                {packageLabel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-[15px] text-white leading-tight">{title}</p>
                              {payment.payment_method && (
                                <p className="text-neutral-500 text-[11px] mt-1 uppercase tracking-[0.18em]">
                                  {payment.payment_method.replace('_', ' ')}
                                </p>
                              )}
                            </div>
                            <p className="shrink-0 text-white font-bold text-[18px] leading-none mt-0.5">
                              {fmtVND(payment.amount)}
                            </p>
                          </div>

                          {supportingCopy && (
                            <p className="text-neutral-400 text-[12px] mt-2 leading-relaxed">
                              {supportingCopy}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-neutral-600 mt-3 min-w-0">
                            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                            <p className="truncate">{timeline}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {isCoachView && payment.status === 'pending' && (
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

                          {isCoachView && payment.status === 'submitted' && (
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

                          {!isCoachView && payment.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                void handleClientSubmit(payment.id);
                              }}
                              disabled={isBusy}
                              className="min-w-[108px] px-4 py-2 rounded-[12px] border border-blue-400/20 bg-blue-500/[0.12] text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                              {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              I've Paid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && isCoachView && (
        <CreatePaymentModal
          clients={[client]}
          defaultClientId={client.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            void fetchPayments();
          }}
        />
      )}
    </>
  );
};

export default PaymentTab;
