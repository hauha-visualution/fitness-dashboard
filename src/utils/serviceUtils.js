export const SERVICE_NOTE_PREFIX = '__service_meta__';
export const SERVICE_BOOKING_PREFIX = '__service_booking__';

export const SERVICE_TYPE_CONFIG = {
  training: {
    id: 'training',
    label: 'Training Package',
    shortLabel: 'Training',
    helper: 'Recurring coached sessions with a fixed weekly schedule.',
    detailPlaceholder: 'Example: Lower Body Build · Phase 1',
    quantityLabel: 'Sessions',
    bonusLabel: 'Bonus',
    totalLabel: 'Total',
    previewLabel: 'sessions',
    paymentType: 'package',
  },
  sketching: {
    id: 'sketching',
    label: 'Sketching',
    shortLabel: 'Sketching',
    helper: 'Flexible sketching package without a fixed schedule. Add each session manually later.',
    detailPlaceholder: 'Example: Posing line check · Front / Back',
    quantityLabel: 'Sessions',
    bonusLabel: 'Bonus',
    totalLabel: 'Total',
    previewLabel: 'sessions',
    paymentType: 'sketching',
  },
  meal_prep: {
    id: 'meal_prep',
    label: 'Meal Prep',
    shortLabel: 'Meal Prep',
    helper: 'Build a running checklist of products and only create payment when you are ready.',
    detailPlaceholder: 'Example: Weekly prep support · Week 1',
    quantityLabel: 'Rows',
    bonusLabel: 'Bonus',
    totalLabel: 'Total',
    previewLabel: 'items',
    paymentType: 'prep_meal',
  },
};

export const SERVICE_TYPE_OPTIONS = Object.values(SERVICE_TYPE_CONFIG);

export const MEAL_PREP_UNIT_OPTIONS = [
  'g',
  'kg',
  'pack',
  'bottle',
  'box',
  'bag',
  'jar',
  'meal',
  'item',
];

export const MEAL_PREP_GROUP_OPTIONS = [
  'Carb',
  'Protein',
  'Rau',
  'Khác',
];

export const MEAL_PREP_PRODUCT_OPTIONS = {
  Carb: ['Khoai', 'Gạo lứt', 'Yến mạch', 'Bánh mì nguyên cám', 'Bún gạo lứt', 'Khác'],
  Protein: ['Ức gà', 'Cá ngừ', 'Cá basa', 'Cá hồi', 'Tôm', 'Trứng', 'Thịt bò', 'Khác'],
  Rau: ['Bông cải', 'Cải bó xôi', 'Xà lách', 'Dưa leo', 'Cà chua', 'Măng tây', 'Khác'],
  Khác: ['Khác'],
};

export const getMealPrepProductOptions = (foodGroup) => {
  if (!foodGroup) {
    return Array.from(new Set(Object.values(MEAL_PREP_PRODUCT_OPTIONS).flat()));
  }

  return MEAL_PREP_PRODUCT_OPTIONS[foodGroup] || ['Khác'];
};

const defaultMeta = {
  serviceType: 'training',
  serviceDetail: '',
  coachNote: '',
  mealPrepItems: [],
};

export const getServiceTypeConfig = (serviceType) =>
  SERVICE_TYPE_CONFIG[serviceType] || SERVICE_TYPE_CONFIG.training;

export const serializeServiceMeta = (meta = {}) => {
  const payload = {
    ...defaultMeta,
    ...meta,
    serviceType: meta.serviceType || 'training',
    serviceDetail: meta.serviceDetail?.trim() || '',
    coachNote: meta.coachNote?.trim() || '',
    mealPrepItems: Array.isArray(meta.mealPrepItems)
      ? meta.mealPrepItems.map((item) => ({
          foodGroup: item.foodGroup?.trim() || '',
          productName: item.productName?.trim() || '',
          unit: item.unit || 'item',
          quantity: item.quantity?.trim() || '',
          amount: Number(item.amount || 0),
        }))
      : [],
  };

  return `${SERVICE_NOTE_PREFIX}${JSON.stringify(payload)}`;
};

export const parseServiceMeta = (note) => {
  if (!note || typeof note !== 'string' || !note.startsWith(SERVICE_NOTE_PREFIX)) {
    return {
      ...defaultMeta,
      serviceType: 'training',
      coachNote: note || '',
    };
  }

  try {
    const parsed = JSON.parse(note.slice(SERVICE_NOTE_PREFIX.length));
    return {
      ...defaultMeta,
      ...parsed,
      serviceType: parsed.serviceType || 'training',
      serviceDetail: parsed.serviceDetail || '',
      coachNote: parsed.coachNote || '',
      mealPrepItems: Array.isArray(parsed.mealPrepItems) ? parsed.mealPrepItems : [],
    };
  } catch {
    return {
      ...defaultMeta,
      serviceType: 'training',
      coachNote: note,
    };
  }
};

export const getServiceTypeLabel = (serviceType) =>
  getServiceTypeConfig(serviceType).label;

export const getServiceTotalLabel = (serviceType, total) => {
  const config = getServiceTypeConfig(serviceType);
  return `${total} included ${config.previewLabel}`;
};

export const buildMealPrepPaymentDetail = (items = [], coachNote = '') => {
  const lines = items
    .filter((item) => item.productName || item.foodGroup || item.quantity || item.amount)
    .map((item, index) => {
      const unitLabel = item.unit ? ` ${item.unit}` : '';
      const quantity = item.quantity ? `${item.quantity}${unitLabel}` : item.unit ? item.unit : '';
      const amount = Number(item.amount || 0) > 0
        ? `${Number(item.amount || 0).toLocaleString('vi-VN')} đ`
        : '';
      const parts = [item.foodGroup, item.productName, quantity, amount].filter(Boolean);
      return `${index + 1}. ${parts.join(' · ')}`;
    });

  if (coachNote?.trim()) {
    lines.push(`Coach note: ${coachNote.trim()}`);
  }

  return lines.join('\n');
};

export const serializeServiceBooking = ({ endTime = '', location = '', note = '' } = {}) =>
  `${SERVICE_BOOKING_PREFIX}${JSON.stringify({
    endTime: endTime || '',
    location: location?.trim() || '',
    note: note?.trim() || '',
  })}`;

export const parseServiceBooking = (raw) => {
  if (!raw || typeof raw !== 'string' || !raw.startsWith(SERVICE_BOOKING_PREFIX)) {
    return {
      endTime: '',
      location: '',
      note: raw || '',
    };
  }

  try {
    const parsed = JSON.parse(raw.slice(SERVICE_BOOKING_PREFIX.length));
    return {
      endTime: parsed.endTime || '',
      location: parsed.location || '',
      note: parsed.note || '',
    };
  } catch {
    return {
      endTime: '',
      location: '',
      note: raw,
    };
  }
};
