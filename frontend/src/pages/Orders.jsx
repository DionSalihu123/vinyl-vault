import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Orders() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  async function refresh() {
    const data = await api('/orders');
    setOrders(data.orders);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  async function updateStatus(id, status) {
    setError('');
    try {
      await api(`/orders/${id}/status`, { method: 'PATCH', body: { status } });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1>{isAdmin ? 'Të gjitha porositë' : 'Historia e porosive'}</h1>
      <p className="muted">
        Artikujt ruajnë titullin dhe çmimin e njësisë nga porosia, kështu që modifikimet e ardhshme të katalogut nuk e rishkruajnë historinë.
      </p>
      {error && <div className="flash error">{error}</div>}
      {!orders.length && <p>Ende nuk ka porosi.</p>}
      {orders.map((order) => (
        <article className="panel" key={order.id} style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="status">{order.status}</div>
              <strong>{new Date(order.createdAt).toLocaleString()}</strong>
              <div className="muted">Order {order.id}</div>
            </div>
            <div>
              <div className="price">${order.total.toFixed(2)}</div>
              {isAdmin && order.status !== 'CANCELLED' && (
                <div className="row" style={{ marginTop: 8 }}>
                  {order.status !== 'SHIPPED' && (
                    <button className="btn secondary" type="button" onClick={() => updateStatus(order.id, 'SHIPPED')}>
                      Shëno si dërguar
                    </button>
                  )}
                  <button className="btn danger" type="button" onClick={() => updateStatus(order.id, 'CANCELLED')}>
                    Anulo & ricjell stokun
                  </button>
                </div>
              )}
            </div>
          </div>
          <table className="table">
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.albumTitle}</td>
                  <td className="muted">{item.artist}</td>
                  <td>× {item.quantity}</td>
                  <td>${item.unitPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </>
  );
}
