// src/pages/WalletPage.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function WalletPage() {
  const { user } = useAuth();
  const [amount,  setAmount]  = useState('');
  const [balance, setBalance] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [msg,     setMsg]     = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const isValidLuhn = (value) => {
    let nCheck = 0, bEven = false;
    let val = value.replace(/\D/g, "");
    if (!val || val.length < 13 || val.length > 19) return false;

    for (let n = val.length - 1; n >= 0; n--) {
        let cDigit = val.charAt(n),
            nDigit = parseInt(cDigit, 10);
        if (bEven && (nDigit *= 2) > 9) nDigit -= 9;
        nCheck += nDigit;
        bEven = !bEven;
    }
    return (nCheck % 10) === 0;
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!isValidLuhn(cardNumber)) {
        setMsg({ text: 'Please enter a valid credit/debit card number.', type: 'error' });
        return;
    }
    setLoading(true); setMsg({ text: '', type: '' });
    try {
      const res = await api.topupWallet(parseFloat(amount));
      setBalance(res.new_balance);
      setMsg({ text: `Wallet topped up! New balance: $${parseFloat(res.new_balance).toFixed(2)}`, type: 'success' });
      setAmount('');
      setCardNumber('');
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: '500px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>My Wallet</h1>
        <p className="text-muted" style={{ marginBottom: '2rem' }}>Top up your balance to purchase and borrow books.</p>

        <div className="card fade-up">
          <div className="wallet-balance-box">
            <div className="wallet-balance-label">Current Balance</div>
            <div className="wallet-balance-amount">
              <span className="wallet-balance-currency">$</span>
              {balance !== null ? parseFloat(balance).toFixed(2) : '—'}
            </div>
            <p className="text-dim" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>Top up to see your balance</p>
          </div>

          <hr className="divider" />

          {msg.text && (
            <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ margin: '0 1.75rem 1rem' }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleTopup} style={{ padding: '0 1.75rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} id="wallet-topup-form">
            <div className="form-group">
              <label className="form-label" htmlFor="topup-amount">Amount (USD)</label>
              <input
                id="topup-amount"
                type="number"
                className="form-input"
                placeholder="e.g. 50.00"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {[10, 25, 50, 100].map(v => (
                <button key={v} type="button" className="btn btn-secondary btn-sm" onClick={() => setAmount(String(v))}>
                  +${v}
                </button>
              ))}
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="card-number">Card Number</label>
              <input
                id="card-number"
                type="text"
                className="form-input"
                placeholder="XXXX XXXX XXXX XXXX"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                required
              />
            </div>

            <button id="btn-topup" type="submit" className="btn btn-primary btn-full" disabled={loading || !amount || !cardNumber}>
              {loading ? <><span className="spinner spinner-sm" /> Processing…</> : 'Top Up Wallet'}
            </button>
          </form>
        </div>

        <div className="card fade-up" style={{ marginTop: '1.5rem', padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', lineHeight: 1.7 }}>
            <strong className="text-accent">How it works:</strong> Your wallet balance is stored in PostgreSQL with full audit logging.
            Every top-up, purchase, and late fee is recorded in the immutable <code style={{ color: 'var(--clr-teal)' }}>audit_log</code> table.
            Transfers are atomic — either the full transaction succeeds or nothing changes.
          </p>
        </div>
      </div>
    </main>
  );
}
