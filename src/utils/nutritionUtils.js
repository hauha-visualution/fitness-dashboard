export const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const NUTRITION_ARCHIVE_FIELDS = [
  { key: 'cookinghabit', label: 'Thói quen nấu ăn' },
  { key: 'cookingtime', label: 'Thời gian nấu/ngày' },
  { key: 'foodbudget', label: 'Ngân sách ăn' },
  { key: 'dietaryrestriction', label: 'Kiêng / dị ứng' },
  { key: 'avoidfoods', label: 'Thực phẩm tránh' },
  { key: 'favoritefoods', label: 'Món yêu thích' },
  { key: 'medicalconditions', label: 'Bệnh lý liên quan' },
  { key: 'supplements', label: 'Thuốc / TPBS' },
  { key: 'commitmentlevel', label: 'Mức cam kết' },
];

const SURVEY_FIELD_ALIASES = {
  cookinghabit: ['cookinghabit', 'cooking_habit'],
  cookingtime: ['cookingtime', 'cooking_time'],
  foodbudget: ['foodbudget', 'food_budget'],
  dietaryrestriction: ['dietaryrestriction', 'dietary_restriction', 'dietrestriction'],
  avoidfoods: ['avoidfoods', 'avoidfood', 'avoid_foods'],
  favoritefoods: ['favoritefoods', 'favoritefood', 'favorite_foods'],
  medicalconditions: ['medicalconditions', 'medical_conditions'],
  supplements: ['supplements', 'supplement'],
  commitmentlevel: ['commitmentlevel', 'commitmentlevels', 'commitment_level'],
  traininghistory: ['traininghistory', 'training_history'],
  targetduration: ['targetduration', 'target_duration'],
  jobtype: ['jobtype', 'job_type'],
  sleephabits: ['sleephabits', 'sleep_habits'],
};

const isFilled = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const cleanToken = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[\n;|]+/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim();

export const normalizeSurveyResponseRecord = (row = {}) => {
  const lowered = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    lowered[String(key).toLowerCase()] = typeof value === 'string' ? value.trim() : value;
  });

  const mapped = { ...lowered };
  Object.entries(SURVEY_FIELD_ALIASES).forEach(([target, aliases]) => {
    const match = aliases
      .map((alias) => lowered[alias.toLowerCase()])
      .find((value) => isFilled(value));

    if (match !== undefined) {
      mapped[target] = match;
    }
  });

  return mapped;
};

export const buildNutritionProfileFromSource = (source = {}) =>
  NUTRITION_ARCHIVE_FIELDS.reduce((acc, field) => {
    acc[field.key] = source?.[field.key] ?? '';
    return acc;
  }, {});

export const buildNutritionSyncAudit = (clientSource = {}, surveySource = {}) => {
  const items = NUTRITION_ARCHIVE_FIELDS.map((field) => {
    const clientValue = clientSource?.[field.key] ?? '';
    const surveyValue = surveySource?.[field.key] ?? '';
    let status = 'synced';

    if (!isFilled(clientValue) && !isFilled(surveyValue)) {
      status = 'empty';
    } else if (!isFilled(clientValue) && isFilled(surveyValue)) {
      status = 'missing_in_client';
    } else if (isFilled(clientValue) && !isFilled(surveyValue)) {
      status = 'missing_in_form';
    } else if (cleanToken(clientValue) !== cleanToken(surveyValue)) {
      status = 'mismatch';
    }

    return {
      ...field,
      clientValue,
      surveyValue,
      status,
    };
  });

  return {
    items,
    counts: {
      synced: items.filter((item) => item.status === 'synced').length,
      mismatch: items.filter((item) => item.status === 'mismatch').length,
      missingInClient: items.filter((item) => item.status === 'missing_in_client').length,
      missingInForm: items.filter((item) => item.status === 'missing_in_form').length,
      empty: items.filter((item) => item.status === 'empty').length,
    },
  };
};

export const buildPhoneCandidates = (phone = '') => {
  const trimmed = String(phone).trim();
  const digits = trimmed.replace(/\D/g, '');
  const candidates = new Set([trimmed, trimmed.replace(/\s+/g, ''), digits]);

  if (digits.startsWith('0') && digits.length >= 10) {
    candidates.add(`84${digits.slice(1)}`);
    candidates.add(`+84${digits.slice(1)}`);
  }

  if (digits.startsWith('84') && digits.length >= 11) {
    candidates.add(`0${digits.slice(2)}`);
    candidates.add(`+${digits}`);
  }

  return [...candidates].filter((value) => value && value !== '+');
};

export const createDefaultNutritionTargets = () => ({
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  water: '',
  mealsPerDay: '',
  stepTarget: '',
  supplementsPlan: '',
  strategyNotes: '',
});

export const ensureNutritionTargets = (value) => ({
  ...createDefaultNutritionTargets(),
  ...(value && typeof value === 'object' ? value : {}),
});

export const createDefaultNutritionPlan = () => ({
  focus: '',
  coachingNotes: '',
  days: DAY_LABELS.map((day) => ({
    day,
    context: '',
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: '',
  })),
});

export const ensureNutritionPlan = (value) => {
  const defaults = createDefaultNutritionPlan();
  const incoming = value && typeof value === 'object' ? value : {};
  const incomingDays = Array.isArray(incoming.days) ? incoming.days : [];

  return {
    ...defaults,
    ...incoming,
    days: defaults.days.map((day, index) => ({
      ...day,
      ...(incomingDays[index] && typeof incomingDays[index] === 'object' ? incomingDays[index] : {}),
      day: day.day,
    })),
  };
};

export const createDefaultNutritionPrep = () => ({
  shoppingList: '',
  batchCooking: '',
  pantryStaples: '',
  eatingOutRules: '',
  coachNotes: '',
});

export const ensureNutritionPrep = (value) => ({
  ...createDefaultNutritionPrep(),
  ...(value && typeof value === 'object' ? value : {}),
});

export const createDefaultNutritionCheckin = () => ({
  checkin_date: new Date().toISOString().slice(0, 10),
  avg_weight: '',
  adherence_score: '4',
  calories_avg: '',
  protein_avg: '',
  steps_avg: '',
  water_liters: '',
  hunger_score: '3',
  energy_score: '3',
  digestion_score: '3',
  sleep_score: '3',
  wins: '',
  blockers: '',
  coach_adjustments: '',
});
