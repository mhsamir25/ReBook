// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function Badge({ children, type = 'sale' }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export default function AdminPage() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab,      setTab]      = useState('pending');
  const [users,    setUsers]    = useState([]);
  const [pending,  setPending]  = useState([]);
  const [audit,    setAudit]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState({ text: '', type: '' });

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') navigate('/');
  }, [isLoggedIn, user, navigate]);

  useEffect(() => {
    setLoading(true);
    const loaders = {
      pending: () => api.getPendingListings().then(setPending),
      users:   () => api.getAdminUsers().then(setUsers),
      audit:   () => api.getAuditLog(50).then(setAudit),
    };
    loaders[tab]?.()
      .catch(err => setMsg({ text: err.message, type: 'error' }))
      .finally(() => setLoading(false));
  }, [tab]);

  const approve = async (listing_id) => {
    try {
      await api.approveListing(listing_id);
      setPending(p => p.filter(l => l.listing_id !== listing_id));
      setMsg({ text: 'Listing approved', type: 'success' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
  };

  const verifyUser = async (target_user_id) => {
    try {
      await api.verifyUser(target_user_id);
      setUsers(u => u.map(usr => usr.user_id === target_user_id ? { ...usr, is_verified: true } : usr));
      setMsg({ text: 'User verified', type: 'success' });
    } catch (err) { setMsg({ text: err.message, type: 'error' }); }
  };

  return (
    <main className="page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage users, listings, and audit activity.</p>
        </header>

        {msg.text && (
          <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'} mt-2`}>
            {msg.text}
          </div>
        )}

        <div className="admin-tabs">
          {[['pending', 'Pending'], ['users', 'Users'], ['audit', 'Audit Log']].map(([key, label]) => (
            <button key={key} id={`tab-${key}`} className={`admin-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div className="spinner" /> : (
          <>
            {/* Pending Listings */}
            {tab === 'pending' && (
              <div className="card table-card fade-up">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th><th>Seller</th><th>Type</th><th>Price</th><th>Submitted</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.length === 0 && (
                      <tr><td colSpan={6} className="table-empty">No pending listings. All caught up!</td></tr>
                    )}
                    {pending.map(l => (
                      <tr key={l.listing_id}>
                        <td className="fw-700">{l.title}</td>
                        <td className="text-muted">{l.seller_email}</td>
                        <td><Badge type={l.type === 'rent' ? 'rent' : 'sale'}>{l.type}</Badge></td>
                        <td className="fw-700 text-accent">
                          ${Number.parseFloat(l.price || l.daily_rent_fee || 0).toFixed(2)}
                          {l.type === 'rent' ? '/day' : ''}
                        </td>
                        <td className="text-dim">{new Date(l.created_at).toLocaleDateString()}</td>
                        <td>
                          <button id={`btn-approve-${l.listing_id}`} className="btn btn-primary btn-sm" onClick={() => approve(l.listing_id)}>
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Users */}
            {tab === 'users' && (
              <div className="card table-card fade-up">
                <table>
                  <thead>
                    <tr><th>Email</th><th>Role</th><th>Verified</th><th>Balance</th><th>Joined</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.user_id}>
                        <td className="fw-700">{u.email}</td>
                        <td><Badge type={u.role === 'admin' ? 'danger' : 'sale'}>{u.role}</Badge></td>
                        <td>{u.is_verified ? <Badge type="success">Yes</Badge> : <Badge type="warn">No</Badge>}</td>
                        <td className="fw-700 text-green">${Number.parseFloat(u.wallet_balance).toFixed(2)}</td>
                        <td className="text-dim">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                          {!u.is_verified && (
                            <button id={`btn-verify-${u.user_id}`} className="btn btn-secondary btn-sm" onClick={() => verifyUser(u.user_id)}>
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Audit Log */}
            {tab === 'audit' && (
              <div className="card table-card fade-up">
                <table>
                  <thead>
                    <tr><th>Table</th><th>Action</th><th>Old Value</th><th>New Value</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {audit.map(a => (
                      <tr key={a.audit_id}>
                        <td><code>{a.table_name}</code></td>
                        <td><Badge type="warn">{a.action}</Badge></td>
                        <td className="audit-cell text-dim">
                          {a.old_data ? JSON.stringify(a.old_data) : '-'}
                        </td>
                        <td className="audit-cell text-green">
                          {a.new_data ? JSON.stringify(a.new_data) : '-'}
                        </td>
                        <td className="text-dim">{new Date(a.changed_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
