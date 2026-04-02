import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Library, UserRound, Wallet, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  fmtVND,
} from '../../utils/paymentUtils';

const TYPE_DEFAULT_TITLES = {
  package: 'Package Payment',
  nutrition: 'Nutrition Service',
  prep_meal: 'Prep Meal Service',
  sketching: 'Sketching Service',
  other: 'Additional Service',
};

const DEFAULT_FORM = {
  clientId: '',
  paymentType: 'nutrition',
  title: TYPE_DEFAULT_TITLES.nutrition,
  amount: '',
  paymentMethod: 'bank_transfer',
  detailNote: '',
  packageId: '',
  packageNumber: null,
};

const CreatePaymentModal = ({ clients = [], defaultClientId = null, onClose, onCreated }) => {
  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    clientId: defaultClientId ? String(defaultClientId) : '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const selectedClientId = form.clientId ? Number(form.clientId) : null;
  const selectedClient = useMemo(
    () => clients.find((client) => Number(client.id) === selectedClientId) || null,
    [clients, selectedClientId]
  );

  useEffect(() => {
    if (!selectedClientId) {
      const timeoutId = window.setTimeout(() => {
        setPackages([]);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const fetchPackages = async () => {
      setLoadingPackages(true);
      const { data, error } = await supabase
        .from('packages')
        .select('id, package_number, total_sessions, status')
        .eq('client_id', selectedClientId)
        .order('package_number', { ascending: false });

      if (error) {
        alert(`Không tải được gói tập: ${error.message}`);
        setLoadingPackages(false);
        return;
      }

      setPackages(data || []);
      setLoadingPackages(false);
    };

    void fetchPackages();
  }, [selectedClientId]);

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'paymentType' && !prev.title.trim()) {
        next.title = TYPE_DEFAULT_TITLES[value] || TYPE_DEFAULT_TITLES.other;
      }

      if (key === 'clientId') {
        next.packageId = '';
        next.packageNumber = null;
      }

      if (key === 'packageId') {
        const selectedPackage = packages.find((pkg) => pkg.id === value) || null;
        next.packageNumber = selectedPackage?.package_number ?? null;
      }

      if (key === 'paymentType' && value !== 'package') {
        next.packageId = '';
        next.packageNumber = null;
      }

      return next;
    });
  };

  const canSubmit = selectedClientId && Number(form.amount) > 0 && form.title.trim();

  const handleCreate = async () => {
    if (!canSubmit || isSaving) return;

    setIsSaving(true);

    const payload = {
      client_id: selectedClientId,
      package_id: form.packageId || null,
      package_number: form.packageNumber ?? null,
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
      alert(`Không thể tạo payment: ${error.message}`);
      setIsSaving(false);
      return;
    }

    onCreated?.();
    onClose?.();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="mx-auto w-full max-w-[420px] max-h-full overflow-hidden rounded-[32px] border border-white/10 bg-[#101010] shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-neutral-600 mb-1">
              Payments
            </p>
            <h3 className="text-white text-lg font-semibold">Create Payment</h3>
            <p className="text-neutral-500 text-xs mt-1">
              Tạo yêu cầu thanh toán mới cho học viên hoặc dịch vụ phát sinh.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Close"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-5 space-y-5">
          {clients.length > 1 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                Trainee
              </label>
              <select
                value={form.clientId}
                onChange={(event) => updateField('clientId', event.target.value)}
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              >
                <option value="" className="bg-[#101010]">Select trainee</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id} className="bg-[#101010]">
                    {client.name}
                  </option>
                ))}
              </select>
              <p className="text-neutral-500 text-xs">Chọn học viên sẽ nhận yêu cầu thanh toán này.</p>
            </div>
          )}

          {selectedClient && (
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-blue-400/20 bg-blue-500/[0.08] text-blue-300 flex items-center justify-center">
                <UserRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedClient.name}</p>
                <p className="text-neutral-500 text-xs">{selectedClient.goal || 'Không có ghi chú mục tiêu'}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_TYPE_OPTIONS.map((option) => {
                const isSelected = form.paymentType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('paymentType', option.value)}
                    className={`rounded-[18px] border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-blue-400/30 bg-blue-500/[0.10]'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <p className="text-white text-sm font-semibold">{option.label}</p>
                    <p className="text-neutral-500 text-[11px] mt-1">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {form.paymentType === 'package' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                Package
              </label>
              <select
                value={form.packageId}
                onChange={(event) => updateField('packageId', event.target.value)}
                disabled={!selectedClientId || loadingPackages}
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none disabled:opacity-50"
              >
                <option value="" className="bg-[#101010]">
                  {loadingPackages ? 'Loading packages...' : 'Optional package link'}
                </option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id} className="bg-[#101010]">
                    {`Package #${String(pkg.package_number).padStart(2, '0')} · ${pkg.total_sessions} buổi`}
                  </option>
                ))}
              </select>
              <p className="text-neutral-500 text-xs">Có thể liên kết với gói tập nếu payment này thuộc một package cụ thể.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Nutrition Service"
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
            />
            <p className="text-neutral-500 text-xs">Tên ngắn gọn để khách hàng dễ hiểu khoản cần thanh toán.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                Amount
              </label>
              <input
                type="number"
                min="0"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                placeholder="0"
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              />
              <p className="text-neutral-500 text-xs">{Number(form.amount) > 0 ? fmtVND(form.amount) : 'Nhập số tiền cần thu.'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                Method
              </label>
              <select
                value={form.paymentMethod}
                onChange={(event) => updateField('paymentMethod', event.target.value)}
                className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none"
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#101010]">
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-neutral-500 text-xs">
                {PAYMENT_METHOD_OPTIONS.find((option) => option.value === form.paymentMethod)?.description}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
              Details
            </label>
            <textarea
              rows={4}
              value={form.detailNote}
              onChange={(event) => updateField('detailNote', event.target.value)}
              placeholder="Ghi chú chi tiết về dịch vụ, thời hạn, yêu cầu chuyển khoản..."
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none resize-none"
            />
            <p className="text-neutral-500 text-xs">Phần chú giải tiếng Việt để coach và khách hàng cùng nhìn ra đúng dịch vụ đang được thu tiền.</p>
          </div>

          <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.05] text-neutral-300 flex items-center justify-center shrink-0">
              {form.paymentType === 'package' ? <Library className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-white font-medium">{form.title || 'New payment'}</p>
              <p className="text-neutral-500 text-sm mt-1">
                Sau khi tạo, payment sẽ ở trạng thái chờ thanh toán. Khách có thể bấm báo đã chuyển, hoặc coach xác nhận trực tiếp sau.
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-[14px] border border-white/10 bg-white/[0.04] text-neutral-300 text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCreate();
            }}
            disabled={!canSubmit || isSaving}
            className="px-4 py-2.5 rounded-[14px] border border-blue-400/20 bg-blue-500/[0.12] text-blue-300 text-[11px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving' : 'Create'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreatePaymentModal;
