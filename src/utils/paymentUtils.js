export const PAYMENT_TYPE_OPTIONS = [
  { value: 'package', label: 'Package', description: 'Thanh toán gói tập đã mua.' },
  { value: 'nutrition', label: 'Nutrition', description: 'Dịch vụ dinh dưỡng hoặc tư vấn ăn uống.' },
  { value: 'prep_meal', label: 'Prep Meal', description: 'Suất ăn chuẩn bị sẵn hoặc meal prep.' },
  { value: 'sketching', label: 'Sketching', description: 'Dịch vụ sketching hoặc body planning.' },
  { value: 'other', label: 'Other', description: 'Dịch vụ phát sinh khác.' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Khách chuyển khoản vào tài khoản coach.' },
  { value: 'cash', label: 'Cash', description: 'Khách thanh toán tiền mặt trực tiếp.' },
  { value: 'card', label: 'Card', description: 'Thanh toán qua thẻ hoặc POS.' },
  { value: 'other', label: 'Other', description: 'Phương thức khác do coach ghi chú.' },
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
    return `${trimTrailingZeros(formatted)} Tỷ`;
  }

  if (absValue >= 1_000_000) {
    const decimals = absValue >= 100_000_000 ? 0 : absValue >= 10_000_000 ? 1 : 2;
    const formatted = (value / 1_000_000).toFixed(decimals);
    return `${trimTrailingZeros(formatted)} Tr`;
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
        label: 'Transfer Submitted',
        tone: 'amber',
        description: 'Khách đã báo chuyển khoản, đang chờ coach xác nhận.',
      };
    case 'paid':
      return {
        label: 'Paid',
        tone: 'emerald',
        description: 'Khoản này đã được coach xác nhận hoàn tất.',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        tone: 'neutral',
        description: 'Khoản này đã được hủy và không còn hiệu lực.',
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        tone: 'red',
        description: 'Khoản này đang chờ khách hàng thanh toán.',
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

export const getToneClasses = (tone) => {
  switch (tone) {
    case 'emerald':
      return {
        badge: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/[0.10]',
        panel: 'border-emerald-500/20 bg-emerald-500/[0.06]',
        icon: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/[0.08]',
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
