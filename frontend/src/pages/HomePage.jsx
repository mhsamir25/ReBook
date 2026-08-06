// src/pages/HomePage.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';

const GENRES = [
  'Fiction', 'Science Fiction', 'Mystery', 'Non-Fiction', 
  'Fantasy', 'Biography', 'History', 'Self-Help'
];
const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' }
];

export default function HomePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  
  // Search state
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [type, setType] = useState('');
  const [condition, setCondition] = useState('');

  const [activeSearch, setActiveSearch] = useState({ query: '', genre: '', type: '', condition: '' });

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { query: q, genre: g, type: t, condition: c } = activeSearch;
      if (!q && !g && !t && !c) {
        const data = await api.getListings();
        setListings((data || []).filter(l => l.seller_id !== user?.sub));
      } else {
        const data = await api.searchBooks({ q, genre: g, type: t, condition: c });
        setListings((data || []).filter(l => l.seller_id !== user?.sub));
      }
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [activeSearch, user]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch({ query, genre, type, condition });
  };

  const skeletons = Array.from({ length: 6 });

  return (
    <main className="page">
      <div className="container">
        {/* Hero */}
        <section className="hero">
          <h1 className="hero-title">
            Find your next<br />
            <span>favourite book</span>
          </h1>
          <p className="hero-sub">
            Buy or borrow second-hand books from verified sellers. Every transaction is atomically safe and database-guaranteed.
          </p>

          <form className="search-wrap" onSubmit={handleSearch}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input
                id="search-input"
                type="search"
                className="search-input"
                placeholder="Search by title, author or ISBN…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label">Genre</label>
                <select className="form-input" value={genre} onChange={e => setGenre(e.target.value)}>
                  <option value="">All Genres</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="sale">Buy (Sale)</option>
                  <option value="rent">Borrow (Rent)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Condition</label>
                <select className="form-input" value={condition} onChange={e => setCondition(e.target.value)}>
                  <option value="">All Conditions</option>
                  {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ padding: '0.9rem' }}>Search Books</button>
          </form>
        </section>

        {/* Results header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text-muted)' }}>
            {(activeSearch.query || activeSearch.genre || activeSearch.type || activeSearch.condition) ? 'Search results' : 'Available Listings'}
          </h2>
          {!loading && <span className="badge badge-sale">{listings.length} found</span>}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="spinner" style={{ borderColor: 'var(--clr-accent-glow)', borderTopColor: 'var(--clr-accent)' }}></div>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '1.1rem', marginTop: '1rem' }}>Looking for your ideal book...</p>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ color: 'var(--clr-text-muted)', fontSize: '1.1rem' }}>No listings found matching your criteria.</div>
          </div>
        ) : (
          <div className="listings-grid">
            {listings.map(l => <ListingCard key={l.listing_id} listing={l} />)}
          </div>
        )}
      </div>
    </main>
  );
}
