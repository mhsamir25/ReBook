// src/pages/WalletPage.jsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function WalletPage() {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProfile()
      .then(profile => setBalance(profile.wallet_balance))
      .catch(() => setBalance(null));
  }, []);

  const isValidLuhn = (value) => {
    let check = 0;
    let even = false;
    const digits = value.replace(/\D/g, '');

    if (!digits || digits.length < 13 || digits.length > 19) return false;

    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = parseInt(digits.charAt(index), 10);
      if (even && (digit *= 2) > 9) digit -= 9;
      check += digit;
      even = !even;
    }

    return check % 10 === 0;
  };

  const handleTopup = async (event) => {
    event.preventDefault();
    if (!isValidLuhn(cardNumber)) {
      setMsg({ text: 'Please enter a valid credit/debit card number.', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await api.topupWallet(parseFloat(amount));
      setBalance(res.new_balance);
      setMsg({ text: `Wallet topped up! New balance: $${Number.parseFloat(res.new_balance).toFixed(2)}`, type: 'success' });
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
      <div className="container narrow-container">
        <header className="page-header">
          <h1 className="page-title">My Wallet</h1>
          <p className="page-subtitle">Top up your balance for purchases and rentals.</p>
        </header>

        <section className="card fade-up">
          <div className="wallet-balance-box">
            <div className="wallet-balance-label">Current Balance</div>
            <div className="wallet-balance-amount">
              <span className="wallet-balance-currency">$</span>
              {balance !== null ? Number.parseFloat(balance).toFixed(2) : '--'}
            </div>
          </div>

          <hr className="divider" />

          <div className="form-card">
            {msg.text && (
              <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleTopup} className="stack-form mt-2" id="wallet-topup-form">
              <div className="form-group">
                <label className="form-label" htmlFor="topup-amount">Amount (USD)</label>
                <input
                  id="topup-amount"
                  type="number"
                  className="form-input"
                  placeholder="50.00"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  required
                />
              </div>

              <div className="quick-amounts">
                {[10, 25, 50, 100].map(value => (
                  <button
                    key={value}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAmount(String(value))}
                  >
                    +${value}
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
                  onChange={event => setCardNumber(event.target.value)}
                  required
                />
              </div>

              <button id="btn-topup" type="submit" className="btn btn-primary btn-full" disabled={loading || !amount || !cardNumber}>
                {loading ? <><span className="spinner spinner-sm" /> Processing...</> : 'Top Up Wallet'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
