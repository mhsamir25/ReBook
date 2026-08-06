// src/pages/ListingDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ListingDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [listing,   setListing]  = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [actLoading, setActLoad] = useState(false);
  const [msg,       setMsg]      = useState({ text: '', type: '' });

  const [reviewForm, setReviewForm] = useState({ listing_id: id, rating: 5, comment: '' });
  const [showReview, setShowReview] = useState(false);

  // User edit state
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Admin edit state
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState(null);

  useEffect(() => {
    api.getListing(id)
      .then(data => {
        setListing(data);
        setEditForm({
          condition_id: data.condition_rank || 1, // simplified mapping, in reality you'd select condition id
          type: data.type,
          price: data.price || 0,
          daily_rent_fee: data.daily_rent_fee || 0,
          max_lend_days: data.max_lend_days || 1,
        });
        setAdminEditForm({
          isbn: data.isbn,
          title: data.title,
          author: data.author,
        });
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const showMsg = (text, type = 'success') => setMsg({ text, type });

  const handlePurchase = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setActLoad(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.purchase(id);
      showMsg(`Purchased! Transaction ID: ${res.txn_id}`);
      setListing(l => ({ ...l, status: 'sold' }));
    } catch (err) { showMsg(err.message, 'error'); }
    finally { setActLoad(false); }
  };

  const handleBorrow = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setActLoad(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.borrow(id);
      showMsg(`Borrowed! Record ID: ${res.record_id}`);
      setListing(l => ({ ...l, status: 'rented' }));
    } catch (err) { showMsg(err.message, 'error'); }
    finally { setActLoad(false); }
  };

  const handleAddWishlist = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      await api.addWishlist(listing.listing_id);
      showMsg('Added to wishlist!');
    } catch (err) { showMsg(err.message, 'error'); }
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    try {
      await api.addToCart(listing.listing_id);
      showMsg('Added to cart!');
    } catch (err) { showMsg(err.message, 'error'); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      const res = await api.addReview(reviewForm);
      showMsg(`Review submitted! ID: ${res.review_id}`);
      setShowReview(false);
    } catch (err) { showMsg(err.message, 'error'); }
  };

  const handleUpdateListing = async (e) => {
    e.preventDefault();
    try {
      await api.updateListing(id, editForm);
      showMsg('Listing updated successfully!');
      setShowEdit(false);
      // Refresh listing
      const updated = await api.getListing(id);
      setListing(updated);
    } catch (err) { showMsg(err.message, 'error'); }
  };

  const handleAdminUpdateListing = async (e) => {
    e.preventDefault();
    try {
      await api.adminUpdateListing(id, adminEditForm);
      showMsg('Book info updated successfully!');
      setShowAdminEdit(false);
      const updated = await api.getListing(id);
      setListing(updated);
    } catch (err) { showMsg(err.message, 'error'); }
  };

  const handleRemoveListing = async () => {
    if (!window.confirm("Are you sure you want to remove this listing?")) return;
    try {
      await api.removeListingUser(id);
      showMsg('Listing removed successfully!');
      setListing(l => ({ ...l, status: 'removed' }));
    } catch (err) { showMsg(err.message, 'error'); }
  };

  if (loading) return <div className="page container"><div className="spinner" /></div>;
  if (!listing) return null;

  const isRent     = listing.type === 'rent';
  const price      = isRent ? listing.daily_rent_fee : listing.price;
  const isAvailable = listing.status === 'available';

  return (
    <main className="page">
      <div className="container">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }} id="btn-back">
          ← Back
        </button>

        <div className="detail-grid">
          {/* Main info */}
          <div className="card detail-main fade-up">
            <div style={{ marginBottom: '1rem' }}>
              <span className={`badge ${isRent ? 'badge-rent' : 'badge-sale'}`} style={{ marginBottom: '1rem' }}>
                {isRent ? 'For Rent' : 'For Sale'}
              </span>
            </div>
            <h1 className="detail-title">{listing.title}</h1>
            <p className="detail-author">by {listing.author}</p>
            <hr className="divider" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {listing.genre     && <div><div className="text-dim" style={{ fontSize: '0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.25rem' }}>Genre</div><div style={{ fontWeight: 600 }}>{listing.genre}</div></div>}
              {listing.condition && <div><div className="text-dim" style={{ fontSize: '0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.25rem' }}>Condition</div><div style={{ fontWeight: 600 }}>{listing.condition}</div></div>}
              {listing.isbn      && <div><div className="text-dim" style={{ fontSize: '0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.25rem' }}>ISBN</div><div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{listing.isbn}</div></div>}
              {listing.seller_email && <div><div className="text-dim" style={{ fontSize: '0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'0.25rem' }}>Seller</div><div style={{ fontWeight: 600 }}>{listing.seller_email}</div></div>}
            </div>

            {isRent && listing.max_lend_days && (
              <div className="badge badge-rent" style={{ marginBottom: '1rem' }}>
                Max {listing.max_lend_days} days
              </div>
            )}

            {msg.text && (
              <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginTop: '1rem' }}>
                {msg.text}
              </div>
            )}

            {/* Review form toggle */}
            {isLoggedIn && user?.role === 'user' && !isAvailable && (
              <div style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReview(s => !s)} id="btn-toggle-review">
                  Leave a Review
                </button>
                {showReview && (
                  <form onSubmit={handleReview} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }} id="review-form">
                    <div className="form-group">
                      <label className="form-label">Rating (1–5)</label>
                      <input type="number" className="form-input" min={1} max={5} value={reviewForm.rating}
                        onChange={e => setReviewForm(f => ({ ...f, rating: +e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Comment (optional)</label>
                      <textarea className="form-input" rows={3} value={reviewForm.comment}
                        onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} />
                    </div>
                    <button id="btn-submit-review" type="submit" className="btn btn-primary">Submit Review</button>
                  </form>
                )}
              </div>
            )}

            {/* Owner Edit Form */}
            {isLoggedIn && user?.sub === listing.seller_id && isAvailable && (
              <div style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(s => !s)}>
                  Edit Listing
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleRemoveListing} style={{ marginLeft: '0.5rem' }}>
                  Remove Listing
                </button>
                {showEdit && editForm && (
                  <form onSubmit={handleUpdateListing} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <select className="form-input" value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                      </select>
                    </div>
                    {editForm.type === 'sale' && (
                      <div className="form-group">
                        <label className="form-label">Price ($)</label>
                        <input type="number" step="0.01" className="form-input" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} required />
                      </div>
                    )}
                    {editForm.type === 'rent' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">Daily Rent Fee ($)</label>
                          <input type="number" step="0.01" className="form-input" value={editForm.daily_rent_fee} onChange={e => setEditForm(f => ({ ...f, daily_rent_fee: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Max Lend Days</label>
                          <input type="number" className="form-input" value={editForm.max_lend_days} onChange={e => setEditForm(f => ({ ...f, max_lend_days: parseInt(e.target.value) || 1 }))} required />
                        </div>
                      </>
                    )}
                    <div className="form-group">
                      <label className="form-label">Condition ID (1=New, 5=Poor)</label>
                      <input type="number" min="1" max="5" className="form-input" value={editForm.condition_id} onChange={e => setEditForm(f => ({ ...f, condition_id: parseInt(e.target.value) || 1 }))} required />
                    </div>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                  </form>
                )}
              </div>
            )}

            {/* Admin Edit Form */}
            {isLoggedIn && user?.role === 'admin' && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid var(--clr-border)', borderRadius: 'var(--radius)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Admin Controls</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdminEdit(s => !s)}>
                  Edit Book Info
                </button>
                {showAdminEdit && adminEditForm && (
                  <form onSubmit={handleAdminUpdateListing} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div className="form-group">
                      <label className="form-label">ISBN (13 digits)</label>
                      <input type="text" className="form-input" value={adminEditForm.isbn} onChange={e => setAdminEditForm(f => ({ ...f, isbn: e.target.value }))} required pattern="\d{13}" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input type="text" className="form-input" value={adminEditForm.title} onChange={e => setAdminEditForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Author</label>
                      <input type="text" className="form-input" value={adminEditForm.author} onChange={e => setAdminEditForm(f => ({ ...f, author: e.target.value }))} required />
                    </div>
                    <button type="submit" className="btn btn-primary">Save Book Info</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Action aside */}
          <div className="card detail-aside fade-up">
            <div>
              <div className="detail-price-label">{isRent ? 'Daily rent fee' : 'Price'}</div>
              <div className="detail-price">
                <span style={{ fontSize: '1.2rem', verticalAlign: 'super' }}>$</span>
                {parseFloat(price).toFixed(2)}
                {isRent && <span style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)', fontWeight: 400 }}>/day</span>}
              </div>
            </div>

            <div>
              <span className={`badge ${isAvailable ? 'badge-success' : 'badge-danger'}`}>
                {isAvailable ? 'Available' : `${listing.status}`}
              </span>
            </div>

            {isAvailable && isLoggedIn && user?.role === 'user' && user.sub !== listing.seller_id && (
              <>
                {!isRent && (
                  <button id="btn-purchase" className="btn btn-primary btn-full" onClick={handlePurchase} disabled={actLoading}>
                    {actLoading ? <span className="spinner spinner-sm" /> : 'Buy Now'}
                  </button>
                )}
                {isRent && (
                  <button id="btn-borrow" className="btn btn-primary btn-full" onClick={handleBorrow} disabled={actLoading}>
                    {actLoading ? <span className="spinner spinner-sm" /> : 'Borrow'}
                  </button>
                )}
              </>
            )}

            {!isLoggedIn && (
              <button className="btn btn-secondary btn-full" onClick={() => navigate('/login')} id="btn-login-to-buy">
                Sign in to {isRent ? 'borrow' : 'buy'}
              </button>
            )}

            {isAvailable && isLoggedIn && user?.role === 'user' && user.sub !== listing.seller_id && (
              <button className="btn btn-secondary btn-full" onClick={handleAddToCart} id="btn-cart">
                Add to Cart
              </button>
            )}

            <button className="btn btn-secondary btn-full" onClick={handleAddWishlist} id="btn-wishlist">
              Add to Wishlist
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
