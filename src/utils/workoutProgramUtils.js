export const WORKOUT_EXERCISE_GROUPS = [
  { id: 'chest', label: 'Chest', sheetLabel: 'CHEST EXCERCISE' },
  { id: 'back', label: 'Back', sheetLabel: 'BACK EXERCISE' },
  { id: 'legs', label: 'Legs', sheetLabel: 'LEG EXERCISE' },
  { id: 'shoulders', label: 'Shoulders', sheetLabel: 'SHOULDER EXERCISE' },
  { id: 'arms', label: 'Arms', sheetLabel: 'ARM EXERCISE' },
  { id: 'core', label: 'Core', sheetLabel: 'CORE EXERCISE' },
  { id: 'cardio', label: 'Cardio', sheetLabel: 'CARDIO' },
  { id: 'recovery', label: 'Recovery', sheetLabel: 'REST DAY - PHUC HOI' },
  { id: 'other', label: 'Other', sheetLabel: 'OTHER' },
];

const GROUP_BY_ID = WORKOUT_EXERCISE_GROUPS.reduce((acc, group) => {
  acc[group.id] = group;
  return acc;
}, {});

const GROUP_ALIASES = {
  chest: 'chest',
  'chest excercise': 'chest',
  'chest exercise': 'chest',
  nguc: 'chest',
  'ngực': 'chest',
  back: 'back',
  lung: 'back',
  'lưng': 'back',
  pull: 'back',
  legs: 'legs',
  leg: 'legs',
  chan: 'legs',
  'chân': 'legs',
  lower: 'legs',
  shoulders: 'shoulders',
  shoulder: 'shoulders',
  vai: 'shoulders',
  arms: 'arms',
  arm: 'arms',
  tay: 'arms',
  biceps: 'arms',
  triceps: 'arms',
  core: 'core',
  abs: 'core',
  bung: 'core',
  'bụng': 'core',
  cardio: 'cardio',
  conditioning: 'cardio',
  recovery: 'recovery',
  rest: 'recovery',
  mobility: 'recovery',
  stretch: 'recovery',
  stretching: 'recovery',
  'rest day - phuc hoi': 'recovery',
};

export const DEFAULT_EXERCISE_GROUP = 'chest';
export const DEFAULT_TEMPO = '2-0-X-0';

const normalizeText = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

export const normalizeExerciseGroup = (value = '') => {
  const normalized = normalizeText(value);
  return GROUP_ALIASES[normalized] || (GROUP_BY_ID[value] ? value : DEFAULT_EXERCISE_GROUP);
};

export const getExerciseGroupLabel = (value = '') => {
  const groupId = normalizeExerciseGroup(value);
  return GROUP_BY_ID[groupId]?.label || GROUP_BY_ID[DEFAULT_EXERCISE_GROUP].label;
};

export const parseRestSeconds = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
};
