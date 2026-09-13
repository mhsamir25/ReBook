// src/pages/CartPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CartPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoad] = useState({});
  const [msg, setMsg] = useState({ text: '', type: '' });

  const loadCart = async () => {
    setLoading(true);
    try {
      const items = await api.getCart();
      setCartItems(items);
    } catch (err) {
      console.error(err);
      setMsg({ text: 'Failed to load cart.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadCart();
  }, [isLoggedIn, navigate]);

  const showMsg = (text, type = 'success') => setMsg({ text, type });

  const handleRemove = async (listingId) => {
    try {
      await api.removeFromCart(listingId);
      setCartItems(prev => prev.filter(item => item.listing_id !== listingId));
      showMsg('Removed from cart.');
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleCheckout = async (item) => {
    setActLoad(prev => ({ ...prev, [item.listing_id]: true }));
    setMsg({ text: '', type: '' });

    try {
      if (item.type === 'sale') {
        const res = await api.purchase(item.listing_id);
        showMsg(`Purchased! Transaction ID: ${res.txn_id}`);
      } else {
        const res = await api.borrow(item.listing_id);
        showMsg(`Borrowed! Record ID: ${res.record_id}`);
      }

      setCartItems(prev => prev.filter(cartItem => cartItem.listing_id !== item.listing_id));
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setActLoad(prev => ({ ...prev, [item.listing_id]: false }));
    }
  };

  if (loading) {
    return (
      <main className="page profile-page">
        <div className="container">
          <div className="spinner" />
        </div>
      </main>
    );
  }

  return (
    <main className="page profile-page">
      <div className="container compact-container">
        <header className="page-header">
          <h1 className="page-title">Your Cart</h1>
          <p className="page-subtitle">{cartItems.length} saved {cartItems.length === 1 ? 'listing' : 'listings'}</p>
        </header>

        {msg.text && (
          <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'} mt-2`}>
            {msg.text}
          </div>
        )}

        <section className="card cart-card fade-up">
          {!cartItems.length ? (
            <p className="empty-state">Your cart is empty.</p>
          ) : (
            <ul className="item-list compact-list">
              {cartItems.map(item => {
                const isRent = item.type === 'rent';
                const price = isRent ? item.daily_rent_fee : item.price;
                const isUnavailable = item.status === 'rented' || item.status === 'sold';
                const isRented = item.status === 'rented';

                return (
                  <li key={item.listing_id} className="list-item cart-item">
                    <div className="item-main">
                      <div className="listing-card-meta-row">
                        <span className={`badge ${isRent ? 'badge-rent' : 'badge-sale'}`}>
                          {isRent ? 'Rent' : 'Buy'}
                        </span>
                        {isUnavailable && (
                          <span className="badge badge-danger">
                            {isRented ? 'Temporarily Unavailable' : 'Unavailable'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="cart-title-button mt-1"
                        onClick={() => navigate(`/listings/${item.listing_id}`)}
                      >
                        {item.title}
                      </button>
                      <p className="item-author">{item.author}</p>
                    </div>

                    <div className="item-meta">
                      <div className="cart-price">
                        <span className="price-currency">$</span>
                        {Number.parseFloat(price || 0).toFixed(2)}
                        {isRent && <span className="price-period">/day</span>}
                      </div>

                      <div className="cart-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleRemove(item.listing_id)}>
                          Remove
                        </button>
                        {!isUnavailable && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleCheckout(item)}
                            disabled={actLoading[item.listing_id]}
                          >
                            {actLoading[item.listing_id] ? <span className="spinner spinner-sm" /> : 'Checkout'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
