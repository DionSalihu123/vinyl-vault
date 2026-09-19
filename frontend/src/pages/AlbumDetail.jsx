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
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    api(`/albums/${id}`)
      .then((data) => {
        setAlbum(data.album);
        setQuantity(1);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), album?.stock || 1);
  const totalPreview = album ? album.price * safeQuantity : 0;

  async function addToCart() {
    if (!album) return;
    const finalQuantity = Math.min(Math.max(Number(quantity) || 1, 1), album.stock);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api('/cart/items', { method: 'POST', body: { albumId: album.id, quantity: finalQuantity } });
      setMessage(`Added ${finalQuantity} ${finalQuantity > 1 ? 'copies' : 'copy'} to cart.`);
      setQuantity(finalQuantity);
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
      <div className="detail-copy">
        <div className="status">{album.genre} · {album.releaseYear}</div>
        <h1>{album.title}</h1>
        <p className="meta detail-artist">{album.artist}</p>
        <p className="detail-description">{album.description}</p>

        <div className="detail-price-row">
          <span className="price detail-price">${album.price.toFixed(2)}</span>
          <span className={`stock-pill ${album.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
            {album.stock > 0 ? `${album.stock} në stok` : 'Nuk ka në stok'}
          </span>
          {album.stock > 0 && album.stock <= 5 && <span className="stock-pill low-stock">Mbetën pak</span>}
        </div>

        <div className="detail-total">
          <span>Subtotali</span>
          <strong>${totalPreview.toFixed(2)}</strong>
        </div>

        {error && <div className="flash error">{error}</div>}
        {message && <div className="flash ok">{message}</div>}
        <div className="row detail-controls">
          {user ? (
            <>
              <label className="qty-control">
                <span>Sasia</span>
                <input
                  type="number"
                  min="1"
                  max={album.stock}
                  value={safeQuantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(Number(e.target.value) || 1, album.stock)))}
                />
              </label>
              <button className="btn" type="button" disabled={busy || album.stock < 1} onClick={addToCart}>
                {album.stock < 1 ? 'Nuk ka në stok' : `Shto ${safeQuantity} në shportë`}
              </button>
            </>
          ) : (
            <Link className="btn" to="/login">Hyr për të blerë</Link>
          )}
          <Link className="btn secondary" to="/">Kthehu te katalogu</Link>
        </div>
      </div>
    </section>
  );
}
