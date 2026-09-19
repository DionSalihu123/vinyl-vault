import { useEffect, useState } from 'react';
import { api } from '../api';
import AlbumCard from '../components/AlbumCard';

export default function Challenge() {
  const [genres, setGenres] = useState([]);
  const [form, setForm] = useState({ genre: '', decade: '', minPrice: '', maxPrice: '' });
  const [album, setAlbum] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/albums/meta/genres').then((data) => setGenres(data.genres)).catch(() => {});
  }, []);

  async function spin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setAlbum(null);
    const params = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '') params.set(key, value);
    });
    try {
      const data = await api(`/albums/random?${params.toString()}`);
      setAlbum(data.album);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Sfida e albumit të rastit</h1>
      <p className="muted">
        Vendos kriteret opsionale. Catalog Service zgjedh një rekord të përshtatshëm rastësisht nga catalog_db.
      </p>
      <form className="panel form" onSubmit={spin} style={{ margin: '20px 0' }}>
        <div className="filters" style={{ marginBottom: 16 }}>
          <label>
            Zhanri
            <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
              <option value="">Çdo</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </label>
          <label>
            Dekada
            <select value={form.decade} onChange={(e) => setForm({ ...form, decade: e.target.value })}>
              <option value="">Çdo</option>
              {[1950, 1960, 1970, 1980, 1990, 2000, 2010].map((decade) => (
                <option key={decade} value={decade}>{decade}s</option>
              ))}
            </select>
          </label>
          <label>
            Çmim min
            <input type="number" min="0" step="0.01" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} />
          </label>
          <label>
            Çmim max
            <input type="number" min="0" step="0.01" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} />
          </label>
        </div>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Po rrotullohet…' : 'Zgjidh albumin'}</button>
      </form>
      {error && <div className="flash error">{error}</div>}
      {album && (
        <div style={{ maxWidth: 280 }}>
          <AlbumCard album={album} />
        </div>
      )}
    </>
  );
}
