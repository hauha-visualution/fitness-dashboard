import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Library,
  Plus,
  QrCode,
  RefreshCw,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { notifyPaymentSubmitted, notifyPaymentConfirmed, fetchCoachAuthUserId } from '../../../utils/notificationUtils';
import CreatePaymentModal from '../../Payments/CreatePaymentModal';
import { toast } from '../../../utils/toast';
import {
  fmtDate,
  fmtVNDAbridged,
  fmtVND,
  getPaymentDisplayTitle,
  getPaymentStatusMeta,
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
  const [coachBankInfo, setCoachBankInfo] = useState(null);
  const [showBankInfo, setShowBankInfo] = useState(false);

  const isCoachView = !readOnly;

  const fetchPayments = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(`Unable to load payments: ${error.message}`);
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

  useEffect(() => {
    const coachEmail = client?.coach_email;
    if (!coachEmail) {
      setCoachBankInfo(null);
      return;
    }

    const loadCoachBankInfo = async () => {
      const { data } = await supabase
        .from('coaches')
        .select('full_name, bank_qr_url, bank_name, bank_branch, bank_account_name, bank_account_number')
        .eq('email', coachEmail)
        .maybeSingle();

      setCoachBankInfo(data || null);
    };

    void loadCoachBankInfo();
  }, [client?.coach_email]);

  const runCoachUpdate = async (paymentId, payload, errorPrefix) => {
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
    await runCoachUpdate(
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
      if (client?.auth_user_id) {
        await notifyPaymentConfirmed({
          clientAuthUserId: client.auth_user_id,
          amount: payment.amount,
          paymentTitle: payment.title,
        });
      }
    })();
    // ───────────────────────────────────────────────────────
  };

  const handleVoid = async (payment) => {
    await runCoachUpdate(
      payment.id,
      {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      },
      'Unable to void payment'
    );
  };

  const handleClientSubmit = async (paymentId) => {
    setActioningId(paymentId);

    const { error } = await supabase.rpc('client_submit_payment', {
      p_payment_id: paymentId,
    });

    if (error) {
      toast.error(`Unable to submit transfer: ${error.message}`);
      setActioningId(null);
      return;
    }

    await fetchPayments();
    setActioningId(null);

    // ─── Notify coach: trainee submitted payment (fire-and-forget) ───
    void (async () => {
      const coachAuthUserId = await fetchCoachAuthUserId(client?.coach_email);
      if (coachAuthUserId) {
        const payment = payments.find((p) => p.id === paymentId);
        await notifyPaymentSubmitted({
          coachAuthUserId,
          clientName: client?.name,
          amount: payment?.amount,
          paymentTitle: payment?.title,
        });
      }
    })();
    // ─────────────────────────────────────────────────────────────────
  };

  const copyAccountNumber = async () => {
    if (!coachBankInfo?.bank_account_number?.trim()) return;
    try {
      await navigator.clipboard.writeText(coachBankInfo.bank_account_number.trim());
      toast.success('Copied account number');
    } catch {
      toast.error('Unable to copy account number');
    }
  };

  const pendingPayments = payments.filter((payment) => payment.status === 'pending');
  const outstandingPayments = payments.filter((payment) => isOutstandingPayment(payment.status));
  const submittedPayments = payments.filter((payment) => payment.status === 'submitted');
  const totalOutstanding = outstandingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalPaid = payments
    .filter((payment) => payment.status === 'paid')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalCancelled = payments.filter((payment) => payment.status === 'cancelled').length;

  const buildTimeline = (payment) => {
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

  const summaryCards = [
    {
      label: 'Open',
      value: showExactTotals ? fmtVND(totalOutstanding) : fmtVNDAbridged(totalOutstanding),
      caption: `${outstandingPayments.length} open`,
      classes: 'border-red-500/20 bg-red-500/[0.06]',
      textClass: 'text-red-300/80',
      icon: Clock3,
      isCurrency: true,
    },
    {
      label: 'Submitted',
      value: `${submittedPayments.length}`,
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
      classes: 'border-[rgba(200,245,63,0.2)] bg-[rgba(200,245,63,0.06)]',
      textClass: 'text-[rgba(200,245,63,0.85)]',
      icon: CheckCircle2,
      isCurrency: true,
    },
    {
      label: 'Voided',
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
      id: 'pending',
      label: 'Open',
      description: 'Waiting for payment',
      items: pendingPayments,
    },
    {
      id: 'submitted',
      label: 'Submitted',
      description: 'Awaiting coach confirmation',
      items: submittedPayments,
    },
    {
      id: 'paid',
      label: 'Paid',
      description: 'Completed payments',
      items: payments.filter((payment) => payment.status === 'paid'),
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      description: 'Voided requests',
      items: payments.filter((payment) => payment.status === 'cancelled'),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-700">
        <RefreshCw className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pt-2 animate-slide-up lg:space-y-5">
        <div className="flex items-start justify-between gap-3 lg:items-center">
          <div className="pt-1">
            <p className="app-label text-[11px] font-black uppercase tracking-[0.24em] mb-0.5">
              Payments
            </p>

          </div>

          <div className="flex items-center gap-2">
            {coachBankInfo && (
              <button
                type="button"
                onClick={() => setShowBankInfo(true)}
                className="app-ghost-button rounded-full border px-4 h-11 text-white/80 text-[10px] font-black uppercase tracking-[0.18em] inline-flex items-center gap-2 active:scale-95 transition-all"
                title="View bank details"
              >
                <Building2 className="w-3.5 h-3.5" />
                Bank Account
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void fetchPayments();
              }}
              className="app-ghost-button w-11 h-11 rounded-full border text-neutral-300 flex items-center justify-center active:scale-95 transition-all"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isCoachView && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="app-cta-button h-11 w-11 rounded-full border flex items-center justify-center active:scale-95 transition-all"
                aria-label="Create payment"
                title="Create payment"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {payments.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => {
                    if (card.isCurrency) setShowExactTotals((current) => !current);
                  }}
                  className={`rounded-[16px] border px-3 py-2.5 text-left lg:min-h-[92px] lg:rounded-[18px] lg:px-4 lg:py-3 ${card.classes} ${card.isCurrency ? 'cursor-pointer active:scale-[0.98] transition-transform' : 'cursor-default'}`}
                  title={card.isCurrency ? 'Toggle between compact and exact totals' : undefined}
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
            <p className="text-[10px] font-black uppercase tracking-[0.28em]">No Payments Yet</p>
            <p className="text-neutral-500 text-sm mt-2 px-6">
              {isCoachView
                ? 'Create a manual payment for a new service or create a package so the system can open the charge automatically.'
                : 'Your coach has not created any payment request for you yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-4 lg:gap-4 lg:space-y-0">
            {paymentGroups.map((group) => (
              <div key={group.id} className="space-y-2 lg:space-y-2.5">
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

                {group.items.length === 0 ? (
                  <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center text-[11px] text-neutral-600">
                    No payments
                  </div>
                ) : (
                <div className="grid gap-2.5">
                {group.items.map((payment) => {
                  const statusMeta = getPaymentStatusMeta(payment.status);
                  const tone = getToneClasses(statusMeta.tone);
                  const typeMeta = getPaymentTypeMeta(payment.payment_type);
                  const title = getPaymentDisplayTitle(payment);
                  const isBusy = actioningId === payment.id;
                  const packageLabel = payment.package_number
                    ? `Package #${String(payment.package_number).padStart(2, '0')}`
                    : null;
                  const shouldShowPackageMeta =
                    packageLabel && title.trim().toLowerCase() !== packageLabel.toLowerCase();
                  const timeline = buildTimeline(payment);
                  const supportingCopy = payment.detail_note?.trim() || '';

                  return (
                    <div
                      key={payment.id}
                      className={`rounded-[20px] border px-3.5 py-3 transition-all lg:min-h-[132px] lg:rounded-[22px] lg:px-4 lg:py-3.5 ${tone.panel}`}
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
                                <Tag className="h-2.5 w-2.5" />
                                {packageLabel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
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

                          {supportingCopy && (
                            <p className="mt-auto pt-1.5 line-clamp-1 text-[11px] leading-snug text-neutral-400">
                              {supportingCopy}
                            </p>
                          )}

                          <div className={`${supportingCopy ? 'mt-1.5' : 'mt-auto pt-2'} flex min-w-0 items-center gap-1.5 text-[9.5px] text-neutral-600`}>
                            <CalendarClock className="h-3 w-3 shrink-0" />
                            <p className="truncate">{timeline}</p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {isCoachView && payment.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleMarkPaid(payment);
                                }}
                                disabled={isBusy}
                                className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-[rgba(200,245,63,0.3)] bg-[rgba(200,245,63,0.14)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--app-accent)] transition-all active:scale-95 disabled:opacity-50"
                              >
                                {isBusy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleVoid(payment);
                                }}
                                disabled={isBusy}
                                className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-neutral-300 transition-all active:scale-95 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
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
                                className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-[rgba(200,245,63,0.3)] bg-[rgba(200,245,63,0.14)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--app-accent)] transition-all active:scale-95 disabled:opacity-50"
                              >
                                {isBusy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleVoid(payment);
                                }}
                                disabled={isBusy}
                                className="inline-flex min-w-[74px] items-center justify-center gap-1 rounded-[11px] border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-neutral-300 transition-all active:scale-95 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
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
                              className="inline-flex min-w-[96px] items-center justify-center gap-1 rounded-[11px] border border-blue-400/20 bg-blue-500/[0.12] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-blue-300 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isBusy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              I've Paid
                            </button>
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

      {showBankInfo && coachBankInfo && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[650] bg-black/65 backdrop-blur-sm px-4 py-8 flex items-start justify-center overflow-y-auto animate-fade-in">
          <div className="w-full max-w-[420px] flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[var(--app-bg-dialog)] shadow-2xl animate-modal-in">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-neutral-600">Bank Details</p>
                <h3 className="mt-0.5 text-base font-semibold text-white leading-snug">
                  {coachBankInfo.full_name || 'Coach Bank Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBankInfo(false)}
                className="app-ghost-button h-9 w-9 shrink-0 rounded-full border flex items-center justify-center"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* QR Code */}
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[20px] border border-white/8 bg-black/20">
                  {coachBankInfo.bank_qr_url ? (
                    <img src={coachBankInfo.bank_qr_url} alt="Bank QR" className="h-full w-full object-contain p-3" />
                  ) : (
                    <QrCode className="w-20 h-20 text-white/20" />
                  )}
                </div>
              </div>

              {/* Bank info — always render card, only show fields that have data */}
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] divide-y divide-white/[0.06]">
                {(coachBankInfo.bank_name?.trim() || coachBankInfo.bank_branch?.trim()) && (
                  <div className="px-4 py-2">
                    <p className="text-[13px] font-medium text-white">
                      {[coachBankInfo.bank_name?.trim(), coachBankInfo.bank_branch?.trim()].filter(Boolean).join(' - ')}
                    </p>
                  </div>
                )}
                {coachBankInfo.bank_account_name?.trim() && (
                  <div className="px-4 py-2">
                    <p className="text-[13px] text-neutral-300">{coachBankInfo.bank_account_name.trim()}</p>
                  </div>
                )}
                {/* Account number — always show, with copy button if value exists */}
                <div className="px-4 py-2 flex items-center justify-between gap-3">
                  <p className="min-w-0 text-[17px] font-semibold tracking-[0.08em] text-white tabular-nums">
                    {coachBankInfo.bank_account_number?.trim() || '—'}
                  </p>
                  {coachBankInfo.bank_account_number?.trim() && (
                    <button
                      type="button"
                      onClick={copyAccountNumber}
                      className="app-ghost-button h-8 w-8 shrink-0 rounded-full border flex items-center justify-center"
                      title="Copy account number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default PaymentTab;
