import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const data = await api('/cart');
    setCart(data);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  function clampQuantity(value, maxQty) {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.max(0, Math.min(Number(value), maxQty));
  }

  async function setQuantity(albumId, quantity) {
    setError('');
    try {
      const target = cart.items.find((item) => item.albumId === albumId);
      const maxQty = target?.album?.stock ?? 0;
      const safeQty = clampQuantity(quantity, maxQty);

      const data = await api(`/cart/items/${albumId}`, {
        method: 'PATCH',
        body: { quantity: Number(safeQty) },
      });
      setCart(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      await api('/orders/checkout', { method: 'POST', body: {} });
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const total = cart.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <h1>Shporta</h1>
      <p className="muted">Ruhet në order_db. Çmimet dhe stoku vijnë live nga Catalog Service.</p>
      {error && <div className="flash error">{error}</div>}
      {!cart.items.length ? (
        <p>Shporta juaj është e zbrazët. <Link to="/">Shfleto albume</Link>.</p>
      ) : (
        <div className="cart-layout">
          <div className="panel cart-panel">
            <table className="table">
              <thead>
                <tr>
                  <th>Albumi</th>
                  <th>Çmimi</th>
                  <th>Sasia</th>
                  <th>Totali</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => {
                  const maxQty = item.album?.stock ?? 0;
                  return (
                    <tr key={item.id}>
                      <td>
                        {item.album ? (
                          <div className="cart-item-meta">
                            <Link to={`/albums/${item.albumId}`}>{item.album.title}</Link>
                            <span className="muted">{item.album.artist}</span>
                          </div>
                        ) : (
                          <span>Album {item.albumId.slice(0, 8)}… (catalog unavailable)</span>
                        )}
                      </td>
                      <td>{item.album ? `$${item.album.price.toFixed(2)}` : '—'}</td>
                      <td>
                        <input
                          className="qty"
                          type="number"
                          min="0"
                          max={maxQty}
                          value={item.quantity}
                          onChange={(e) => {
                            const nextValue = Number(e.target.value);
                            if (Number.isNaN(nextValue)) return;
                            const capped = clampQuantity(nextValue, maxQty);
                            setQuantity(item.albumId, capped);
                          }}
                        />
                      </td>
                      <td>{item.lineTotal != null ? `$${item.lineTotal.toFixed(2)}` : '—'}</td>
                      <td>
                        <button className="btn secondary" type="button" onClick={() => setQuantity(item.albumId, 0)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <aside className="panel cart-summary">
            <h2>Përmbledhja e porosisë</h2>
            <div className="summary-row">
              <span>Artikuj</span>
              <strong>{itemCount}</strong>
            </div>
            <div className="summary-row">
              <span>Subtotali</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Dërgesa</span>
              <strong>Falas</strong>
            </div>
            <div className="summary-row total-row">
              <span>Totali</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            <button className="btn full-width" type="button" disabled={busy} onClick={checkout}>
              {busy ? 'Po përpunohet…' : 'Bli tani'}
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
