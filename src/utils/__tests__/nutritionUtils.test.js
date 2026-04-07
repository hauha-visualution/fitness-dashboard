import { describe, it, expect } from 'vitest';
import {
  normalizeDateForDateInput,
  createDefaultNutritionTargets,
  ensureNutritionTargets,
  createDefaultNutritionPlan,
  ensureNutritionPlan,
  createDefaultNutritionPrep,
  ensureNutritionPrep,
  createDefaultNutritionCheckin,
  countFilledNutritionFields,
  buildPhoneCandidates,
  DAY_LABELS,
  NUTRITION_ARCHIVE_FIELDS,
} from '../nutritionUtils';

// ─── DAY_LABELS ───────────────────────────────────────────────────────────────
describe('DAY_LABELS', () => {
  it('contains 7 entries', () => {
    expect(DAY_LABELS).toHaveLength(7);
  });
});

// ─── normalizeDateForDateInput ────────────────────────────────────────────────
describe('normalizeDateForDateInput', () => {
  it('passes through ISO format unchanged', () => {
    expect(normalizeDateForDateInput('2025-06-15')).toBe('2025-06-15');
  });

  it('converts MM/DD/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDateForDateInput('06/15/2025')).toBe('2025-06-15');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeDateForDateInput('')).toBe('');
    expect(normalizeDateForDateInput(null)).toBe('');
  });
});

// ─── createDefaultNutritionTargets ────────────────────────────────────────────
describe('createDefaultNutritionTargets', () => {
  it('returns an object with all required keys empty', () => {
    const targets = createDefaultNutritionTargets();
    expect(targets).toHaveProperty('calories');
    expect(targets).toHaveProperty('protein');
    expect(targets).toHaveProperty('carbs');
    expect(targets).toHaveProperty('fat');
    expect(targets).toHaveProperty('water');
    expect(targets).toHaveProperty('stepTarget');
  });
});

// ─── ensureNutritionTargets ───────────────────────────────────────────────────
describe('ensureNutritionTargets', () => {
  it('merges provided values over defaults', () => {
    const result = ensureNutritionTargets({ calories: '2000', protein: '150' });
    expect(result.calories).toBe('2000');
    expect(result.protein).toBe('150');
    expect(result.fat).toBe('');  // default for unset fields
  });

  it('handles null/undefined gracefully', () => {
    const result = ensureNutritionTargets(null);
    expect(result.calories).toBe('');
  });
});

// ─── createDefaultNutritionPlan ──────────────────────────────────────────────
describe('createDefaultNutritionPlan', () => {
  it('creates 7 day entries matching DAY_LABELS', () => {
    const plan = createDefaultNutritionPlan();
    expect(plan.days).toHaveLength(7);
    expect(plan.days[0].day).toBe(DAY_LABELS[0]);
    expect(plan.days[6].day).toBe(DAY_LABELS[6]);
  });

  it('each day has meal slot keys', () => {
    const { days } = createDefaultNutritionPlan();
    days.forEach((day) => {
      expect(day).toHaveProperty('breakfast');
      expect(day).toHaveProperty('lunch');
      expect(day).toHaveProperty('dinner');
      expect(day).toHaveProperty('snack');
    });
  });
});

// ─── ensureNutritionPlan ──────────────────────────────────────────────────────
describe('ensureNutritionPlan', () => {
  it('merges incoming days while preserving day labels', () => {
    const incoming = {
      focus: 'Cut',
      days: [{ breakfast: 'Eggs' }],
    };
    const result = ensureNutritionPlan(incoming);
    expect(result.focus).toBe('Cut');
    expect(result.days[0].breakfast).toBe('Eggs');
    expect(result.days[0].day).toBe(DAY_LABELS[0]);
    // Later days should still exist
    expect(result.days).toHaveLength(7);
  });

  it('handles null gracefully', () => {
    const result = ensureNutritionPlan(null);
    expect(result.days).toHaveLength(7);
  });
});

// ─── createDefaultNutritionPrep ──────────────────────────────────────────────
describe('createDefaultNutritionPrep', () => {
  it('has the required prep fields', () => {
    const prep = createDefaultNutritionPrep();
    expect(prep).toHaveProperty('shoppingList');
    expect(prep).toHaveProperty('batchCooking');
    expect(prep).toHaveProperty('pantryStaples');
    expect(prep).toHaveProperty('eatingOutRules');
    expect(prep).toHaveProperty('coachNotes');
  });
});

// ─── ensureNutritionPrep ──────────────────────────────────────────────────────
describe('ensureNutritionPrep', () => {
  it('merges values over defaults', () => {
    const result = ensureNutritionPrep({ shoppingList: 'Chicken, Oats' });
    expect(result.shoppingList).toBe('Chicken, Oats');
    expect(result.batchCooking).toBe('');
  });
});

// ─── createDefaultNutritionCheckin ────────────────────────────────────────────
describe('createDefaultNutritionCheckin', () => {
  it('includes today as checkin_date', () => {
    const today = new Date().toISOString().slice(0, 10);
    const checkin = createDefaultNutritionCheckin();
    expect(checkin.checkin_date).toBe(today);
  });

  it('has default score values', () => {
    const checkin = createDefaultNutritionCheckin();
    expect(checkin.adherence_score).toBe('4');
    expect(checkin.hunger_score).toBe('3');
  });
});

// ─── countFilledNutritionFields ────────────────────────────────────────────────
describe('countFilledNutritionFields', () => {
  it('counts non-empty fields only', () => {
    const source = {
      cookinghabit: 'Nấu nhà',
      cookingtime: '30 phút',
    };
    const count = countFilledNutritionFields(source);
    expect(count).toBe(2);
  });

  it('returns 0 for empty source', () => {
    expect(countFilledNutritionFields({})).toBe(0);
    expect(countFilledNutritionFields(null)).toBe(0);
  });

  it('returns max equal to total archive fields', () => {
    const allFilled = NUTRITION_ARCHIVE_FIELDS.reduce((acc, f) => {
      acc[f.key] = 'value';
      return acc;
    }, {});
    expect(countFilledNutritionFields(allFilled)).toBe(NUTRITION_ARCHIVE_FIELDS.length);
  });
});

// ─── buildPhoneCandidates ─────────────────────────────────────────────────────
describe('buildPhoneCandidates', () => {
  it('generates Vietnamese phone variants', () => {
    const candidates = buildPhoneCandidates('0901234567');
    expect(candidates).toContain('0901234567');
    expect(candidates).toContain('84901234567');
    expect(candidates).toContain('+84901234567');
  });

  it('handles number with +84 prefix', () => {
    const candidates = buildPhoneCandidates('+84901234567');
    expect(candidates).toContain('0901234567');
  });

  it('returns non-empty array for valid input', () => {
    expect(buildPhoneCandidates('0901234567').length).toBeGreaterThan(1);
  });

  it('handles empty string gracefully', () => {
    const candidates = buildPhoneCandidates('');
    expect(Array.isArray(candidates)).toBe(true);
  });
});
