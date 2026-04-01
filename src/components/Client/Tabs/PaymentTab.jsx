import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const fmtVND = (amount) =>
  Number(amount).toLocaleString('vi-VN').replace(/,/g, '.') + ' ₫';

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const PaymentTab = ({ client, readOnly = false }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });
    if (!error) setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [client.id]);

  const markPaid = async (id) => {
    setMarkingId(id);
    const { error } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetchPayments();
    setMarkingId(null);
  };

  const totalUnpaid = payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid   = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-neutral-700">
      <RefreshCw className="w-5 h-5 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 animate-slide-up">

      {/* Summary bar */}
      {payments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-[18px] px-4 py-3">
            <p className="text-[8px] font-black text-red-400/70 uppercase tracking-widest mb-1">Chưa thanh toán</p>
            <p className="text-white font-semibold text-sm">{totalUnpaid > 0 ? fmtVND(totalUnpaid) : '—'}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[18px] px-4 py-3">
            <p className="text-[8px] font-black text-emerald-400/70 uppercase tracking-widest mb-1">Đã thanh toán</p>
            <p className="text-white font-semibold text-sm">{totalPaid > 0 ? fmtVND(totalPaid) : '—'}</p>
          </div>
        </div>
      )}

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="text-center py-12 text-neutral-700">
          <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-[10px] font-black uppercase tracking-widest">Chưa có thanh toán nào</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {payments.map(p => {
            const isPaid = p.status === 'paid';
            return (
              <div
                key={p.id}
                className={`rounded-[20px] border px-5 py-4 transition-all ${
                  isPaid
                    ? 'bg-white/[0.02] border-white/[0.05] opacity-60'
                    : 'bg-red-500/[0.06] border-red-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {isPaid
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        : <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      }
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isPaid ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </div>
                    {/* Package label */}
                    <p className="text-white font-semibold text-sm">
                      Gói #{String(p.package_number || '?').padStart(2, '0')}
                    </p>
                    {/* Amount */}
                    <p className="text-white font-bold text-lg mt-0.5">{fmtVND(p.amount)}</p>
                    {/* Dates */}
                    <p className="text-neutral-600 text-[9px] mt-1.5">
                      Tạo: {fmtDate(p.created_at)}
                      {isPaid && p.paid_at && <span className="ml-3 text-emerald-600">Trả: {fmtDate(p.paid_at)}</span>}
                    </p>
                  </div>

                  {/* Action */}
                  {!isPaid && !readOnly && (
                    <button
                      onClick={() => markPaid(p.id)}
                      disabled={markingId === p.id}
                      className="shrink-0 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-[12px] text-emerald-400 text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {markingId === p.id
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <CheckCircle2 className="w-3 h-3" />
                      }
                      Đã trả
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PaymentTab;
