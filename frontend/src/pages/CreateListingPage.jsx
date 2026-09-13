// src/pages/CreateListingPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function CreateListingPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    genre_id: '',
    condition_id: 1,
    type: 'sale',
    price: '',
    daily_rent_fee: '',
    max_lend_days: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isFetchingBook, setIsFetchingBook] = useState(false);
  const [bookFound, setBookFound] = useState(null);
  const [foundLocally, setFoundLocally] = useState(false);
  const [genres, setGenres] = useState([]);
  const [images, setImages] = useState([]);
  const [titleIndex, setTitleIndex] = useState(0);

  const imagePreviews = useMemo(
    () => images.map(file => ({ file, url: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await api.getGenres();
        setGenres(data);
      } catch (err) {
        console.error('Failed to load genres', err);
      }
    };

    fetchGenres();
  }, []);

  const updateField = (field, value) => {
    setFormData(current => ({ ...current, [field]: value }));
  };

  const handleIsbnChange = async (event) => {
    const newIsbn = event.target.value;
    updateField('isbn', newIsbn);

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

        try {
          const localBook = await api.getBookByIsbn(newIsbn);
          if (localBook && localBook.title) {
            title = localBook.title;
            author = localBook.author || '';
            found = true;
            setFoundLocally(true);
          }
        } catch (err) {
          console.error('Local database lookup error:', err);
        }

        if (!found) {
          setFoundLocally(false);
          try {
            const gbResponse = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=isbn:${newIsbn}`,
              { signal: controller.signal }
            );
            if (gbResponse.ok) {
              const gbData = await gbResponse.json();
              if (gbData.items && gbData.items.length > 0) {
                const bookData = gbData.items[0].volumeInfo;
                title = bookData.title || '';
                author = bookData.authors?.[0] || '';
                found = true;
              }
            }
          } catch (err) {
            if (err.name === 'AbortError') throw err;
          }
        }

        if (!found) {
          try {
            const olResponse = await fetch(
              `https://openlibrary.org/api/books?bibkeys=ISBN:${newIsbn}&jscmd=data&format=json`,
              { signal: controller.signal }
            );
            if (olResponse.ok) {
              const olData = await olResponse.json();
              const key = `ISBN:${newIsbn}`;
              if (olData[key]) {
                const bookData = olData[key];
                title = bookData.title || '';
                author = bookData.authors?.[0]?.name || '';
                found = true;
              }
            }
          } catch (err) {
            if (err.name === 'AbortError') throw err;
          }
        }

        clearTimeout(timeoutId);

        if (found) {
          setFormData(current => ({ ...current, title, author }));
          setBookFound(true);
        } else {
          setBookFound(false);
          setFoundLocally(false);
          setFormData(current => ({ ...current, title: '', author: '' }));
        }
      } catch {
        clearTimeout(timeoutId);
        setBookFound(false);
        setFoundLocally(false);
        setFormData(current => ({ ...current, title: '', author: '' }));
      } finally {
        setIsFetchingBook(false);
      }
    } else {
      setBookFound(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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

      if (images.length > 0) {
        const imgFormData = new FormData();
        imgFormData.append('title_index', titleIndex);
        images.forEach(image => imgFormData.append('files', image));
        await api.uploadListingImages(res.listing_id, imgFormData);
      }

      setMsg({ text: `Listing created successfully! ID: ${res.listing_id}`, type: 'success' });
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files);

    if (files.length > 3) {
      alert('You can only upload up to 3 images.');
      event.target.value = null;
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max 2MB allowed.`);
        return false;
      }
      return true;
    });

    setImages(validFiles);
    if (titleIndex >= validFiles.length) {
      setTitleIndex(0);
    }
  };

  return (
    <main className="page">
      <div className="container narrow-container">
        <header className="page-header">
          <h1 className="page-title">List a Book</h1>
          <p className="page-subtitle">Add the copy you want to sell or rent.</p>
        </header>

        <section className="card form-card fade-up">
          {msg.text && (
            <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'} mt-1`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack-form">
            <div className="form-group">
              <label className="form-label" htmlFor="isbn">ISBN-13</label>
              <div className="form-row">
                <input
                  id="isbn"
                  type="text"
                  className="form-input"
                  placeholder="9780000000000"
                  value={formData.isbn}
                  onChange={handleIsbnChange}
                  required
                  pattern="^\d{13}$"
                  title="Must be exactly 13 digits"
                />
                {isFetchingBook && <span className="spinner spinner-sm" />}
              </div>
              {bookFound === false && (
                <p className="helper-text error">Book not found. Please enter the title and author manually.</p>
              )}
            </div>

            <div className="form-grid-two">
              <div className="form-group">
                <label className="form-label" htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  className={`form-input ${bookFound === true ? 'is-readonly' : ''}`}
                  placeholder="Book title"
                  value={formData.title}
                  onChange={event => updateField('title', event.target.value)}
                  required
                  readOnly={bookFound === true}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="author">Author</label>
                <input
                  id="author"
                  type="text"
                  className={`form-input ${bookFound === true ? 'is-readonly' : ''}`}
                  placeholder="Author name"
                  value={formData.author}
                  onChange={event => updateField('author', event.target.value)}
                  required
                  readOnly={bookFound === true}
                />
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-group">
                <label className="form-label" htmlFor="genre">Genre</label>
                <select
                  id="genre"
                  className="form-input"
                  value={formData.genre_id}
                  onChange={event => updateField('genre_id', event.target.value)}
                  disabled={foundLocally}
                >
                  <option value="">Select a genre</option>
                  {genres.map(item => (
                    <option key={item.genre_id} value={item.genre_id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="condition">Condition</label>
                <select
                  id="condition"
                  className="form-input"
                  value={formData.condition_id}
                  onChange={event => updateField('condition_id', event.target.value)}
                >
                  <option value={1}>New</option>
                  <option value={2}>Like New</option>
                  <option value={3}>Good</option>
                  <option value={4}>Fair</option>
                  <option value={5}>Poor</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="type">Listing Type</label>
              <select
                id="type"
                className="form-input"
                value={formData.type}
                onChange={event => updateField('type', event.target.value)}
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
                  onChange={event => updateField('price', event.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="form-grid-two">
                <div className="form-group">
                  <label className="form-label" htmlFor="daily_rent_fee">Daily Fee (USD)</label>
                  <input
                    id="daily_rent_fee"
                    type="number"
                    className="form-input"
                    min="0.01"
                    step="0.01"
                    value={formData.daily_rent_fee}
                    onChange={event => updateField('daily_rent_fee', event.target.value)}
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
                    onChange={event => updateField('max_lend_days', event.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="book-images">Images</label>
              <input
                id="book-images"
                type="file"
                className="form-input"
                multiple
                accept="image/*"
                onChange={handleImageChange}
              />

              {imagePreviews.length > 0 && (
                <div className="image-preview-panel">
                  <p className="image-preview-title">Title image</p>
                  <div className="image-preview-grid">
                    {imagePreviews.map((preview, index) => (
                      <label
                        key={preview.url}
                        className={`image-preview-item ${titleIndex === index ? 'is-selected' : ''}`}
                      >
                        <img src={preview.url} alt={`Preview ${index + 1}`} />
                        <input
                          type="radio"
                          name="titleImage"
                          checked={titleIndex === index}
                          onChange={() => setTitleIndex(index)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : 'Create Listing'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
