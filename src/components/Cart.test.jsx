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

describe('Cart totals', () => {
  it('multiplies each item by its quantity in the subtotal', () => {
    const cartWithQuantity = [
      { id: 1, name: 'Bruschetta', emoji: '🍞', price: 6.5, quantity: 2 },
    ];
    render(<Cart cart={cartWithQuantity} onRemove={() => {}} onCheckout={() => {}} />);

    const subtotalRow = screen.getByText('Subtotal').closest('.cart-totals-row');
    // 6.50 x 2 = 13.00, pas 6.50 (le sous-total doit tenir compte de la quantité, pas juste le prix unitaire)
    expect(within(subtotalRow).getByText('€13.00')).toBeInTheDocument();
  });

  it('displays a tax label that matches the actual tax rate applied', () => {
    const cartWithItem = [
      { id: 1, name: 'Bruschetta', emoji: '🍞', price: 10, quantity: 1 },
    ];
    render(<Cart cart={cartWithItem} onRemove={() => {}} onCheckout={() => {}} />);

    // Le composant applique 20% (subtotal * 0.20) : l'étiquette doit dire "Tax (20%)", pas "Tax (10%)"
    expect(screen.getByText('Tax (20%)')).toBeInTheDocument();
    expect(screen.getByText('€2.00')).toBeInTheDocument();
  });
});
