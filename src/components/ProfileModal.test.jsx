import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProfileModal from './ProfileModal';

const orders = [
  {
    id: 'DL-1',
    date: '2026-06-01T10:00:00.000Z',
    totalPaid: 20,
    discountApplied: 0,
    pointsEarned: 20,
    pointsUsed: 0,
    refunded: false,
    refundedAmount: 0,
  },
  {
    id: 'DL-2',
    date: '2026-05-01T10:00:00.000Z',
    totalPaid: 16.8,
    discountApplied: 0,
    pointsEarned: 17,
    pointsUsed: 0,
    refunded: true,
    refundedAmount: 16.8,
  },
];

describe('ProfileModal', () => {
  it('displays the current points balance', () => {
    render(<ProfileModal pointsBalance={150} orders={[]} onRefund={() => {}} onClose={() => {}} />);
    expect(screen.getByText('150 pts')).toBeInTheDocument();
  });

  it('shows the missing-points hint when balance is below the redemption tier', () => {
    render(<ProfileModal pointsBalance={80} orders={[]} onRefund={() => {}} onClose={() => {}} />);
    expect(screen.getByText('20 more points until your next reward')).toBeInTheDocument();
  });

  it('does not show the missing-points hint when eligible', () => {
    render(<ProfileModal pointsBalance={150} orders={[]} onRefund={() => {}} onClose={() => {}} />);
    expect(screen.queryByText(/more points until your next reward/)).not.toBeInTheDocument();
  });

  it('lists past orders with date, total paid and points earned', () => {
    render(<ProfileModal pointsBalance={20} orders={orders} onRefund={() => {}} onClose={() => {}} />);
    expect(screen.getByText('€20.00 · 20 pts')).toBeInTheDocument();
    expect(screen.getByText('€16.80 · 17 pts')).toBeInTheDocument();
  });

  it('calls onRefund with the order id when Refund is clicked', async () => {
    const user = userEvent.setup();
    const onRefund = vi.fn();
    render(<ProfileModal pointsBalance={20} orders={orders} onRefund={onRefund} onClose={() => {}} />);

    const firstOrderRow = screen.getByText('€20.00 · 20 pts').closest('.loyalty-order-row');
    await user.click(within(firstOrderRow).getByRole('button', { name: 'Refund' }));

    expect(onRefund).toHaveBeenCalledWith('DL-1');
  });

  it('shows a Refunded tag instead of the Refund button for an already-refunded order', () => {
    render(<ProfileModal pointsBalance={20} orders={orders} onRefund={() => {}} onClose={() => {}} />);
    const refundedRow = screen.getByText('€16.80 · 17 pts').closest('.loyalty-order-row');
    expect(within(refundedRow).getByText('Refunded')).toBeInTheDocument();
    expect(within(refundedRow).queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });

  it('closes when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ProfileModal pointsBalance={0} orders={[]} onRefund={() => {}} onClose={onClose} />);

    await user.click(container.querySelector('.modal-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
