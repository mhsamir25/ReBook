// src/pages/ListingDetailPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import defaultBookImg from '../assets/default-book.jpg';

function Fact({ label, children }) {
  if (!children) return null;

  return (
    <div className="fact">
      <div className="fact-label">{label}</div>
      <div className="fact-value">{children}</div>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoad] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [imgLoadStates, setImgLoadStates] = useState([true, true, true]);

  const [reviewForm, setReviewForm] = useState({ listing_id: id, rating: 5, comment: '' });
  const [showReview, setShowReview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState(null);

  useEffect(() => {
    api.getListing(id)
      .then(data => {
        setListing(data);
        setEditForm({
          condition_id: data.condition_rank || 1,
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
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    setActLoad(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await api.purchase(id);
      showMsg(`Purchased! Transaction ID: ${res.txn_id}`);
      setListing(current => ({ ...current, status: 'sold' }));
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setActLoad(false);
    }
  };

  const handleBorrow = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    setActLoad(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await api.borrow(id);
      showMsg(`Borrowed! Record ID: ${res.record_id}`);
      setListing(current => ({ ...current, status: 'rented' }));
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setActLoad(false);
    }
  };

  const handleAddWishlist = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    try {
      await api.addWishlist(listing.listing_id);
      showMsg('Added to wishlist!');
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    try {
      await api.addToCart(listing.listing_id);
      showMsg('Added to cart!');
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleReview = async (event) => {
    event.preventDefault();
    try {
      const res = await api.addReview(reviewForm);
      showMsg(`Review submitted! ID: ${res.review_id}`);
      setShowReview(false);
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleUpdateListing = async (event) => {
    event.preventDefault();
    try {
      await api.updateListing(id, editForm);
      showMsg('Listing updated successfully!');
      setShowEdit(false);
      const updated = await api.getListing(id);
      setListing(updated);
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleAdminUpdateListing = async (event) => {
    event.preventDefault();
    try {
      await api.adminUpdateListing(id, adminEditForm);
      showMsg('Book info updated successfully!');
      setShowAdminEdit(false);
      const updated = await api.getListing(id);
      setListing(updated);
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleRemoveListing = async () => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;

    try {
      await api.removeListingUser(id);
      showMsg('Listing removed successfully!');
      setListing(current => ({ ...current, status: 'removed' }));
    } catch (err) {
      showMsg(err.message, 'error');
    }
  };

  const handleImageError = (index) => {
    setImgLoadStates(prev => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  if (loading) {
    return (
      <main className="page detail-page">
        <div className="container">
          <div className="spinner" />
        </div>
      </main>
    );
  }

  if (!listing) return null;

  const isRent = listing.type === 'rent';
  const price = isRent ? listing.daily_rent_fee : listing.price;
  const isAvailable = listing.status === 'available';
  const canTransact = isAvailable && isLoggedIn && user?.role === 'user' && user.sub !== listing.seller_id;
  const canManage = isLoggedIn && user?.sub === listing.seller_id && isAvailable;
  const canReview = isLoggedIn && user?.role === 'user' && !isAvailable;

  return (
    <main className="page detail-page">
      <div className="container">
        <button className="btn btn-secondary btn-sm back-button" onClick={() => navigate(-1)} id="btn-back">
          Back
        </button>

        <div className="detail-grid">
          <section className="card detail-main fade-up">
            <div className="detail-heading-row">
              <span className={`badge ${isRent ? 'badge-rent' : 'badge-sale'}`}>
                {isRent ? 'For Rent' : 'For Sale'}
              </span>
              <span className={`badge ${isAvailable ? 'badge-success' : 'badge-danger'}`}>
                {isAvailable ? 'Available' : listing.status}
              </span>
            </div>

            <div className="detail-gallery">
              {imgLoadStates.every(state => !state) && (
                <img src={defaultBookImg} alt="Default book cover" className="detail-image" />
              )}
              {[0, 1, 2].map(index => (
                <img
                  key={index}
                  src={`/api/listings/${id}/images/${index}`}
                  alt={`${listing.title} preview ${index + 1}`}
                  className={`detail-image ${imgLoadStates[index] ? '' : 'is-hidden'}`}
                  onError={() => handleImageError(index)}
                />
              ))}
            </div>

            <h1 className="detail-title">{listing.title}</h1>
            <p className="detail-author">by {listing.author}</p>

            <hr className="divider" />

            <div className="detail-facts">
              <Fact label="Genre">{listing.genre}</Fact>
              <Fact label="Condition">{listing.condition}</Fact>
              <Fact label="ISBN">{listing.isbn && <code>{listing.isbn}</code>}</Fact>
              <Fact label="Seller">{listing.seller_email}</Fact>
            </div>

            {isRent && listing.max_lend_days && (
              <span className="badge badge-rent">Max {listing.max_lend_days} days</span>
            )}

            {msg.text && (
              <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'} mt-3`}>
                {msg.text}
              </div>
            )}

            {canReview && (
              <div className="panel-section">
                <div className="inline-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowReview(current => !current)} id="btn-toggle-review">
                    Leave a Review
                  </button>
                </div>
                {showReview && (
                  <form onSubmit={handleReview} className="inline-form" id="review-form">
                    <div className="form-group">
                      <label className="form-label" htmlFor="review-rating">Rating (1-5)</label>
                      <input
                        id="review-rating"
                        type="number"
                        className="form-input"
                        min={1}
                        max={5}
                        value={reviewForm.rating}
                        onChange={event => setReviewForm(form => ({ ...form, rating: Number(event.target.value) }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="review-comment">Comment</label>
                      <textarea
                        id="review-comment"
                        className="form-input"
                        rows={3}
                        value={reviewForm.comment}
                        onChange={event => setReviewForm(form => ({ ...form, comment: event.target.value }))}
                      />
                    </div>
                    <button id="btn-submit-review" type="submit" className="btn btn-primary">Submit Review</button>
                  </form>
                )}
              </div>
            )}

            {canManage && (
              <div className="panel-section">
                <div className="inline-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(current => !current)}>
                    Edit Listing
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={handleRemoveListing}>
                    Remove Listing
                  </button>
                </div>

                {showEdit && editForm && (
                  <form onSubmit={handleUpdateListing} className="inline-form">
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-type">Type</label>
                      <select
                        id="edit-type"
                        className="form-input"
                        value={editForm.type}
                        onChange={event => setEditForm(form => ({ ...form, type: event.target.value }))}
                      >
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                      </select>
                    </div>

                    {editForm.type === 'sale' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="edit-price">Price ($)</label>
                        <input
                          id="edit-price"
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={editForm.price}
                          onChange={event => setEditForm(form => ({ ...form, price: event.target.value }))}
                          required
                        />
                      </div>
                    )}

                    {editForm.type === 'rent' && (
                      <div className="form-grid-two">
                        <div className="form-group">
                          <label className="form-label" htmlFor="edit-rent">Daily Rent Fee ($)</label>
                          <input
                            id="edit-rent"
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={editForm.daily_rent_fee}
                            onChange={event => setEditForm(form => ({ ...form, daily_rent_fee: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="edit-max-days">Max Lend Days</label>
                          <input
                            id="edit-max-days"
                            type="number"
                            className="form-input"
                            value={editForm.max_lend_days}
                            onChange={event => setEditForm(form => ({ ...form, max_lend_days: parseInt(event.target.value, 10) || 1 }))}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-condition">Condition ID (1=New, 5=Poor)</label>
                      <input
                        id="edit-condition"
                        type="number"
                        min="1"
                        max="5"
                        className="form-input"
                        value={editForm.condition_id}
                        onChange={event => setEditForm(form => ({ ...form, condition_id: parseInt(event.target.value, 10) || 1 }))}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                  </form>
                )}
              </div>
            )}

            {isLoggedIn && user?.role === 'admin' && (
              <div className="panel-section">
                <h2 className="panel-title">Admin Controls</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdminEdit(current => !current)}>
                  Edit Book Info
                </button>

                {showAdminEdit && adminEditForm && (
                  <form onSubmit={handleAdminUpdateListing} className="inline-form">
                    <div className="form-group">
                      <label className="form-label" htmlFor="admin-isbn">ISBN (13 digits)</label>
                      <input
                        id="admin-isbn"
                        type="text"
                        className="form-input"
                        value={adminEditForm.isbn}
                        onChange={event => setAdminEditForm(form => ({ ...form, isbn: event.target.value }))}
                        required
                        pattern="\d{13}"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="admin-title">Title</label>
                      <input
                        id="admin-title"
                        type="text"
                        className="form-input"
                        value={adminEditForm.title}
                        onChange={event => setAdminEditForm(form => ({ ...form, title: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="admin-author">Author</label>
                      <input
                        id="admin-author"
                        type="text"
                        className="form-input"
                        value={adminEditForm.author}
                        onChange={event => setAdminEditForm(form => ({ ...form, author: event.target.value }))}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">Save Book Info</button>
                  </form>
                )}
              </div>
            )}
          </section>

          <aside className="card detail-aside fade-up">
            <div>
              <div className="detail-price-label">{isRent ? 'Daily rent fee' : 'Price'}</div>
              <div className="detail-price">
                <span className="price-currency">$</span>
                {Number.parseFloat(price || 0).toFixed(2)}
                {isRent && <span className="price-period">/day</span>}
              </div>
            </div>

            <span className={`badge ${isAvailable ? 'badge-success' : 'badge-danger'}`}>
              {isAvailable ? 'Available' : listing.status}
            </span>

            {canTransact && !isRent && (
              <button id="btn-purchase" className="btn btn-primary btn-full" onClick={handlePurchase} disabled={actLoading}>
                {actLoading ? <span className="spinner spinner-sm" /> : 'Buy Now'}
              </button>
            )}

            {canTransact && isRent && (
              <button id="btn-borrow" className="btn btn-primary btn-full" onClick={handleBorrow} disabled={actLoading}>
                {actLoading ? <span className="spinner spinner-sm" /> : 'Borrow'}
              </button>
            )}

            {!isLoggedIn && (
              <button className="btn btn-secondary btn-full" onClick={() => navigate('/login')} id="btn-login-to-buy">
                Sign in to {isRent ? 'borrow' : 'buy'}
              </button>
            )}

            {canTransact && (
              <>
                <button className="btn btn-secondary btn-full" onClick={handleAddToCart} id="btn-cart">
                  Add to Cart
                </button>
                <button className="btn btn-secondary btn-full" onClick={handleAddWishlist} id="btn-wishlist">
                  Add to Wishlist
                </button>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
