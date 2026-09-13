import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import heroBgImg from '../assets/background.jpeg';

const GENRES = [
  'Fiction',
  'Science Fiction',
  'Mystery',
  'Non-Fiction',
  'Fantasy',
  'Biography',
  'History',
  'Self-Help',
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const EMPTY_SEARCH = { query: '', genre: '', type: '', condition: '' };

export default function HomePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [type, setType] = useState('');
  const [condition, setCondition] = useState('');
  const [activeSearch, setActiveSearch] = useState(EMPTY_SEARCH);

  const isFiltering = Boolean(
    activeSearch.query || activeSearch.genre || activeSearch.type || activeSearch.condition
  );

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { query: q, genre: g, type: t, condition: c } = activeSearch;
      const data = q || g || t || c
        ? await api.searchBooks({ q, genre: g, type: t, condition: c })
        : await api.getListings();

      setListings((data || []).filter(listing => listing.seller_id !== user?.sub));
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [activeSearch, user?.sub]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = (event) => {
    event.preventDefault();
    setActiveSearch({ query, genre, type, condition });
  };

  const handleClear = () => {
    setQuery('');
    setGenre('');
    setType('');
    setCondition('');
    setActiveSearch(EMPTY_SEARCH);
  };

  return (
    <main className="page homepage-page">
      <section
        className="hero-full-bleed"
        style={{ backgroundImage: `url(${heroBgImg})` }}
      >
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="hero-layout">
            <div className="hero-copy">
              <span className="hero-eyebrow">Second-hand bookstore marketplace</span>
              <h1 className="hero-title">
                Find your next <span>favorite book</span>
              </h1>
              <p className="hero-sub">
                Browse books for sale or rent from readers nearby, then keep your wallet and cart in one place.
              </p>

              <div className="hero-stats" aria-label="Marketplace highlights">
                <div className="hero-stat">
                  <strong>Buy</strong>
                  <span>Pre-loved copies</span>
                </div>
                <div className="hero-stat">
                  <strong>Rent</strong>
                  <span>Short-term reads</span>
                </div>
                <div className="hero-stat">
                  <strong>List</strong>
                  <span>Your own shelf</span>
                </div>
              </div>
            </div>

            <form className="search-panel" onSubmit={handleSearch}>
              <h2 className="search-panel-title">Search the shelves</h2>
              <div className="search-field">
                <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="search-input"
                  type="search"
                  className="search-input"
                  placeholder="Title, author, or ISBN"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="filters-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="genre-filter">Genre</label>
                  <select
                    id="genre-filter"
                    className="form-input"
                    value={genre}
                    onChange={(event) => setGenre(event.target.value)}
                  >
                    <option value="">All genres</option>
                    {GENRES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="type-filter">Type</label>
                  <select
                    id="type-filter"
                    className="form-input"
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                  >
                    <option value="">All types</option>
                    <option value="sale">Buy</option>
                    <option value="rent">Rent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="condition-filter">Condition</label>
                  <select
                    id="condition-filter"
                    className="form-input"
                    value={condition}
                    onChange={(event) => setCondition(event.target.value)}
                  >
                    <option value="">Any condition</option>
                    {CONDITIONS.map(item => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="search-actions">
                <button type="submit" className="btn btn-primary btn-full">Search Books</button>
                {isFiltering && (
                  <button type="button" className="btn btn-secondary" onClick={handleClear}>Clear</button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="container results-section">
        <div className="results-toolbar">
          <div>
            <div className="results-kicker">{isFiltering ? 'Filtered collection' : 'Fresh listings'}</div>
            <h2 className="results-title">{isFiltering ? 'Search Results' : 'Available Listings'}</h2>
          </div>
          {!loading && <span className="badge badge-sale results-count">{listings.length} found</span>}
        </div>

        {loading ? (
          <div className="state-panel">
            <div>
              <div className="spinner" />
              <p>Looking for books...</p>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="state-panel">
            <p>No listings found matching your criteria.</p>
          </div>
        ) : (
          <div className="listings-grid">
            {listings.map(listing => (
              <ListingCard key={listing.listing_id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
