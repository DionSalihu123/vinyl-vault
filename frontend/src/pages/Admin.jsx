import { useEffect, useState } from 'react';
import { api } from '../api';

const blank = {
  title: '',
  artist: '',
  genre: '',
  releaseYear: 1980,
  price: 19.99,
  stock: 5,
  description: '',
  coverImageUrl: 'https://picsum.photos/seed/newvinyl/600/600',
};

export default function Admin() {
  const [albums, setAlbums] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function refresh() {
    const data = await api('/albums?limit=50&sort=title_asc');
    setAlbums(data.albums);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
  }, []);

  function startEdit(album) {
    setEditingId(album.id);
    setForm({
      title: album.title,
      artist: album.artist,
      genre: album.genre,
      releaseYear: album.releaseYear,
      price: album.price,
      stock: album.stock,
      description: album.description || '',
      coverImageUrl: album.coverImageUrl || '',
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    const payload = {
      ...form,
      releaseYear: Number(form.releaseYear),
      price: Number(form.price),
      stock: Number(form.stock),
    };
    try {
      if (editingId) {
        await api(`/albums/${editingId}`, { method: 'PUT', body: payload });
        setMessage('Album updated.');
      } else {
        await api('/albums', { method: 'POST', body: payload });
        setMessage('Album created.');
      }
      setForm(blank);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this album from the catalog?')) return;
    setError('');
    try {
      await api(`/albums/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h1>Admin i katalogut</h1>
      <p className="muted">Nevojitet roli ADMIN i JWT-së. Shkrimet shkojnë vetëm te catalog_db.</p>
      {error && <div className="flash error">{error}</div>}
      {message && <div className="flash ok">{message}</div>}

      <form className="panel form" onSubmit={onSubmit} style={{ marginBottom: 24 }}>
        <h2>{editingId ? 'Redakto albumin' : 'Album i ri'}</h2>
        <div className="filters">
          <label>Titulli<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Artisti<input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} required /></label>
          <label>Zhanri<input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} required /></label>
          <label>Viti<input type="number" value={form.releaseYear} onChange={(e) => setForm({ ...form, releaseYear: e.target.value })} required /></label>
          <label>Çmimi<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
          <label>Stoku<input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></label>
        </div>
        <label>URL e fotos së kopertinës<input value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} /></label>
        <label>Përshkrimi<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" type="submit">{editingId ? 'Ruaj ndryshimet' : 'Krijo album'}</button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={() => { setEditingId(null); setForm(blank); }}>
              Anulo redaktimin
            </button>
          )}
        </div>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Titulli</th>
            <th>Artisti</th>
            <th>Viti</th>
            <th>Çmimi</th>
            <th>Stoku</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {albums.map((album) => (
            <tr key={album.id}>
              <td>{album.title}</td>
              <td>{album.artist}</td>
              <td>{album.releaseYear}</td>
              <td>${album.price.toFixed(2)}</td>
              <td>{album.stock}</td>
              <td className="row">
                <button className="btn secondary" type="button" onClick={() => startEdit(album)}>Redakto</button>
                <button className="btn danger" type="button" onClick={() => remove(album.id)}>Fshij</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
