// Logique pure du programme de fidélité : pas de React, pas de localStorage,
// pour rester facilement testable en isolation.

export const REDEMPTION_TIER_POINTS = 100;
export const REDEMPTION_TIER_VALUE = 5; // €
export const EXPIRY_MONTHS = 12;

// US#1 — 1€ payé = 1 point, calculé sur le montant réellement payé (après réduction éventuelle)
export function calculatePointsEarned(amountPaid) {
  return Math.max(0, Math.round(amountPaid));
}

// US#2 — le client est-il éligible à une conversion, et combien de points lui manque-t-il ?
export function getRedemptionEligibility(pointsBalance) {
  return {
    eligible: pointsBalance >= REDEMPTION_TIER_POINTS,
    missingPoints: Math.max(0, REDEMPTION_TIER_POINTS - pointsBalance),
  };
}

// US#2 + EC#1 — un seul palier de 100 points (5€) convertible par commande, quel que soit le solde
export function computeRedemption(pointsBalance, orderTotal) {
  if (pointsBalance < REDEMPTION_TIER_POINTS) {
    return { applied: false, discountAmount: 0, pointsUsed: 0, remainingBalance: pointsBalance };
  }

  // La réduction ne peut jamais dépasser le montant de la commande (jamais de commande négative)
  const discountAmount = Math.min(REDEMPTION_TIER_VALUE, orderTotal);
  // Si la commande est plus petite que le palier, seuls les points au prorata de la réduction
  // effectivement appliquée sont déduits ; le reste du solde reste disponible.
  const pointsUsed =
    discountAmount === REDEMPTION_TIER_VALUE
      ? REDEMPTION_TIER_POINTS
      : Math.round((REDEMPTION_TIER_POINTS * discountAmount) / REDEMPTION_TIER_VALUE);

  return {
    applied: true,
    discountAmount,
    pointsUsed,
    remainingBalance: pointsBalance - pointsUsed,
  };
}

// US#1 AC#3 + règle "Remboursements" — retrait de points au prorata du montant remboursé
export function calculateRefundPointsDeduction(order, refundedAmount = order.totalPaid) {
  const clampedRefund = Math.min(Math.max(0, refundedAmount), order.totalPaid);
  if (clampedRefund >= order.totalPaid) {
    // Remboursement total : on retire exactement les points stockés sur la commande,
    // sans recalculer, pour rester exact même si la règle d'arrondi change plus tard.
    return order.pointsEarned;
  }
  return Math.round(order.pointsEarned * (clampedRefund / order.totalPaid));
}

// Différence en mois calendaires (année*12+mois), pour éviter les dérives liées aux mois de 28/30/31 jours
export function monthsBetween(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

// Expiration après 12 mois sans commande
export function arePointsExpired(lastOrderDate, now = new Date()) {
  return monthsBetween(new Date(lastOrderDate), now) >= EXPIRY_MONTHS;
}
