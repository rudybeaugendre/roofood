import { useState } from "react";
import { dishes, deliveryInfo } from "./data";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import PaymentModal from "./components/PaymentModal";
import ProfileModal from "./components/ProfileModal";
import { useLoyalty } from "./useLoyalty";
import "./App.css";

export default function App() {
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showPayment, setShowPayment] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const loyalty = useLoyalty();

  function addToCart(dish) {
    // Si le plat est déjà dans le panier, on augmente sa quantité au lieu de dupliquer la ligne
    const existing = cart.find((item) => item.id === dish.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }
    setCart([...cart, { ...dish, quantity: 1 }]);
  }

  function removeFromCart(id) {
    // On garde tous les articles SAUF celui dont l'id correspond (et non l'inverse)
    setCart(cart.filter((item) => item.id !== id));
  }

  const cartCount = cart.length;

  return (
    <div className="app">
      <header className="app-header">
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <img src="/deliveroo-logo.png" alt="Deliveroo" height="36" />
          <h1>roo<span style={{color:"#1a271f"}}>food</span></h1>
          <span className="delivery-eta">
            <span className="eta-dot" />
            <span className="eta-icon">🛵</span>
            Delivery in {deliveryInfo.etaMin}–{deliveryInfo.etaMax} min
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
          <button className="profile-icon-btn" onClick={() => setShowProfile(true)} aria-label="Loyalty profile">
            <span className="profile-icon">⭐</span>
            {loyalty.pointsBalance > 0 && <span className="cart-badge">{loyalty.pointsBalance}</span>}
          </button>
          <div className="cart-badge-wrapper">
            <span className="cart-icon">🛒</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Menu
          dishes={dishes}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
        />
        <Cart cart={cart} onRemove={removeFromCart} onCheckout={() => setShowPayment(true)} />
      </main>
      {showPayment && (
        <PaymentModal
          cart={cart}
          loyalty={loyalty}
          onClose={() => setShowPayment(false)}
          onSuccess={() => { setCart([]); setShowPayment(false); }}
        />
      )}
      {showProfile && (
        <ProfileModal
          pointsBalance={loyalty.pointsBalance}
          orders={loyalty.orders}
          onRefund={loyalty.refundOrder}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
