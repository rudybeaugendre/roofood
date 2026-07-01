import { useState } from 'react';
import {
  getRedemptionEligibility,
  computeRedemption,
  calculatePointsEarned,
  calculateRefundPointsDeduction,
  arePointsExpired,
} from './loyalty';
import { trackEvent } from './analytics';

const STORAGE_KEY = 'loyalty_state_v1';
const USER_ID_KEY = 'loyalty_user_id';

function readState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pointsBalance: 0, orders: [] };
    const parsed = JSON.parse(raw);
    return { pointsBalance: parsed.pointsBalance ?? 0, orders: parsed.orders ?? [] };
  } catch {
    return { pointsBalance: 0, orders: [] };
  }
}

function writeState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getUserId() {
  let userId = window.localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    window.localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// Pas de vrai batch/cron dans une SPA statique : on vérifie l'expiration à chaque
// initialisation du hook (au montage de l'app), simplification assumée de la spec.
function applyExpiry(state) {
  const lastOrder = state.orders[0];
  if (!lastOrder || state.pointsBalance === 0) return state;
  if (arePointsExpired(lastOrder.date)) {
    trackEvent('loyalty_points_expired', { points_expired: state.pointsBalance, user_id: getUserId() });
    return { ...state, pointsBalance: 0 };
  }
  return state;
}

export function useLoyalty() {
  const [state, setState] = useState(() => {
    const initial = applyExpiry(readState());
    writeState(initial);
    return initial;
  });

  const redemptionEligibility = getRedemptionEligibility(state.pointsBalance);

  function previewRedemption(orderTotal) {
    return computeRedemption(state.pointsBalance, orderTotal);
  }

  // Seule fonction qui crédite des points : appelée une unique fois, à la confirmation
  // effective d'une commande (jamais avant, cf. EC#3).
  function confirmOrder(amountPaid, redemption, orderId) {
    const pointsEarned = calculatePointsEarned(amountPaid);
    const pointsUsed = redemption?.applied ? redemption.pointsUsed : 0;
    const discountApplied = redemption?.applied ? redemption.discountAmount : 0;
    const order = {
      id: orderId,
      date: new Date().toISOString(),
      totalPaid: amountPaid,
      discountApplied,
      pointsEarned,
      pointsUsed,
      refunded: false,
      refundedAmount: 0,
    };
    const next = {
      pointsBalance: state.pointsBalance - pointsUsed + pointsEarned,
      orders: [order, ...state.orders],
    };
    writeState(next);
    setState(next);

    trackEvent('loyalty_points_earned', { points_amount: pointsEarned, order_total: amountPaid, order_id: orderId });
    if (redemption?.applied) {
      trackEvent('loyalty_points_redeemed', {
        points_used: redemption.pointsUsed,
        discount_amount: redemption.discountAmount,
        order_id: orderId,
      });
    }
    return order;
  }

  function refundOrder(orderId, refundedAmount) {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || order.refunded) return;
    const amount = refundedAmount ?? order.totalPaid;
    const pointsToRemove = calculateRefundPointsDeduction(order, amount);
    const next = {
      pointsBalance: Math.max(0, state.pointsBalance - pointsToRemove),
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, refunded: true, refundedAmount: amount } : o)),
    };
    writeState(next);
    setState(next);
  }

  return {
    pointsBalance: state.pointsBalance,
    orders: state.orders,
    redemptionEligibility,
    previewRedemption,
    confirmOrder,
    refundOrder,
  };
}
