import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'all_users' : 'wishlist');
  const [subTabListing, setSubTabListing] = useState('active');
  
  const [profile, setProfile] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [lending, setLending] = useState([]);
  const [borrowing, setBorrowing] = useState([]);
  
  // Admin state
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminListings, setAdminListings] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isAdmin && activeTab === 'wishlist') {
      setActiveTab('all_users');
    }
  }, [user, isAdmin]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const prof = await api.getProfile();
        setProfile(prof);
        
        if (prof.role === 'admin') {
          const [users, listings] = await Promise.all([
            api.getAdminUsers(),
            api.getAllListingsAdmin()
          ]);
          setAdminUsers(users);
          setAdminListings(listings);
        } else {
          const [wish, myList, sls, purc, lend, borr] = await Promise.all([
            api.getWishlist(),
            api.getMyListings(),
            api.getSales(),
            api.getPurchases(),
            api.getLending(),
            api.getBorrowing()
          ]);
          setWishlist(wish);
          setMyListings(myList);
          setSales(sls);
          setPurchases(purc);
          setLending(lend);
          setBorrowing(borr);
        }
      } catch (err) {
        console.error(err);
        if (err.message && (err.message.includes('Invalid or expired token') || err.message.includes('Unauthorized'))) {
          logout();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    }
    if (user) loadData();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const handleRemoveUser = async (targetId) => {
    if (!window.confirm("Are you sure you want to remove this user? This will delete all their data.")) return;
    try {
      await api.removeUser(targetId);
      setAdminUsers(prev => prev.filter(u => u.user_id !== targetId));
      api.getAllListingsAdmin().then(setAdminListings); // Refresh listings
    } catch (err) {
      alert(err.message || 'Failed to remove user');
    }
  };

  const handleRemoveListing = async (listingId) => {
    if (!window.confirm("Are you sure you want to remove this listing?")) return;
    try {
      await api.removeListing(listingId);
      setAdminListings(prev => prev.map(l => l.listing_id === listingId ? { ...l, status: 'removed' } : l));
    } catch (err) {
      alert(err.message || 'Failed to remove listing');
    }
  };

  if (loading) {
    return (
      <main className="page profile-page">
        <div className="container compact-container">
          <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--r-lg)', marginBottom: '1.5rem' }} />
          <div className="skeleton" style={{ height: '40px', borderRadius: 'var(--r-md)', marginBottom: '1.5rem' }} />
          <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--r-lg)' }} />
        </div>
      </main>
    );
  }

  return (
    <main className="page profile-page">
      <div className="container compact-container">
        <header className="profile-header card compact-card">
          <div className="profile-info-compact">
            <div className="profile-main">
              <div className="profile-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="profile-details">
                <h1 className="profile-name">{profile?.email}</h1>
                <div className="profile-badges">
                  <span className="badge badge-sale">Role: {profile?.role}</span>
                  {profile?.is_verified && <span className="badge badge-sale">Verified</span>}
                </div>
              </div>
            </div>
            
            <div className="profile-actions-compact">
              {!isAdmin && (
                <div className="wallet-balance-compact">
                  <span className="balance-label">Wallet</span>
                  <span className="balance-amount">${profile?.wallet_balance}</span>
                  <Link to="/wallet" className="btn btn-secondary btn-sm">Manage</Link>
                </div>
              )}
              
              <div className="action-buttons">
                {profile?.role === 'user' && profile?.is_verified && (
                  <Link to="/create-listing" className="btn btn-primary btn-sm">List a Book</Link>
                )}
                {profile?.role === 'admin' && (
                  <Link to="/admin" className="btn btn-primary btn-sm">Admin Dashboard</Link>
                )}
                <button className="btn btn-outline btn-sm" onClick={handleLogout}>Sign out</button>
              </div>
            </div>
          </div>
        </header>

        <div className="profile-tabs-container card compact-card">
          <div className="tabs compact-tabs">
            {isAdmin ? (
              ['all_users', 'all_listings'].map(tab => (
                <button 
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'all_users' ? 'All Users' : 'All Listings'}
                </button>
              ))
            ) : (
              ['wishlist', 'listings', 'bought', 'borrowing'].map(tab => (
                <button 
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'listings' ? 'My Listings' : tab === 'bought' ? 'Bought Books' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))
            )}
          </div>

          <div className="tab-content compact-content">
            {isAdmin ? (
              <>
                {activeTab === 'all_users' && <AdminUsersTab items={adminUsers} onRemove={handleRemoveUser} currentAdminId={profile?.user_id} />}
                {activeTab === 'all_listings' && <AdminListingsTab items={adminListings} onRemove={handleRemoveListing} />}
              </>
            ) : (
              <>
                {activeTab === 'wishlist' && <WishlistTab items={wishlist} />}
                
                {activeTab === 'listings' && (
                  <div className="sub-tabs-container">
                    <div className="tabs sub-tabs">
                      <button className={`tab-btn tab-btn-sm ${subTabListing === 'active' ? 'active' : ''}`} onClick={() => setSubTabListing('active')}>Active</button>
                      <button className={`tab-btn tab-btn-sm ${subTabListing === 'selling' ? 'active' : ''}`} onClick={() => setSubTabListing('selling')}>Sales</button>
                      <button className={`tab-btn tab-btn-sm ${subTabListing === 'lending' ? 'active' : ''}`} onClick={() => setSubTabListing('lending')}>Lending</button>
                    </div>
                    {subTabListing === 'active' && <ActiveListingsTab items={myListings} />}
                    {subTabListing === 'selling' && <SalesTab items={sales} />}
                    {subTabListing === 'lending' && <LendingTab items={lending} />}
                  </div>
                )}

                {activeTab === 'bought' && <PurchasesTab items={purchases} />}
                {activeTab === 'borrowing' && <BorrowingTab items={borrowing} />}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function AdminUsersTab({ items, onRemove, currentAdminId }) {
  if (!items.length) return <p className="empty-state">No users found.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(user => (
        <li key={user.user_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{user.email}</h4>
            <p className="item-txnid">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div className="item-meta">
            <span className={`badge ${user.role === 'admin' ? 'badge-danger' : 'badge-sale'}`}>{user.role}</span>
            {user.user_id !== currentAdminId && (
               <button className="btn btn-danger btn-sm" onClick={() => onRemove(user.user_id)}>Remove</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdminListingsTab({ items, onRemove }) {
  if (!items.length) return <p className="empty-state">No listings found.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(item => (
        <li key={item.listing_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{item.title}</h4>
            <p className="item-txnid">{item.seller_email} • {item.type}</p>
          </div>
          <div className="item-meta">
            <span className={`badge ${item.status === 'removed' ? 'badge-danger' : 'badge-rent'}`}>{item.status}</span>
            {item.status !== 'removed' && item.status !== 'rented' && item.status !== 'sold' && (
               <button className="btn btn-danger btn-sm" onClick={() => onRemove(item.listing_id)}>Remove</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function WishlistTab({ items }) {
  if (!items.length) return <p className="empty-state">Your wishlist is empty.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(item => (
        <li key={item.listing_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{item.title}</h4>
            <p className="item-author">{item.author}</p>
          </div>
          <div className="item-meta">
            <span className={`badge ${item.status === 'rented' ? 'badge-danger' : 'badge-rent'}`}>
              {item.status === 'rented' ? 'Unavailable' : item.genre}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ActiveListingsTab({ items }) {
  if (!items.length) return <p className="empty-state">No active listings.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(item => (
        <li key={item.listing_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{item.title}</h4>
            <p className="item-author">{item.author}</p>
          </div>
          <div className="item-meta">
            <span className={`badge ${item.status === 'available' ? 'badge-sale' : 'badge-danger'}`}>
              {item.status}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SalesTab({ items }) {
  if (!items.length) return <p className="empty-state">No sales yet.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(item => (
        <li key={item.txn_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{item.title}</h4>
            <p className="item-txnid">TXN: {item.txn_id.split('-')[0]}...</p>
          </div>
          <div className="item-meta">
            <span className="amount positive">+${item.amount}</span>
            <span className={`badge ${item.status === 'completed' ? 'badge-sale' : ''}`}>{item.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PurchasesTab({ items }) {
  if (!items.length) return <p className="empty-state">No purchases yet.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(item => (
        <li key={item.txn_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{item.title}</h4>
            <p className="item-txnid">TXN: {item.txn_id.split('-')[0]}...</p>
          </div>
          <div className="item-meta">
            <span className="amount negative">-${item.amount}</span>
            <span className={`badge ${item.status === 'completed' ? 'badge-rent' : ''}`}>{item.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LendingTab({ items }) {
  if (!items.length) return <p className="empty-state">No items lended yet.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(item => (
        <li key={item.record_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{item.title}</h4>
            <p className="item-txnid">Due: {new Date(item.due_at).toLocaleDateString()}</p>
          </div>
          <div className="item-meta">
             <span className={`badge ${item.returned_at ? 'badge-sale' : 'badge-rent'}`}>
               {item.returned_at ? 'Returned' : 'Out'}
             </span>
             {item.late_fee_charged > 0 && <span className="late-fee positive">+${item.late_fee_charged}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BorrowingTab({ items }) {
  if (!items.length) return <p className="empty-state">No items borrowed yet.</p>;
  return (
    <ul className="item-list compact-list">
      {items.map(item => (
        <li key={item.record_id} className="list-item compact-list-item">
          <div className="item-main">
            <h4>{item.title}</h4>
            <p className="item-txnid">Due: {new Date(item.due_at).toLocaleDateString()}</p>
          </div>
          <div className="item-meta">
             <span className={`badge ${item.returned_at ? 'badge-sale' : 'badge-rent'}`}>
               {item.returned_at ? 'Returned' : 'Borrowing'}
             </span>
             {item.late_fee_charged > 0 && <span className="late-fee negative">-${item.late_fee_charged}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
