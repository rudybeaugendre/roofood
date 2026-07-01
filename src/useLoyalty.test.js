import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLoyalty } from './useLoyalty';
import { getTrackedEvents, clearTrackedEvents } from './analytics';

beforeEach(() => {
  window.localStorage.clear();
  clearTrackedEvents();
});

describe('useLoyalty', () => {
  it('starts at 0 points and empty orders on first run', () => {
    const { result } = renderHook(() => useLoyalty());
    expect(result.current.pointsBalance).toBe(0);
    expect(result.current.orders).toEqual([]);
  });

  it('confirmOrder credits points and persists the order record', () => {
    const { result } = renderHook(() => useLoyalty());

    act(() => {
      result.current.confirmOrder(20, { applied: false, discountAmount: 0, pointsUsed: 0 }, 'DL-1');
    });

    expect(result.current.pointsBalance).toBe(20);
    expect(result.current.orders[0]).toMatchObject({ id: 'DL-1', totalPaid: 20, pointsEarned: 20 });
    expect(JSON.parse(window.localStorage.getItem('loyalty_state_v1')).pointsBalance).toBe(20);
  });

  it('confirmOrder deducts redeemed points and credits points on the discounted amount', () => {
    const { result } = renderHook(() => useLoyalty());

    // Seed a balance of 150 first
    act(() => {
      result.current.confirmOrder(150, { applied: false, discountAmount: 0, pointsUsed: 0 }, 'DL-seed');
    });

    act(() => {
      result.current.confirmOrder(15, { applied: true, discountAmount: 5, pointsUsed: 100 }, 'DL-2');
    });

    // 150 (seed) - 100 (redeemed) + 15 (earned on the 15€ actually paid) = 65
    expect(result.current.pointsBalance).toBe(65);
  });

  it('fires loyalty_points_earned with the exact properties', () => {
    const { result } = renderHook(() => useLoyalty());

    act(() => {
      result.current.confirmOrder(20, { applied: false, discountAmount: 0, pointsUsed: 0 }, 'DL-3');
    });

    expect(getTrackedEvents()).toContainEqual(
      expect.objectContaining({
        name: 'loyalty_points_earned',
        properties: { points_amount: 20, order_total: 20, order_id: 'DL-3' },
      })
    );
  });

  it('fires loyalty_points_redeemed only when a redemption was actually applied', () => {
    const { result } = renderHook(() => useLoyalty());

    act(() => {
      result.current.confirmOrder(20, { applied: false, discountAmount: 0, pointsUsed: 0 }, 'DL-4');
    });
    expect(getTrackedEvents().some((e) => e.name === 'loyalty_points_redeemed')).toBe(false);

    act(() => {
      result.current.confirmOrder(15, { applied: true, discountAmount: 5, pointsUsed: 100 }, 'DL-5');
    });
    expect(getTrackedEvents()).toContainEqual(
      expect.objectContaining({
        name: 'loyalty_points_redeemed',
        properties: { points_used: 100, discount_amount: 5, order_id: 'DL-5' },
      })
    );
  });

  it('refundOrder removes all points on a full refund', () => {
    const { result } = renderHook(() => useLoyalty());

    act(() => {
      result.current.confirmOrder(20, { applied: false, discountAmount: 0, pointsUsed: 0 }, 'DL-6');
    });
    act(() => {
      result.current.refundOrder('DL-6');
    });

    expect(result.current.pointsBalance).toBe(0);
    expect(result.current.orders[0]).toMatchObject({ refunded: true, refundedAmount: 20 });
  });

  it('refundOrder removes prorated points on a partial refund', () => {
    const { result } = renderHook(() => useLoyalty());

    act(() => {
      result.current.confirmOrder(20, { applied: false, discountAmount: 0, pointsUsed: 0 }, 'DL-7');
    });
    act(() => {
      result.current.refundOrder('DL-7', 10);
    });

    expect(result.current.pointsBalance).toBe(10);
  });

  it('persists across a fresh hook instance (simulating a page reload)', () => {
    const first = renderHook(() => useLoyalty());
    act(() => {
      first.result.current.confirmOrder(20, { applied: false, discountAmount: 0, pointsUsed: 0 }, 'DL-8');
    });
    first.unmount();

    const second = renderHook(() => useLoyalty());
    expect(second.result.current.pointsBalance).toBe(20);
    expect(second.result.current.orders).toHaveLength(1);
  });

  it('zeroes the balance and fires loyalty_points_expired when the last order is over 12 months old', () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    window.localStorage.setItem(
      'loyalty_state_v1',
      JSON.stringify({
        pointsBalance: 42,
        orders: [{ id: 'DL-old', date: oldDate.toISOString(), totalPaid: 42, pointsEarned: 42, refunded: false, refundedAmount: 0 }],
      })
    );

    const { result } = renderHook(() => useLoyalty());

    expect(result.current.pointsBalance).toBe(0);
    expect(getTrackedEvents()).toContainEqual(
      expect.objectContaining({ name: 'loyalty_points_expired', properties: expect.objectContaining({ points_expired: 42 }) })
    );
  });
});
