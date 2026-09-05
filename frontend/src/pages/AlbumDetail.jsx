import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function AlbumDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [album, setAlbum] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/albums/${id}`)
      .then((data) => setAlbum(data.album))
      .catch((err) => setError(err.message));
  }, [id]);

  async function addToCart() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/cart/items', { method: 'POST', body: { albumId: album.id, quantity: 1 } });
      setMessage('Added to cart.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !album) return <div className="flash error">{error}</div>;
  if (!album) return <p className="muted">Loading album…</p>;

  return (
    <section className="detail">
      <img src={album.coverImageUrl} alt={`${album.title} cover`} />
      <div>
        <div className="status">{album.genre} · {album.releaseYear}</div>
        <h1>{album.title}</h1>
        <p className="meta" style={{ fontSize: 18 }}>{album.artist}</p>
        <p>{album.description}</p>
        <p className="price">${album.price.toFixed(2)} · {album.stock} in stock</p>
        {error && <div className="flash error">{error}</div>}
        {message && <div className="flash ok">{message}</div>}
        <div className="row">
          {user ? (
            <button className="btn" type="button" disabled={busy || album.stock < 1} onClick={addToCart}>
              {album.stock < 1 ? 'Out of stock' : 'Add to cart'}
            </button>
          ) : (
            <Link className="btn" to="/login">Log in to buy</Link>
          )}
          <Link className="btn secondary" to="/">Back to catalog</Link>
        </div>
      </div>
    </section>
  );
}
