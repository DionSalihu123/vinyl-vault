import { useEffect, useState } from 'react';
import { api } from '../api';
import AlbumCard from '../components/AlbumCard';

const emptyFilters = {
  search: '',
  genre: '',
  decade: '',
  minPrice: '',
  maxPrice: '',
  sort: 'title_asc',
};

export default function Home() {
  const [filters, setFilters] = useState(emptyFilters);
  const [genres, setGenres] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/albums/meta/genres').then((data) => setGenres(data.genres)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '') params.set(key, value);
    });
    api(`/albums?${params.toString()}`)
      .then((data) => {
        setAlbums(data.albums);
        setTotal(data.total);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [filters]);

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <>
      <section className="hero">
        <div>
          <h1>Records across genres and decades.</h1>
          <p>
            Browse the catalog, take the random album challenge, and check out through a
            dedicated order service. Each backend owns its own database.
          </p>
        </div>
        <div className="panel">
          <div className="status">In the bins</div>
          <h2 style={{ margin: '8px 0' }}>{total} albums</h2>
          <p className="muted">Filter by genre, decade, or price. Sorting never leaves the Catalog Service.</p>
        </div>
      </section>

      <div className="filters">
        <label>
          Search
          <input value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Title or artist" />
        </label>
        <label>
          Genre
          <select value={filters.genre} onChange={(e) => update('genre', e.target.value)}>
            <option value="">All</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </label>
        <label>
          Decade
          <select value={filters.decade} onChange={(e) => update('decade', e.target.value)}>
            <option value="">All</option>
            {[1950, 1960, 1970, 1980, 1990, 2000, 2010].map((decade) => (
              <option key={decade} value={decade}>{decade}s</option>
            ))}
          </select>
        </label>
        <label>
          Min price
          <input type="number" min="0" step="0.01" value={filters.minPrice} onChange={(e) => update('minPrice', e.target.value)} />
        </label>
        <label>
          Max price
          <input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={(e) => update('maxPrice', e.target.value)} />
        </label>
        <label>
          Sort
          <select value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
            <option value="title_asc">Title</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="year_desc">Newest year</option>
            <option value="year_asc">Oldest year</option>
          </select>
        </label>
      </div>

      {error && <div className="flash error">{error}</div>}
      <div className="grid">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </>
  );
}
