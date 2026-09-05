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

  async function setQuantity(albumId, quantity) {
    setError('');
    try {
      const data = await api(`/cart/items/${albumId}`, {
        method: 'PATCH',
        body: { quantity: Number(quantity) },
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

  return (
    <>
      <h1>Cart</h1>
      <p className="muted">Stored in order_db. Live price and stock come from the Catalog Service over HTTP.</p>
      {error && <div className="flash error">{error}</div>}
      {!cart.items.length ? (
        <p>Your cart is empty. <Link to="/">Browse albums</Link>.</p>
      ) : (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Album</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Line</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.album ? (
                      <Link to={`/albums/${item.albumId}`}>{item.album.title}</Link>
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
                      value={item.quantity}
                      onChange={(e) => setQuantity(item.albumId, e.target.value)}
                    />
                  </td>
                  <td>{item.lineTotal != null ? `$${item.lineTotal.toFixed(2)}` : '—'}</td>
                  <td>
                    <button className="btn secondary" type="button" onClick={() => setQuantity(item.albumId, 0)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
            <strong>Total ${total.toFixed(2)}</strong>
            <button className="btn" type="button" disabled={busy} onClick={checkout}>
              {busy ? 'Checking out…' : 'Checkout'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
