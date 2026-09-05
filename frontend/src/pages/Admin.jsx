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
      <h1>Catalog admin</h1>
      <p className="muted">JWT role ADMIN is required. Writes go only to catalog_db.</p>
      {error && <div className="flash error">{error}</div>}
      {message && <div className="flash ok">{message}</div>}

      <form className="panel form" onSubmit={onSubmit} style={{ marginBottom: 24 }}>
        <h2>{editingId ? 'Edit album' : 'New album'}</h2>
        <div className="filters">
          <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Artist<input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} required /></label>
          <label>Genre<input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} required /></label>
          <label>Year<input type="number" value={form.releaseYear} onChange={(e) => setForm({ ...form, releaseYear: e.target.value })} required /></label>
          <label>Price<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
          <label>Stock<input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></label>
        </div>
        <label>Cover image URL<input value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} /></label>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" type="submit">{editingId ? 'Save changes' : 'Create album'}</button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={() => { setEditingId(null); setForm(blank); }}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Year</th>
            <th>Price</th>
            <th>Stock</th>
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
                <button className="btn secondary" type="button" onClick={() => startEdit(album)}>Edit</button>
                <button className="btn danger" type="button" onClick={() => remove(album.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
