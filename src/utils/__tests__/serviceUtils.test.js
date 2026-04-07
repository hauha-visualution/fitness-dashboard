import { describe, it, expect } from 'vitest';
import {
  serializeServiceMeta,
  parseServiceMeta,
  getServiceTypeConfig,
  getServiceTypeLabel,
  getServiceTotalLabel,
  serializeServiceBooking,
  parseServiceBooking,
  buildMealPrepPaymentDetail,
  SERVICE_NOTE_PREFIX,
  SERVICE_BOOKING_PREFIX,
} from '../serviceUtils';

// ─── serializeServiceMeta / parseServiceMeta ─────────────────────────────────
describe('serializeServiceMeta + parseServiceMeta round-trip', () => {
  it('serializes and re-parses training meta', () => {
    const meta = { serviceType: 'training', serviceDetail: 'Phase 1', coachNote: 'Focus form' };
    const serialized = serializeServiceMeta(meta);

    expect(serialized.startsWith(SERVICE_NOTE_PREFIX)).toBe(true);

    const parsed = parseServiceMeta(serialized);
    expect(parsed.serviceType).toBe('training');
    expect(parsed.serviceDetail).toBe('Phase 1');
    expect(parsed.coachNote).toBe('Focus form');
  });

  it('serializes and re-parses stretching meta', () => {
    const meta = { serviceType: 'stretching', serviceDetail: 'Hip mobility' };
    const result = parseServiceMeta(serializeServiceMeta(meta));
    expect(result.serviceType).toBe('stretching');
    expect(result.serviceDetail).toBe('Hip mobility');
  });

  it('serializes mealPrepItems correctly', () => {
    const items = [{ foodGroup: 'Protein', productName: 'Ức gà', unit: 'kg', quantity: '1', amount: 80000 }];
    const meta = { serviceType: 'meal_prep', mealPrepItems: items };
    const parsed = parseServiceMeta(serializeServiceMeta(meta));
    expect(parsed.mealPrepItems).toHaveLength(1);
    expect(parsed.mealPrepItems[0].productName).toBe('Ức gà');
    expect(parsed.mealPrepItems[0].amount).toBe(80000);
  });
});

describe('parseServiceMeta edge cases', () => {
  it('handles null/empty input gracefully', () => {
    const result = parseServiceMeta(null);
    expect(result.serviceType).toBe('training');
    expect(Array.isArray(result.mealPrepItems)).toBe(true);
  });

  it('handles plain note (no prefix) as coachNote', () => {
    const result = parseServiceMeta('Just a plain note');
    expect(result.serviceType).toBe('training');
    expect(result.coachNote).toBe('Just a plain note');
  });

  it('handles malformed JSON after prefix', () => {
    const bad = `${SERVICE_NOTE_PREFIX}{broken json`;
    const result = parseServiceMeta(bad);
    expect(result.serviceType).toBe('training');
  });
});

// ─── getServiceTypeConfig ────────────────────────────────────────────────────
describe('getServiceTypeConfig', () => {
  it('returns training config by default', () => {
    const config = getServiceTypeConfig('training');
    expect(config.id).toBe('training');
    expect(config.paymentType).toBe('package');
  });

  it('returns stretching config', () => {
    const config = getServiceTypeConfig('stretching');
    expect(config.id).toBe('stretching');
    expect(config.paymentType).toBe('stretching');
  });

  it('returns meal_prep config', () => {
    const config = getServiceTypeConfig('meal_prep');
    expect(config.id).toBe('meal_prep');
    expect(config.paymentType).toBe('prep_meal');
  });

  it('falls back to training for unknown type', () => {
    const config = getServiceTypeConfig('unknown');
    expect(config.id).toBe('training');
  });
});

// ─── getServiceTypeLabel ──────────────────────────────────────────────────────
describe('getServiceTypeLabel', () => {
  it('returns human-readable labels', () => {
    expect(getServiceTypeLabel('training')).toBe('Training Package');
    expect(getServiceTypeLabel('stretching')).toBe('Stretching');
    expect(getServiceTypeLabel('meal_prep')).toBe('Meal Prep');
  });
});

// ─── getServiceTotalLabel ──────────────────────────────────────────────────────
describe('getServiceTotalLabel', () => {
  it('returns sessions label for training', () => {
    expect(getServiceTotalLabel('training', 10)).toBe('10 included sessions');
  });

  it('returns items label for meal_prep', () => {
    expect(getServiceTotalLabel('meal_prep', 5)).toBe('5 included items');
  });
});

// ─── serializeServiceBooking / parseServiceBooking ────────────────────────────
describe('serializeServiceBooking + parseServiceBooking round-trip', () => {
  it('preserves location and note', () => {
    const booking = { endTime: '10:30', location: 'Studio A', note: 'Bring mat' };
    const serialized = serializeServiceBooking(booking);
    expect(serialized.startsWith(SERVICE_BOOKING_PREFIX)).toBe(true);

    const parsed = parseServiceBooking(serialized);
    expect(parsed.location).toBe('Studio A');
    expect(parsed.note).toBe('Bring mat');
    expect(parsed.endTime).toBe('10:30');
  });
});

describe('parseServiceBooking edge cases', () => {
  it('handles null input', () => {
    const result = parseServiceBooking(null);
    expect(result.location).toBe('');
    expect(result.note).toBe('');
  });

  it('treats plain string as note', () => {
    const result = parseServiceBooking('plain note');
    expect(result.note).toBe('plain note');
  });
});

// ─── buildMealPrepPaymentDetail ───────────────────────────────────────────────
describe('buildMealPrepPaymentDetail', () => {
  it('formats items into numbered lines', () => {
    const items = [
      { foodGroup: 'Protein', productName: 'Ức gà', unit: 'kg', quantity: '1', amount: 80000 },
      { foodGroup: 'Carb', productName: 'Khoai', unit: 'kg', quantity: '0.5', amount: 20000 },
    ];
    const result = buildMealPrepPaymentDetail(items);
    expect(result).toContain('1.');
    expect(result).toContain('Ức gà');
    expect(result).toContain('2.');
    expect(result).toContain('Khoai');
  });

  it('appends coachNote when provided', () => {
    const result = buildMealPrepPaymentDetail([], 'Prep by Saturday');
    expect(result).toContain('Coach note: Prep by Saturday');
  });

  it('returns empty string for empty items and no note', () => {
    expect(buildMealPrepPaymentDetail([], '')).toBe('');
  });
});
