// src/pages/CartPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CartPage() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoad] = useState({});
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadCart();
  }, [isLoggedIn, navigate]);

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

  const showMsg = (text, type = 'success') => setMsg({ text, type });

  const handleRemove = async (listingId) => {
    try {
      await api.removeFromCart(listingId);
      setCartItems((prev) => prev.filter(i => i.listing_id !== listingId));
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
      // Remove from UI
      setCartItems((prev) => prev.filter(i => i.listing_id !== item.listing_id));
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setActLoad(prev => ({ ...prev, [item.listing_id]: false }));
    }
  };

  if (loading) {
    return <div className="page container"><div className="spinner" /></div>;
  }

  return (
    <main className="page profile-page">
      <div className="container">
        <header className="profile-header card">
          <div className="profile-info">
            <h1 className="profile-name">Your Cart</h1>
            <p className="profile-balance">
              Total Items: <span className="balance-amount">{cartItems.length}</span>
            </p>
          </div>
        </header>

        {msg.text && (
          <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
            {msg.text}
          </div>
        )}

        <div className="card">
          {!cartItems.length ? (
            <p className="empty-state">Your cart is empty.</p>
          ) : (
            <ul className="item-list">
              {cartItems.map(item => {
                const isRent = item.type === 'rent';
                const price = isRent ? item.daily_rent_fee : item.price;
                const isUnavailable = item.status === 'rented' || item.status === 'sold';
                const isRented = item.status === 'rented';

                return (
                  <li key={item.listing_id} className="list-item" style={{ alignItems: 'center' }}>
                    <div className="item-main">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className={`badge ${isRent ? 'badge-rent' : 'badge-sale'}`}>
                          {isRent ? 'Rent' : 'Buy'}
                        </span>
                        {isUnavailable && (
                          <span className="badge badge-danger">
                            {isRented ? 'Temporarily Unavailable' : 'Unavailable'}
                          </span>
                        )}
                      </div>
                      <h3 style={{ cursor: 'pointer', color: 'var(--clr-primary)' }} onClick={() => navigate(`/listings/${item.listing_id}`)}>
                        {item.title}
                      </h3>
                      <p className="item-author">{item.author}</p>
                    </div>
                    
                    <div className="item-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <div className="detail-price">
                        <span style={{ fontSize: '1.2rem', verticalAlign: 'super' }}>$</span>
                        {parseFloat(price).toFixed(2)}
                        {isRent && <span style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)', fontWeight: 400 }}>/day</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        </div>
      </div>
    </main>
  );
}
