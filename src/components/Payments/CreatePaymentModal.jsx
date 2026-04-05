import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { UserRound, Wallet, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { notifyPaymentCreated, fetchClientNotifInfo } from '../../utils/notificationUtils';
import {
  PAYMENT_METHOD_OPTIONS,
  fmtVND,
} from '../../utils/paymentUtils';

// ─── Extra / standalone payment types only ────────────────────
// Package payments are auto-created when a package is created.
// This form is for additional charges OUTSIDE of a package.
const EXTRA_PAYMENT_TYPE_OPTIONS = [
  {
    value: 'nutrition',
    label: 'Nutrition',
    description: 'Nutrition coaching or meal guidance.',
    defaultTitle: 'Nutrition Service',
  },
  {
    value: 'prep_meal',
    label: 'Prep Meal',
    description: 'Meal prep charge outside a package.',
    defaultTitle: 'Prep Meal Service',
  },
  {
    value: 'sketching',
    label: 'Sketching',
    description: 'Standalone sketching session.',
    defaultTitle: 'Sketching Service',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Any additional or custom charge.',
    defaultTitle: 'Additional Service',
  },
];

const DEFAULT_FORM = {
  clientId: '',
  paymentType: 'nutrition',
  title: 'Nutrition Service',
  amount: '',
  paymentMethod: 'bank_transfer',
  detailNote: '',
};

const CreatePaymentModal = ({ clients = [], defaultClientId = null, onClose, onCreated }) => {
  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    clientId: defaultClientId
      ? String(defaultClientId)
      : clients.length === 1
        ? String(clients[0].id)
        : '',
  });
  const [amountRaw, setAmountRaw] = useState(''); // raw text the user types
  const [isSaving, setIsSaving] = useState(false);

  const selectedClientId = form.clientId ? Number(form.clientId) : null;
  const selectedClient = useMemo(
    () => clients.find((c) => Number(c.id) === selectedClientId) || null,
    [clients, selectedClientId],
  );

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'paymentType') {
        const meta = EXTRA_PAYMENT_TYPE_OPTIONS.find((o) => o.value === value);
        const prevDefault = EXTRA_PAYMENT_TYPE_OPTIONS.find((o) => o.value === prev.paymentType)?.defaultTitle || '';
        if (!prev.title.trim() || prev.title === prevDefault) {
          next.title = meta?.defaultTitle || '';
        }
      }

      return next;
    });
  };

  // Parse Vietnamese number format: "300.000" → 300000, "1.500.000" → 1500000
  const parseAmountInput = (raw) => {
    // Strip all dots (used as thousands sep in VN), then parse
    const stripped = raw.replace(/\./g, '').replace(/,/g, '.');
    const parsed = parseFloat(stripped);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleAmountChange = (raw) => {
    setAmountRaw(raw);
    const numeric = parseAmountInput(raw);
    setForm((prev) => ({ ...prev, amount: numeric }));
  };

  const canSubmit = selectedClientId && Number(form.amount) > 0 && form.title.trim();

  const handleCreate = async () => {
    if (!canSubmit || isSaving) return;
    setIsSaving(true);

    const payload = {
      client_id: selectedClientId,
      package_id: null,
      package_number: null,
      amount: Number(form.amount),
      status: 'pending',
      payment_type: form.paymentType,
      title: form.title.trim(),
      detail_note: form.detailNote.trim() || null,
      payment_method: form.paymentMethod,
      created_by: 'coach',
    };

    const { error } = await supabase.from('payments').insert([payload]);

    if (error) {
      alert(`Unable to create payment: ${error.message}`);
      setIsSaving(false);
      return;
    }

    onCreated?.();
    onClose?.();

    // ─── Notify trainee (fire-and-forget) ───
    void (async () => {
      const clientInfo = await fetchClientNotifInfo(selectedClientId);
      if (clientInfo?.auth_user_id) {
        await notifyPaymentCreated({
          clientAuthUserId: clientInfo.auth_user_id,
          amount: Number(form.amount),
          packageNumber: null,
        });
      }
    })();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm px-4 py-8 animate-fade-in">
      <div className="mx-auto w-full max-w-[420px] max-h-full overflow-hidden rounded-[32px] border border-white/10 bg-[var(--app-bg-dialog)] shadow-2xl flex flex-col animate-modal-in">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-neutral-600 mb-1">Payments</p>
            <h3 className="text-white text-lg font-semibold">Extra Payment</h3>
            <p className="text-neutral-500 text-xs mt-1">
              Charge for services outside of a package.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-ghost-button w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-5 space-y-5">

          {/* Trainee selector */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Trainee</label>
              <select
                value={form.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              >
                <option value="" className="bg-[#101010]">Select trainee</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#101010]">{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedClient && (
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-blue-400/20 bg-blue-500/[0.08] text-blue-300 flex items-center justify-center">
                <UserRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedClient.name}</p>
                <p className="text-neutral-500 text-xs">{selectedClient.goal || 'No goal note'}</p>
              </div>
            </div>
          )}

          {/* Service type */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Service Type</label>
            <div className="grid grid-cols-2 gap-2">
              {EXTRA_PAYMENT_TYPE_OPTIONS.map((option) => {
                const isSelected = form.paymentType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('paymentType', option.value)}
                    className={`rounded-[18px] border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-[var(--app-accent)]/30 bg-[var(--app-accent)]/[0.08]'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isSelected ? 'text-[var(--app-accent)]' : 'text-white'}`}>
                      {option.label}
                    </p>
                    <p className="text-neutral-500 text-[11px] mt-1">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Extra nutrition session"
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
            />
          </div>

          {/* Amount + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Amount</label>
              <input
                type="text"
                inputMode="numeric"
                value={amountRaw}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="300.000"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              />
              <p className="text-neutral-500 text-xs">
                {form.amount > 0 ? fmtVND(form.amount) : 'VND — gõ 300.000 = 300,000 ₫'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => updateField('paymentMethod', e.target.value)}
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              >
                {PAYMENT_METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#101010]">{o.label}</option>
                ))}
              </select>
              <p className="text-neutral-500 text-xs">
                {PAYMENT_METHOD_OPTIONS.find((o) => o.value === form.paymentMethod)?.description}
              </p>
            </div>
          </div>

          {/* Detail note */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Details</label>
            <textarea
              rows={3}
              value={form.detailNote}
              onChange={(e) => updateField('detailNote', e.target.value)}
              placeholder="Service details, notes, transfer instructions..."
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none resize-none"
            />
          </div>

          {/* Summary preview */}
          <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.05] text-neutral-300 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{form.title || 'New payment'}</p>
              <p className="text-neutral-500 text-xs mt-0.5">
                {selectedClient ? selectedClient.name : 'No trainee selected'}
                {Number(form.amount) > 0 ? ` · ${fmtVND(form.amount)}` : ''}
              </p>
              <p className="text-neutral-700 text-[10px] mt-1">
                Starts as Pending → trainee marks Sent → coach confirms Paid.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="app-ghost-button px-4 py-2.5 rounded-[14px] border text-neutral-300 text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleCreate(); }}
            disabled={!canSubmit || isSaving}
            className="app-cta-button px-4 py-2.5 rounded-[14px] border text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Create'}
          </button>
        </div>

      </div>
    </div>,
    document.body,
  );
};

export default CreatePaymentModal;
