export const PAYMENT_TYPE_OPTIONS = [
  { value: 'package', label: 'Package', description: 'Payment for a training package.' },
  { value: 'nutrition', label: 'Nutrition', description: 'Nutrition coaching or meal guidance.' },
  { value: 'prep_meal', label: 'Prep Meal', description: 'Prepared meals or meal-prep service.' },
  { value: 'stretching', label: 'Stretching', description: 'Body planning or stretching service.' },
  { value: 'other', label: 'Other', description: 'Any additional custom service.' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Trainee transfers money to the coach account.' },
  { value: 'cash', label: 'Cash', description: 'Trainee pays in cash.' },
  { value: 'card', label: 'Card', description: 'Paid by card or POS.' },
  { value: 'other', label: 'Other', description: 'Any other method noted by the coach.' },
];

export const fmtVND = (amount) =>
  Number(amount || 0).toLocaleString('vi-VN').replace(/,/g, '.') + ' ₫';

export const fmtVNDAbridged = (amount) => {
  const value = Number(amount || 0);
  const absValue = Math.abs(value);

  const trimTrailingZeros = (input) => input.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');

  if (absValue >= 1_000_000_000) {
    const decimals = absValue >= 100_000_000_000 ? 0 : absValue >= 10_000_000_000 ? 1 : 2;
    const formatted = (value / 1_000_000_000).toFixed(decimals);
    return `${trimTrailingZeros(formatted)}B`;
  }

  if (absValue >= 1_000_000) {
    const decimals = absValue >= 100_000_000 ? 0 : absValue >= 10_000_000 ? 1 : 2;
    const formatted = (value / 1_000_000).toFixed(decimals);
    return `${trimTrailingZeros(formatted)}M`;
  }

  if (absValue >= 1_000) {
    const decimals = absValue >= 100_000 ? 0 : absValue >= 10_000 ? 1 : 2;
    const formatted = (value / 1_000).toFixed(decimals);
    return `${trimTrailingZeros(formatted)} K`;
  }

  return `${value}`;
};

export const fmtDate = (iso) => {
  if (!iso) return null;
  const value = new Date(iso);
  return `${String(value.getDate()).padStart(2, '0')}/${String(value.getMonth() + 1).padStart(2, '0')}/${value.getFullYear()}`;
};

export const isOutstandingPayment = (status) => ['pending', 'submitted'].includes(status);

export const getPaymentTypeMeta = (paymentType) =>
  PAYMENT_TYPE_OPTIONS.find((option) => option.value === paymentType) || PAYMENT_TYPE_OPTIONS[PAYMENT_TYPE_OPTIONS.length - 1];

export const getPaymentStatusMeta = (status) => {
  switch (status) {
    case 'submitted':
      return {
        label: 'Submitted',
        tone: 'amber',
        description: 'Trainee marked the transfer as sent and is waiting for coach confirmation.',
      };
    case 'paid':
      return {
        label: 'Paid',
        tone: 'emerald',
        description: 'This payment has been confirmed and completed.',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        tone: 'neutral',
        description: 'This payment has been voided and is no longer active.',
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        tone: 'red',
        description: 'This payment is still waiting for the trainee to pay.',
      };
  }
};

export const getPaymentTitle = (payment) => {
  if (payment?.title?.trim()) return payment.title.trim();
  if (payment?.package_number) {
    return `Package #${String(payment.package_number).padStart(2, '0')}`;
  }
  return 'Service Payment';
};

export const getPaymentDisplayTitle = (payment) => {
  const indexLabel = payment?.package_number
    ? ` #${String(payment.package_number).padStart(2, '0')}`
    : '';

  switch (payment?.payment_type) {
    case 'package':
      return `Package${indexLabel}`;
    case 'prep_meal':
      return `Meal Prep${indexLabel}`;
    case 'stretching':
      return `Stretching${indexLabel}`;
    case 'nutrition':
      return payment?.title?.trim() || `Nutrition${indexLabel}`;
    case 'other':
      return payment?.title?.trim() || `Service${indexLabel}`;
    default:
      return getPaymentTitle(payment);
  }
};

export const getToneClasses = (tone) => {
  switch (tone) {
    case 'emerald':
      return {
        badge: 'text-[var(--app-accent)] border-[rgba(200,245,63,0.25)] bg-[rgba(200,245,63,0.12)]',
        panel: 'border-[rgba(200,245,63,0.2)] bg-[rgba(200,245,63,0.06)]',
        icon: 'text-[var(--app-accent)] border-[rgba(200,245,63,0.2)] bg-[rgba(200,245,63,0.10)]',
      };
    case 'amber':
      return {
        badge: 'text-amber-300 border-amber-500/25 bg-amber-500/[0.10]',
        panel: 'border-amber-500/20 bg-amber-500/[0.06]',
        icon: 'text-amber-300 border-amber-500/20 bg-amber-500/[0.08]',
      };
    case 'neutral':
      return {
        badge: 'text-neutral-300 border-white/10 bg-white/[0.06]',
        panel: 'border-white/[0.08] bg-white/[0.03]',
        icon: 'text-neutral-300 border-white/10 bg-white/[0.06]',
      };
    case 'red':
    default:
      return {
        badge: 'text-red-300 border-red-500/25 bg-red-500/[0.10]',
        panel: 'border-red-500/20 bg-red-500/[0.06]',
        icon: 'text-red-300 border-red-500/20 bg-red-500/[0.08]',
      };
  }
};
