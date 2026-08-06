// src/components/ListingCard.jsx
import { useNavigate } from 'react-router-dom';

function Stars({ rating }) {
  return <span className="stars">Rating: {rating}/5</span>;
}

export default function ListingCard({ listing }) {
  const navigate = useNavigate();

  const isRent = listing.type === 'rent';
  const price  = isRent ? listing.daily_rent_fee : listing.price;

  return (
    <div
      className="card listing-card fade-up"
      onClick={() => navigate(`/listings/${listing.listing_id}`)}
      id={`listing-card-${listing.listing_id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/listings/${listing.listing_id}`)}
    >
      <div className="listing-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="listing-card-title" title={listing.title}>{listing.title}</div>
          <div className="listing-card-author">by {listing.author}</div>
        </div>
        <span className={`badge ${isRent ? 'badge-rent' : 'badge-sale'}`}>
          {isRent ? 'Rent' : 'Sale'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {listing.genre     && <span className="badge badge-warn" style={{ fontSize: '0.7rem' }}>{listing.genre}</span>}
        {listing.condition && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{listing.condition}</span>}
      </div>

      <div className="listing-card-footer">
        <div>
          <div className="listing-card-price">
            ${parseFloat(price).toFixed(2)}
            <span className="listing-card-price-label">{isRent ? ' /day' : ''}</span>
          </div>
          {isRent && listing.max_lend_days && (
            <div className="listing-card-meta">Up to {listing.max_lend_days} days</div>
          )}
        </div>
        <div className="listing-card-meta" style={{ textAlign: 'right' }}>
          {listing.seller_email && <div style={{ fontSize: '0.75rem' }}>{listing.seller_email.split('@')[0]}</div>}
        </div>
      </div>
    </div>
  );
}
