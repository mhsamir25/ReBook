// src/pages/CreateListingPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CreateListingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    genre_id: '',
    condition_id: 1,
    type: 'sale',
    price: '',
    daily_rent_fee: '',
    max_lend_days: ''
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isFetchingBook, setIsFetchingBook] = useState(false);
  const [bookFound, setBookFound] = useState(null);
  const [foundLocally, setFoundLocally] = useState(false);
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await api.getGenres();
        setGenres(data);
      } catch (err) {
        console.error("Failed to load genres", err);
      }
    };
    fetchGenres();
  }, []);

  const handleIsbnChange = async (e) => {
    const newIsbn = e.target.value;
    setFormData({ ...formData, isbn: newIsbn });
    
    if (newIsbn.length === 13 && /^\d{13}$/.test(newIsbn)) {
      setIsFetchingBook(true);
      setBookFound(null);
      setMsg({ text: '', type: '' });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        let title = '';
        let author = '';
        let found = false;

        // 1. Try Local Database
        try {
          const localBook = await api.getBookByIsbn(newIsbn);
          if (localBook && localBook.title) {
            title = localBook.title;
            author = localBook.author || '';
            found = true;
            setFoundLocally(true);
          }
        } catch (e) {
          console.error("Local database lookup error:", e);
        }

        // 2. Try Google Books API
        if (!found) {
          setFoundLocally(false);
          try {
            const gbResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${newIsbn}`, { signal: controller.signal });
            if (gbResponse.ok) {
              const gbData = await gbResponse.json();
              if (gbData.items && gbData.items.length > 0) {
                const bookData = gbData.items[0].volumeInfo;
                title = bookData.title || '';
                if (bookData.authors && bookData.authors.length > 0) {
                  author = bookData.authors[0];
                }
                found = true;
              }
            }
          } catch(e) {
            if (e.name === 'AbortError') throw e;
          }
        }

        // 3. Fallback to Open Library API
        if (!found) {
          try {
            const olResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${newIsbn}&jscmd=data&format=json`, { signal: controller.signal });
            if (olResponse.ok) {
              const olData = await olResponse.json();
              const key = `ISBN:${newIsbn}`;
              if (olData[key]) {
                const bookData = olData[key];
                title = bookData.title || '';
                if (bookData.authors && bookData.authors.length > 0) {
                  author = bookData.authors[0].name;
                }
                found = true;
              }
            }
          } catch(e) {
            if (e.name === 'AbortError') throw e;
          }
        }

        clearTimeout(timeoutId);

        if (found) {
          setFormData(prev => ({ ...prev, title, author }));
          setBookFound(true);
        } else {
          setBookFound(false);
          setFoundLocally(false);
          setFormData(prev => ({ ...prev, title: '', author: '' }));
        }
      } catch (err) {
        clearTimeout(timeoutId);
        setBookFound(false);
        setFoundLocally(false);
        setFormData(prev => ({ ...prev, title: '', author: '' }));
      } finally {
        setIsFetchingBook(false);
      }
    } else {
      setBookFound(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    
    try {
      const payload = {
        isbn: formData.isbn,
        title: formData.title,
        author: formData.author,
        condition_id: parseInt(formData.condition_id, 10),
        type: formData.type,
      };
      if (formData.genre_id) {
        payload.genre_id = parseInt(formData.genre_id, 10);
      }
      
      if (formData.type === 'sale') {
        payload.price = parseFloat(formData.price);
      } else {
        payload.daily_rent_fee = parseFloat(formData.daily_rent_fee);
        payload.max_lend_days = parseInt(formData.max_lend_days, 10);
      }

      const res = await api.createListing(payload);
      setMsg({ text: `Listing created successfully! ID: ${res.listing_id}`, type: 'success' });
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>List a Book</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Fill in the details to list your book for sale or rent.</p>

        <div className="card fade-up" style={{ padding: '2rem' }}>
          {msg.text && (
            <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1.5rem' }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="isbn">ISBN-13</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="isbn"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 9780000000000"
                  value={formData.isbn}
                  onChange={handleIsbnChange}
                  required
                  pattern="^\d{13}$"
                  title="Must be exactly 13 digits"
                  style={{ flex: 1 }}
                />
                {isFetchingBook && <span className="spinner spinner-sm" />}
              </div>
              {bookFound === false && (
                <div style={{ color: 'var(--color-error, #ff4d4f)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Book not found. Please enter Title and Author manually.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder="Book Title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
                readOnly={bookFound === true}
                style={bookFound === true ? { backgroundColor: '#f5f5f5', color: '#888' } : {}}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="author">Author</label>
              <input
                id="author"
                type="text"
                className="form-input"
                placeholder="Author Name"
                value={formData.author}
                onChange={e => setFormData({ ...formData, author: e.target.value })}
                required
                readOnly={bookFound === true}
                style={bookFound === true ? { backgroundColor: '#f5f5f5', color: '#888' } : {}}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="genre">Genre</label>
              <select
                id="genre"
                className="form-input"
                value={formData.genre_id}
                onChange={e => setFormData({ ...formData, genre_id: e.target.value })}
                disabled={foundLocally}
                style={foundLocally ? { backgroundColor: '#f5f5f5', color: '#888' } : {}}
              >
                <option value="">Select a Genre</option>
                {genres.map(g => (
                  <option key={g.genre_id} value={g.genre_id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">

              <label className="form-label" htmlFor="condition">Condition</label>
              <select
                id="condition"
                className="form-input"
                value={formData.condition_id}
                onChange={e => setFormData({ ...formData, condition_id: e.target.value })}
              >
                <option value={1}>New</option>
                <option value={2}>Like New</option>
                <option value={3}>Good</option>
                <option value={4}>Fair</option>
                <option value={5}>Poor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="type">Listing Type</label>
              <select
                id="type"
                className="form-input"
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>

            {formData.type === 'sale' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="price">Price (USD)</label>
                <input
                  id="price"
                  type="number"
                  className="form-input"
                  min="0.01"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="daily_rent_fee">Daily Fee (USD)</label>
                  <input
                    id="daily_rent_fee"
                    type="number"
                    className="form-input"
                    min="0.01"
                    step="0.01"
                    value={formData.daily_rent_fee}
                    onChange={e => setFormData({ ...formData, daily_rent_fee: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="max_lend_days">Max Days</label>
                  <input
                    id="max_lend_days"
                    type="number"
                    className="form-input"
                    min="1"
                    step="1"
                    value={formData.max_lend_days}
                    onChange={e => setFormData({ ...formData, max_lend_days: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <span className="spinner spinner-sm" /> : 'Create Listing'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
