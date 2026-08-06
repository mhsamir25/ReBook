// src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function RegisterPage() {
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '', role: 'user' });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.register(form);
      setSuccess('Account created! Please sign in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card fade-up">
        <h1 className="auth-title">Create an account</h1>
        <p className="auth-sub">Join ReBook and start buying or lending books.</p>

        {error   && <div className="alert alert-error"   style={{ marginBottom: '1.2rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1.2rem' }}>{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" name="email" type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" name="password" type="password" className="form-input" placeholder="Min. 8 characters"
              value={form.password} onChange={handleChange} required autoComplete="new-password" minLength={8} />
          </div>

          <button id="btn-register" type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Creating…</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
