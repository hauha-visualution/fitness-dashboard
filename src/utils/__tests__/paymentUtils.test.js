import { describe, it, expect } from 'vitest';
import {
  fmtVND,
  fmtVNDAbridged,
  fmtDate,
  isOutstandingPayment,
  getPaymentStatusMeta,
  getPaymentDisplayTitle,
  getPaymentTitle,
  getToneClasses,
} from '../paymentUtils';

// ─── fmtVND ──────────────────────────────────────────────────────────────────
describe('fmtVND', () => {
  it('formats zero', () => {
    expect(fmtVND(0)).toBe('0 ₫');
  });

  it('formats millions with dots', () => {
    const result = fmtVND(1500000);
    expect(result).toContain('₫');
    expect(result).toContain('1');
  });

  it('handles null/undefined gracefully', () => {
    expect(fmtVND(null)).toBe('0 ₫');
    expect(fmtVND(undefined)).toBe('0 ₫');
  });
});

// ─── fmtVNDAbridged ───────────────────────────────────────────────────────────
describe('fmtVNDAbridged', () => {
  it('shows K for thousands', () => {
    expect(fmtVNDAbridged(500000)).toMatch(/K$/);
  });

  it('shows M for millions', () => {
    expect(fmtVNDAbridged(2000000)).toMatch(/M$/);
  });

  it('shows B for billions', () => {
    expect(fmtVNDAbridged(1_500_000_000)).toMatch(/B$/);
  });

  it('shows raw value below 1000', () => {
    expect(fmtVNDAbridged(500)).toBe('500');
  });

  it('handles zero', () => {
    expect(fmtVNDAbridged(0)).toBe('0');
  });

  it('trims trailing zeros', () => {
    // 2M exactly → '2M', not '2.00M'
    expect(fmtVNDAbridged(2_000_000)).toBe('2M');
  });
});

// ─── fmtDate ─────────────────────────────────────────────────────────────────
describe('fmtDate', () => {
  it('formats ISO date as DD/MM/YYYY', () => {
    expect(fmtDate('2025-03-15')).toBe('15/03/2025');
  });

  it('returns null for empty input', () => {
    expect(fmtDate(null)).toBeNull();
    expect(fmtDate('')).toBeNull();
  });
});

// ─── isOutstandingPayment ─────────────────────────────────────────────────────
describe('isOutstandingPayment', () => {
  it('returns true for pending and submitted', () => {
    expect(isOutstandingPayment('pending')).toBe(true);
    expect(isOutstandingPayment('submitted')).toBe(true);
  });

  it('returns false for paid and cancelled', () => {
    expect(isOutstandingPayment('paid')).toBe(false);
    expect(isOutstandingPayment('cancelled')).toBe(false);
  });
});

// ─── getPaymentStatusMeta ─────────────────────────────────────────────────────
describe('getPaymentStatusMeta', () => {
  it('returns correct label for submitted', () => {
    expect(getPaymentStatusMeta('submitted').label).toBe('Submitted');
    expect(getPaymentStatusMeta('submitted').tone).toBe('amber');
  });

  it('returns correct label for paid', () => {
    expect(getPaymentStatusMeta('paid').label).toBe('Paid');
    expect(getPaymentStatusMeta('paid').tone).toBe('emerald');
  });

  it('returns correct label for cancelled', () => {
    expect(getPaymentStatusMeta('cancelled').label).toBe('Cancelled');
    expect(getPaymentStatusMeta('cancelled').tone).toBe('neutral');
  });

  it('defaults to pending for unknown status', () => {
    expect(getPaymentStatusMeta('unknown').label).toBe('Pending');
    expect(getPaymentStatusMeta(undefined).tone).toBe('red');
  });
});

// ─── getPaymentDisplayTitle ───────────────────────────────────────────────────
describe('getPaymentDisplayTitle', () => {
  it('formats package type with package number', () => {
    expect(getPaymentDisplayTitle({ payment_type: 'package', package_number: 3 }))
      .toBe('Package #03');
  });

  it('formats stretching type', () => {
    expect(getPaymentDisplayTitle({ payment_type: 'stretching', package_number: 1 }))
      .toBe('Stretching #01');
  });

  it('formats prep_meal type', () => {
    expect(getPaymentDisplayTitle({ payment_type: 'prep_meal', package_number: 2 }))
      .toBe('Meal Prep #02');
  });

  it('falls back to title for nutrition/other', () => {
    expect(getPaymentDisplayTitle({ payment_type: 'nutrition', title: 'Custom Plan' }))
      .toBe('Custom Plan');
  });
});

// ─── getPaymentTitle ──────────────────────────────────────────────────────────
describe('getPaymentTitle', () => {
  it('uses title when present', () => {
    expect(getPaymentTitle({ title: 'March Nutrition' })).toBe('March Nutrition');
  });

  it('falls back to package number', () => {
    expect(getPaymentTitle({ package_number: 5 })).toBe('Package #05');
  });

  it('falls back to generic label', () => {
    expect(getPaymentTitle({})).toBe('Service Payment');
  });
});

// ─── getToneClasses ───────────────────────────────────────────────────────────
describe('getToneClasses', () => {
  it('returns an object with badge, panel, icon keys for each tone', () => {
    ['emerald', 'amber', 'neutral', 'red'].forEach((tone) => {
      const result = getToneClasses(tone);
      expect(result).toHaveProperty('badge');
      expect(result).toHaveProperty('panel');
      expect(result).toHaveProperty('icon');
    });
  });

  it('defaults to red for unknown tone', () => {
    const result = getToneClasses('unknown');
    expect(result.badge).toContain('red');
  });
});
