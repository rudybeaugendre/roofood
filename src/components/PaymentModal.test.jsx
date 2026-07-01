import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentModal from './PaymentModal';

const cart = [{ id: 1, name: 'Classic Burger', emoji: '🍔', price: 14, quantity: 1 }];
// subtotal 14 + tax 20% (2.8) = total 16.8

function makeLoyalty(overrides = {}) {
  return {
    pointsBalance: 0,
    orders: [],
    redemptionEligibility: { eligible: false, missingPoints: 100 },
    previewRedemption: vi.fn(() => ({ applied: false, discountAmount: 0, pointsUsed: 0, remainingBalance: 0 })),
    confirmOrder: vi.fn(),
    refundOrder: vi.fn(),
    ...overrides,
  };
}

async function fillCardForm(user) {
  await user.type(screen.getByPlaceholderText('Jane Smith'), 'Jane Smith');
  await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '4242424242424242');
  await user.type(screen.getByPlaceholderText('MM/YY'), '1229');
  await user.type(screen.getByPlaceholderText('123'), '123');
}

describe('PaymentModal — points crediting timing (EC#3)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not credit any points while on the summary or card steps', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const loyalty = makeLoyalty();
    render(<PaymentModal cart={cart} loyalty={loyalty} onClose={() => {}} onSuccess={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Proceed to Payment' }));
    await fillCardForm(user);

    expect(loyalty.confirmOrder).not.toHaveBeenCalled();
  });

  it('does not credit any points while processing, only after processing completes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const loyalty = makeLoyalty();
    render(<PaymentModal cart={cart} loyalty={loyalty} onClose={() => {}} onSuccess={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Proceed to Payment' }));
    await fillCardForm(user);
    await user.click(screen.getByRole('button', { name: /Pay €/ }));

    vi.advanceTimersByTime(1000);
    expect(loyalty.confirmOrder).not.toHaveBeenCalled();
  });

  it('credits points exactly once when payment succeeds', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const loyalty = makeLoyalty();
    render(<PaymentModal cart={cart} loyalty={loyalty} onClose={() => {}} onSuccess={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Proceed to Payment' }));
    await fillCardForm(user);
    await user.click(screen.getByRole('button', { name: /Pay €/ }));

    vi.advanceTimersByTime(2000);
    expect(loyalty.confirmOrder).toHaveBeenCalledTimes(1);
    expect(loyalty.confirmOrder).toHaveBeenCalledWith(16.8, expect.objectContaining({ applied: false }), expect.any(String));
  });

  it('keeps showing the discount applied at payment time even if the loyalty balance changes afterwards', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const loyaltyAtPaymentTime = makeLoyalty({
      redemptionEligibility: { eligible: true, missingPoints: 0 },
      previewRedemption: vi.fn(() => ({ applied: true, discountAmount: 5, pointsUsed: 100, remainingBalance: 50 })),
    });
    const { rerender } = render(
      <PaymentModal cart={cart} loyalty={loyaltyAtPaymentTime} onClose={() => {}} onSuccess={() => {}} />
    );

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Proceed to Payment' }));
    await fillCardForm(user);
    await user.click(screen.getByRole('button', { name: /Pay €/ }));

    // Simule le re-render déclenché par le parent une fois confirmOrder appliqué : le solde a
    // baissé sous le seuil, previewRedemption ne renverrait donc plus de réduction si on le
    // recalculait en direct.
    const loyaltyAfterConfirm = makeLoyalty({
      redemptionEligibility: { eligible: false, missingPoints: 88 },
      previewRedemption: vi.fn(() => ({ applied: false, discountAmount: 0, pointsUsed: 0, remainingBalance: 12 })),
    });
    rerender(<PaymentModal cart={cart} loyalty={loyaltyAfterConfirm} onClose={() => {}} onSuccess={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Le total payé doit rester celui figé au clic sur Pay (16.80 - 5 = 11.80), pas 16.80
    expect(screen.getByText('€11.80')).toBeInTheDocument();
  });
});

describe('PaymentModal — points redemption UI', () => {
  it('shows the redemption checkbox disabled with the missing-points message when not eligible', () => {
    const loyalty = makeLoyalty({ redemptionEligibility: { eligible: false, missingPoints: 20 } });
    render(<PaymentModal cart={cart} loyalty={loyalty} onClose={() => {}} onSuccess={() => {}} />);

    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByText('20 more points until your next reward')).toBeInTheDocument();
  });

  it('applies the discount to the displayed and charged total when redemption is toggled on', async () => {
    const user = userEvent.setup();
    const loyalty = makeLoyalty({
      redemptionEligibility: { eligible: true, missingPoints: 0 },
      previewRedemption: vi.fn(() => ({ applied: true, discountAmount: 5, pointsUsed: 100, remainingBalance: 50 })),
    });
    render(<PaymentModal cart={cart} loyalty={loyalty} onClose={() => {}} onSuccess={() => {}} />);

    await user.click(screen.getByRole('checkbox'));

    // 16.80 - 5 = 11.80
    expect(screen.getByText('€11.80')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Proceed to Payment' })).toBeInTheDocument();
  });

  it('never lets the charged total go negative for small carts', async () => {
    const user = userEvent.setup();
    const smallCart = [{ id: 2, name: 'Soup of the Day', emoji: '🍲', price: 5, quantity: 1 }];
    const loyalty = makeLoyalty({
      redemptionEligibility: { eligible: true, missingPoints: 0 },
      previewRedemption: vi.fn(() => ({ applied: true, discountAmount: 6, pointsUsed: 100, remainingBalance: 0 })),
    });
    render(<PaymentModal cart={smallCart} loyalty={loyalty} onClose={() => {}} onSuccess={() => {}} />);

    await user.click(screen.getByRole('checkbox'));

    // subtotal 5 + tax 1 = 6 ; discount capped by loyalty.js at the order total, here mocked at 6 -> final 0
    expect(screen.getByText('€0.00')).toBeInTheDocument();
  });
});
