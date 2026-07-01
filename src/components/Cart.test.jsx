import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Cart from './Cart';

const cart = [
  { id: 1, name: 'Bruschetta', emoji: '🍞', price: 6.5, quantity: 1 },
  { id: 2, name: 'Soup of the Day', emoji: '🍲', price: 5.0, quantity: 1 },
];

describe('Cart remove button', () => {
  it('calls onRemove with the id of the clicked item, not the whole cart', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<Cart cart={cart} onRemove={onRemove} onCheckout={() => {}} />);

    const bruschettaItem = screen.getByText('Bruschetta').closest('.cart-item');
    await user.click(within(bruschettaItem).getByRole('button'));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
