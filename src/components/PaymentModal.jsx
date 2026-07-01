import { useState, useEffect } from "react";

function generateOrderNumber() {
  return "DL-" + Math.floor(10000 + Math.random() * 90000);
}

export default function PaymentModal({ cart, loyalty, onClose, onSuccess }) {
  // Multiplier par la quantité, sinon le sous-total ignore les articles ajoutés plusieurs fois
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  const [step, setStep] = useState("summary");
  const [orderNumber] = useState(generateOrderNumber);
  const [orderTime] = useState(() => new Date());
  const [form, setForm] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [redeemPoints, setRedeemPoints] = useState(false);
  // Figé au clic sur "Pay" : une fois la commande confirmée, le solde de points change
  // (confirmOrder crédite/débite), donc on ne peut plus se fier à un recalcul live de la
  // réduction pour l'étape "processing"/"success" — on fige l'aperçu tel qu'il était au paiement.
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Aperçu seulement : aucun point n'est débité/crédité tant que la commande n'est pas confirmée (EC#3)
  const redemption = redeemPoints
    ? loyalty.previewRedemption(total)
    : { applied: false, discountAmount: 0, pointsUsed: 0 };
  const finalTotal = total - redemption.discountAmount;

  function handlePay() {
    setConfirmedOrder({ finalTotal, redemption });
    setStep("processing");
  }

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => {
      // Les points ne sont crédités/débités qu'ici, à la confirmation effective du paiement (EC#3)
      loyalty.confirmOrder(confirmedOrder.finalTotal, confirmedOrder.redemption, orderNumber);
      setStep("success");
    }, 2000);
    return () => clearTimeout(timer);
  }, [step]);

  function handleOverlayClick() {
    if (step !== "processing") onClose();
  }

  function handleNumberChange(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
    setForm((f) => ({ ...f, number: formatted }));
  }

  function handleExpiryChange(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    const formatted = raw.length > 2 ? raw.slice(0, 2) + "/" + raw.slice(2) : raw;
    setForm((f) => ({ ...f, expiry: formatted }));
  }

  const canPay =
    form.name.trim() &&
    form.number.replace(/\s/g, "").length === 16 &&
    form.expiry.length === 5 &&
    form.cvv.length >= 3;

  const formattedTime = orderTime.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {step === "summary" && (
          <div className="modal-step">
            <h2 className="modal-title">Order Summary</h2>
            <ul className="modal-item-list">
              {cart.map((item, i) => (
                <li key={i} className="modal-item-row">
                  <span className="modal-item-emoji">{item.emoji}</span>
                  <span className="modal-item-name">{item.name}</span>
                  <span className="modal-item-qty">x{item.quantity}</span>
                  <span className="modal-item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className="loyalty-redeem-row">
              <input
                type="checkbox"
                id="redeem-points"
                checked={redeemPoints}
                disabled={!loyalty.redemptionEligibility.eligible}
                onChange={(e) => setRedeemPoints(e.target.checked)}
              />
              <label htmlFor="redeem-points">Use 100 points for €5 off</label>
            </div>
            {!loyalty.redemptionEligibility.eligible && (
              <p className="loyalty-redeem-hint">
                {loyalty.redemptionEligibility.missingPoints} more points until your next reward
              </p>
            )}

            <div className="modal-totals">
              <div className="modal-totals-row">
                <span>Subtotal</span><span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="modal-totals-row">
                <span>Tax (20%)</span><span>€{tax.toFixed(2)}</span>
              </div>
              {redemption.applied && (
                <div className="modal-totals-row">
                  <span>Points discount</span><span>-€{redemption.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="modal-totals-row modal-totals-total">
                <span>Total</span><span>€{finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={onClose}>Cancel</button>
              <button className="modal-btn-primary" onClick={() => setStep("card")}>
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {step === "card" && (
          <div className="modal-step">
            <h2 className="modal-title">Payment Details</h2>
            <div className="card-form">
              <label className="card-label">
                Name on card
                <input
                  className="card-input"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="card-label">
                Card number
                <input
                  className="card-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={form.number}
                  onChange={handleNumberChange}
                />
              </label>
              <div className="card-row">
                <label className="card-label">
                  Expiry
                  <input
                    className="card-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={form.expiry}
                    onChange={handleExpiryChange}
                  />
                </label>
                <label className="card-label">
                  CVV
                  <input
                    className="card-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    maxLength={4}
                    value={form.cvv}
                    onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setStep("summary")}>Back</button>
              <button
                className="modal-btn-primary"
                disabled={!canPay}
                onClick={handlePay}
              >
                Pay €{finalTotal.toFixed(2)}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="modal-step modal-step-centered">
            <div className="spinner" />
            <p className="processing-title">Processing your payment…</p>
            <p className="processing-subtitle">Please do not close this window.</p>
          </div>
        )}

        {step === "success" && (
          <div className="modal-step modal-step-centered">
            <div className="success-icon">✓</div>
            <h2 className="success-title">Payment Successful!</h2>
            <p className="success-meta">Order {orderNumber} · {formattedTime}</p>
            <ul className="modal-item-list modal-item-list--receipt">
              {cart.map((item, i) => (
                <li key={i} className="modal-item-row">
                  <span className="modal-item-emoji">{item.emoji}</span>
                  <span className="modal-item-name">{item.name}</span>
                  <span className="modal-item-qty">x{item.quantity}</span>
                  <span className="modal-item-price">€{(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="modal-totals">
              <div className="modal-totals-row modal-totals-total">
                <span>Total paid</span><span>€{confirmedOrder.finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <button className="modal-btn-primary modal-btn-full" onClick={onSuccess}>
              Start New Order
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
