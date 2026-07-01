import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

describe('removing an item from the cart', () => {
  it('only removes the clicked item, leaving the others in the cart', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('heading', { name: 'Bruschetta' }).closest('.dish-card').querySelector('.add-btn'));
    await user.click(screen.getByRole('heading', { name: 'Soup of the Day' }).closest('.dish-card').querySelector('.add-btn'));

    const cart = screen.getByRole('complementary');
    const bruschettaCartItem = within(cart).getByText('Bruschetta').closest('.cart-item');
    await user.click(within(bruschettaCartItem).getByRole('button'));

    expect(within(cart).queryByText('Bruschetta')).not.toBeInTheDocument();
    expect(within(cart).getByText('Soup of the Day')).toBeInTheDocument();
  });
});

describe('adding the same dish twice', () => {
  it('merges into a single line with quantity 2 instead of duplicating the line', async () => {
    const user = userEvent.setup();
    render(<App />);

    const addBruschetta = () =>
      user.click(screen.getByRole('heading', { name: 'Bruschetta' }).closest('.dish-card').querySelector('.add-btn'));
    await addBruschetta();
    await addBruschetta();

    const cart = screen.getByRole('complementary');
    expect(within(cart).getAllByText('Bruschetta')).toHaveLength(1);
    const cartItem = within(cart).getByText('Bruschetta').closest('.cart-item');
    expect(within(cartItem).getByText('x2')).toBeInTheDocument();
    expect(within(cartItem).getByText('€13.00')).toBeInTheDocument();
  });
});

describe('loyalty profile', () => {
  it('does not show a points badge on the profile icon before any order is placed', () => {
    render(<App />);
    const profileBtn = screen.getByRole('button', { name: 'Loyalty profile' });
    expect(within(profileBtn).queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it('opens the profile modal from the header profile icon and shows the points balance after an order', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await user.click(screen.getByRole('heading', { name: 'Classic Burger' }).closest('.dish-card').querySelector('.add-btn'));
    await user.click(screen.getByRole('button', { name: 'Place Order' }));
    await user.click(screen.getByRole('button', { name: 'Proceed to Payment' }));
    await user.type(screen.getByPlaceholderText('Jane Smith'), 'Jane Smith');
    await user.type(screen.getByPlaceholderText('1234 5678 9012 3456'), '4242424242424242');
    await user.type(screen.getByPlaceholderText('MM/YY'), '1229');
    await user.type(screen.getByPlaceholderText('123'), '123');
    await user.click(screen.getByRole('button', { name: /Pay €/ }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    await user.click(screen.getByRole('button', { name: 'Start New Order' }));
    await user.click(screen.getByRole('button', { name: 'Loyalty profile' }));

    // 14€ + 20% tax = 16.80€ payé -> 17 points (arrondi)
    expect(screen.getByText('17 pts')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
