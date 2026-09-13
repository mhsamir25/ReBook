import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import biographyCard from '../assets/biography.png';
import fantasyCard from '../assets/fantasy.jpeg';
import fictionCard from '../assets/fiction.jpeg';
import historyCard from '../assets/history.jpeg';
import mysteryCard from '../assets/mystery.jpeg';
import nonFictionCard from '../assets/non-fiction.jpeg';
import sciFiCard from '../assets/science-fiction.jpeg';
import selfHelpCard from '../assets/self-help.jpeg';
import unknownCard from '../assets/unknown.jpeg';

const GENRE_CARD_MAP = {
  fiction: fictionCard,
  'science fiction': sciFiCard,
  'sci-fi': sciFiCard,
  mystery: mysteryCard,
  'non-fiction': nonFictionCard,
  nonfiction: nonFictionCard,
  fantasy: fantasyCard,
  biography: biographyCard,
  history: historyCard,
  'self-help': selfHelpCard,
  'self help': selfHelpCard,
};

function getGenreCardAsset(genre) {
  if (!genre) return unknownCard;
  const key = genre.trim().toLowerCase();
  return GENRE_CARD_MAP[key] || unknownCard;
}

function formatLabel(value) {
  if (!value) return '';
  return String(value).replaceAll('_', ' ');
}

export default function ListingCard({ listing }) {
  const navigate = useNavigate();
  const [hasImage, setHasImage] = useState(false);

  const isRent = listing.type === 'rent';
  const price = isRent ? listing.daily_rent_fee : listing.price;
  const imageUrl = `/api/listings/${listing.listing_id}/image/title`;
  const cardFrameImg = getGenreCardAsset(listing.genre);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.src = imageUrl;

    if (img.complete && img.naturalWidth > 0) {
      setHasImage(true);
    } else {
      img.onload = () => {
        if (isMounted) setHasImage(true);
      };
      img.onerror = () => {
        if (isMounted) setHasImage(false);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  const handleClick = () => navigate(`/listings/${listing.listing_id}`);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  /* ── PHOTO MODE: book has a real cover image ── */
  if (hasImage) {
    return (
      <article
        className="listing-card-shell listing-card-cover-only fade-up"
        onClick={handleClick}
        id={`listing-card-${listing.listing_id}`}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        title={`${listing.title} by ${listing.author}`}
      >
        <div className="listing-cover listing-cover-photo">
          <img
            src={imageUrl}
            alt={listing.title}
            className="listing-photo-bg"
            onError={() => setHasImage(false)}
          />
          <div className="listing-cover-overlay">
            <strong className="listing-overlay-price">
              ${Number.parseFloat(price || 0).toFixed(2)}
              {isRent && <span className="listing-price-label">/day</span>}
            </strong>
            <div className="listing-overlay-pills">
              {listing.condition && (
                <span className="badge badge-success">{formatLabel(listing.condition)}</span>
              )}
              <span className={`badge ${isRent ? 'badge-rent' : 'badge-sale'}`}>
                {isRent ? 'Rent' : 'Sale'}
              </span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  /* ── GENRE MODE: no cover image — genre artwork with text overlaid inside ── */
  return (
    <article
      className="listing-card-shell listing-card-cover-only fade-up"
      onClick={handleClick}
      id={`listing-card-${listing.listing_id}`}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      title={`${listing.title} by ${listing.author}`}
    >
      <div
        className="listing-cover listing-cover-genre"
        style={{ backgroundImage: `url(${cardFrameImg})` }}
      >
        <div className="listing-cover-overlay listing-cover-overlay-genre">
          {/* Top group: title + author pulled up */}
          <div className="listing-overlay-top">
            <h2 className="listing-overlay-title">{listing.title}</h2>
            <p className="listing-overlay-author">by {listing.author}</p>
          </div>

          {/* Bottom group: price + badges stay down */}
          <div className="listing-overlay-bottom">
            <strong className="listing-overlay-price">
              ${Number.parseFloat(price || 0).toFixed(2)}
              {isRent && <span className="listing-price-label">/day</span>}
            </strong>
            <div className="listing-overlay-pills">
              {listing.condition && (
                <span className="badge badge-success">{formatLabel(listing.condition)}</span>
              )}
              <span className={`badge ${isRent ? 'badge-rent' : 'badge-sale'}`}>
                {isRent ? 'Rent' : 'Sale'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
