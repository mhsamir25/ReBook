// src/api/client.js
// Thin fetch wrapper that prefixes /api and attaches the JWT token.
// No business logic — just HTTP transport.

const BASE = '/api';

function getToken() {
  return localStorage.getItem('rebook_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register:  (body) => request('POST', '/auth/register', body),
  login:     (body) => request('POST', '/auth/login', body),

  // Listings
  getListings:  ()    => request('GET',  '/listings/'),
  searchBooks:  ({ q, genre, type, condition }) => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (genre) params.append('genre', genre);
    if (type) params.append('type', type);
    if (condition) params.append('condition', condition);
    return request('GET', `/listings/search?${params.toString()}`);
  },
  getListing:   (id)  => request('GET',  `/listings/${id}`),
  getBookByIsbn: (isbn) => request('GET', `/listings/book/${isbn}`),
  getGenres:    ()    => request('GET', '/listings/genres'),
  createListing:(body)=> request('POST', '/listings/', body),
  updateListing:(id, body) => request('PUT', `/listings/${id}`, body),
  removeListingUser: (id)  => request('DELETE', `/listings/${id}`),

  // Transactions
  purchase: (listingId) => request('POST', `/transactions/purchase/${listingId}`),
  borrow:   (listingId) => request('POST', `/transactions/borrow/${listingId}`),
  returnBook:(recordId) => request('POST', `/transactions/return/${recordId}`),

  // Reviews
  addReview: (body) => request('POST', '/reviews/', body),

  // Me
  getProfile:     () => request('GET', '/me/profile'),
  getMyListings:  () => request('GET', '/me/listings'),
  getWishlist:    () => request('GET', '/me/wishlist'),
  getSales:       () => request('GET', '/me/transactions/sales'),
  getPurchases:   () => request('GET', '/me/transactions/purchases'),
  getLending:     () => request('GET', '/me/transactions/lending'),
  getBorrowing:   () => request('GET', '/me/transactions/borrowing'),
  addWishlist:    (listingId) => request('POST',   '/me/wishlist',       { listing_id: listingId }),
  removeWishlist: (listingId) => request('DELETE', `/me/wishlist/${listingId}`),
  getCart:        () => request('GET', '/me/cart'),
  addToCart:      (listingId) => request('POST', '/me/cart', { listing_id: listingId }),
  removeFromCart: (listingId) => request('DELETE', `/me/cart/${listingId}`),
  topupWallet:    (amount) => request('POST', '/me/wallet/topup',   { amount }),

  // Admin
  verifyUser:       (target_user_id) => request('POST', '/admin/users/verify',       { target_user_id }),
  removeUser:       (target_user_id) => request('POST', '/admin/users/remove',       { target_user_id }),
  approveListing:   (listing_id)     => request('POST', '/admin/listings/approve',   { listing_id }),
  removeListing:    (listing_id)     => request('POST', '/admin/listings/remove',    { listing_id }),
  adminUpdateListing: (listing_id, body) => request('PUT', `/admin/listings/${listing_id}`, body),
  getAdminUsers:    ()               => request('GET',  '/admin/users'),
  getPendingListings: ()             => request('GET',  '/admin/listings/pending'),
  getAllListingsAdmin: ()            => request('GET',  '/admin/listings/all'),
  getAuditLog:      (limit = 100)    => request('GET',  `/admin/audit-log?limit=${limit}`),
};
