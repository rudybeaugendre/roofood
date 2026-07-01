import { getRedemptionEligibility } from "../loyalty";

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProfileModal({ pointsBalance, orders, onRefund, onClose }) {
  const { eligible, missingPoints } = getRedemptionEligibility(pointsBalance);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">My Loyalty Points</h2>

        <div className="loyalty-balance">{pointsBalance} pts</div>
        {!eligible && (
          <p className="loyalty-redeem-hint">
            {missingPoints} more points until your next reward
          </p>
        )}

        {orders.length === 0 ? (
          <p className="cart-empty">No orders yet.</p>
        ) : (
          <ul className="loyalty-order-list">
            {orders.map((order) => (
              <li key={order.id} className="loyalty-order-row">
                <div className="loyalty-order-details">
                  <span className="loyalty-order-date">{formatDate(order.date)}</span>
                  <span className="loyalty-order-meta">
                    €{order.totalPaid.toFixed(2)} · {order.pointsEarned} pts
                  </span>
                </div>
                {order.refunded ? (
                  <span className="loyalty-refunded-tag">Refunded</span>
                ) : (
                  <button className="modal-btn-secondary" onClick={() => onRefund(order.id)}>
                    Refund
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="modal-actions">
          <button className="modal-btn-primary modal-btn-full" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
