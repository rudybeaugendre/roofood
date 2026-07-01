import { describe, expect, it } from 'vitest';
import {
  calculatePointsEarned,
  getRedemptionEligibility,
  computeRedemption,
  calculateRefundPointsDeduction,
  arePointsExpired,
} from './loyalty';

describe('calculatePointsEarned', () => {
  it('awards 20 points for a 20€ order with no discount', () => {
    expect(calculatePointsEarned(20)).toBe(20);
  });

  it('awards 15 points for a 20€ order after a 5€ points discount is applied', () => {
    expect(calculatePointsEarned(15)).toBe(15);
  });

  it('never returns negative points', () => {
    expect(calculatePointsEarned(0)).toBe(0);
  });
});

describe('getRedemptionEligibility', () => {
  it('reports the exact missing points when balance is 80', () => {
    expect(getRedemptionEligibility(80)).toEqual({ eligible: false, missingPoints: 20 });
  });

  it('is disabled when balance is under 100', () => {
    expect(getRedemptionEligibility(99).eligible).toBe(false);
  });

  it('is eligible at exactly 100 points', () => {
    expect(getRedemptionEligibility(100).eligible).toBe(true);
  });
});

describe('computeRedemption', () => {
  it('applies a 5€ discount and leaves 50 points when balance is 150', () => {
    expect(computeRedemption(150, 20)).toEqual({
      applied: true,
      discountAmount: 5,
      pointsUsed: 100,
      remainingBalance: 50,
    });
  });

  it('only redeems a single 100-point tier when balance is 250, leaving 150 points', () => {
    const result = computeRedemption(250, 20);
    expect(result.pointsUsed).toBe(100);
    expect(result.remainingBalance).toBe(150);
  });

  it('caps the discount at the order total and prorates points when order is below 5€', () => {
    expect(computeRedemption(120, 3.2)).toEqual({
      applied: true,
      discountAmount: 3.2,
      pointsUsed: 64,
      remainingBalance: 56,
    });
  });

  it('does not apply any discount when balance is below 100', () => {
    expect(computeRedemption(80, 20).applied).toBe(false);
  });
});

describe('calculateRefundPointsDeduction', () => {
  it('removes all points earned on a full refund', () => {
    expect(calculateRefundPointsDeduction({ totalPaid: 20, pointsEarned: 20 }, 20)).toBe(20);
  });

  it('removes all points when refundedAmount is omitted (defaults to full)', () => {
    expect(calculateRefundPointsDeduction({ totalPaid: 20, pointsEarned: 20 })).toBe(20);
  });

  it('prorates points removed on a partial refund', () => {
    expect(calculateRefundPointsDeduction({ totalPaid: 20, pointsEarned: 20 }, 10)).toBe(10);
  });
});

describe('arePointsExpired', () => {
  it('returns false when the last order was less than 12 months ago', () => {
    expect(arePointsExpired(new Date('2026-01-01'), new Date('2026-07-01'))).toBe(false);
  });

  it('returns true when the last order was 12+ months ago', () => {
    expect(arePointsExpired(new Date('2025-06-01'), new Date('2026-07-01'))).toBe(true);
  });
});
