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

export const COMMITMENT_LEVEL_OPTIONS = [
  'Sẵn sàng tuân thủ 100%',
  'Sẵn sàng phần lớn',
  'Cần đốc thúc',
  'Hoàn toàn sẵn sàng, em rất quyết tâm!',
  'Phần lớn là được, miễn phù hợp với lịch sinh hoạt',
  'Hơi khó, không chắc chắn lắm vì bận công việc...',
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

const SURVEY_FIELD_KEYWORDS = {
  cookinghabit: ['cookinghabit', 'thoiquennauan', 'nauan', 'cookhabit'],
  cookingtime: ['cookingtime', 'thoigiannau', 'giannau', 'cooktime'],
  foodbudget: ['foodbudget', 'ngansach', 'budgetan', 'foodmoney'],
  dietaryrestriction: ['dietaryrestriction', 'dikieng', 'ankieng', 'diung', 'restriction'],
  avoidfoods: ['avoidfoods', 'thucphamtranh', 'foodavoid', 'khongan', 'tranh'],
  favoritefoods: ['favoritefoods', 'monyeuthich', 'foodfavorite', 'yeuthich'],
  medicalconditions: ['medicalconditions', 'benhly', 'benhnen', 'medical', 'healthissue'],
  supplements: ['supplements', 'tpbs', 'thucphambosung', 'thuocdangdung', 'supplement'],
  commitmentlevel: ['commitmentlevel', 'camket', 'mucdocamket', 'discipline'],
  traininghistory: ['traininghistory', 'lichtutap', 'lichsutap', 'historytap'],
  targetduration: ['targetduration', 'thoigianmongmuon', 'targettime', 'duration'],
  jobtype: ['jobtype', 'congviec', 'tinhchatcongviec', 'jobnature'],
  sleephabits: ['sleephabits', 'giacngu', 'sleep', 'thoiquengiacngu'],
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

const normalizeLookupKey = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export const normalizeDateForDateInput = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3];

    // Spreadsheet locale is en_US, so dates coming from the form output are MM/DD/YYYY.
    const month = String(first).padStart(2, '0');
    const day = String(second).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return raw;
};

export const normalizeSurveyResponseRecord = (row = {}) => {
  const lowered = {};
  const normalizedEntries = [];

  Object.entries(row || {}).forEach(([key, value]) => {
    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    const loweredKey = String(key).toLowerCase();
    lowered[loweredKey] = normalizedValue;
    normalizedEntries.push({
      originalKey: key,
      loweredKey,
      normalizedKey: normalizeLookupKey(key),
      value: normalizedValue,
    });
  });

  const mapped = { ...lowered };
  Object.entries(SURVEY_FIELD_ALIASES).forEach(([target, aliases]) => {
    let match = aliases
      .map((alias) => lowered[alias.toLowerCase()])
      .find((value) => isFilled(value));

    if (!isFilled(match)) {
      const keywords = SURVEY_FIELD_KEYWORDS[target] || [];
      const keywordMatch = normalizedEntries.find((entry) =>
        isFilled(entry.value) && keywords.some((keyword) => entry.normalizedKey.includes(keyword)),
      );
      match = keywordMatch?.value;
    }

    if (match !== undefined) {
      mapped[target] = match;
    }
  });

  if (mapped.dob !== undefined) {
    mapped.dob = normalizeDateForDateInput(mapped.dob);
  }

  return mapped;
};

export const buildNutritionProfileFromSource = (source = {}) =>
  NUTRITION_ARCHIVE_FIELDS.reduce((acc, field) => {
    acc[field.key] = source?.[field.key] ?? '';
    return acc;
  }, {});

export const countFilledNutritionFields = (source = {}) =>
  NUTRITION_ARCHIVE_FIELDS.filter((field) => isFilled(source?.[field.key])).length;

export const hasNutritionColumnsInSurveyRow = (row = {}) => {
  const normalizedKeys = Object.keys(row || {}).map((key) => normalizeLookupKey(key));

  return Object.entries(SURVEY_FIELD_KEYWORDS).some(([field, keywords]) => {
    const aliases = SURVEY_FIELD_ALIASES[field] || [];
    return normalizedKeys.some((normalizedKey) =>
      aliases.some((alias) => normalizeLookupKey(alias) === normalizedKey) ||
      keywords.some((keyword) => normalizedKey.includes(keyword)),
    );
  });
};

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
