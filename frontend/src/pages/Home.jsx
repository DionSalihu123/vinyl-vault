import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
        <div className="hero-copy">
          <div className="status">Të zgjedhura për koleksionistët</div>
          <h1>Diska në të gjitha zhanret dhe dekadat.</h1>
          <p>
            Zbuloni botime të reja, vlera të rralla dhe favorita klasike nga arkiva.
            Shfletoni raftin, provoni sfidën e rastit dhe krijoni një koleksion që ndjehet personal.
          </p>
          <div className="hero-cta">
            <Link className="btn" to="/#catalog">Shfleto katalogun</Link>
            <Link className="btn secondary" to="/challenge">Provo sfidën</Link>
          </div>
          <div className="hero-stats">
            <div className="stat-box">
              <strong>{total}</strong>
              <span>albume</span>
            </div>
            <div className="stat-box">
              <strong>{genres.length}</strong>
              <span>zhanre</span>
            </div>
            <div className="stat-box">
              <strong>Live</strong>
              <span>sinkronizim stok</span>
            </div>
          </div>
        </div>

        <div className="panel hero-panel">
          <div className="status">Në raft</div>
          <h2>{total} albume</h2>
          <div className="mini-list">
            <div className="mini-item">
              <span>Zgjedhje të reja</span>
              <strong>{Math.min(albums.length, 3)}</strong>
            </div>
            <div className="mini-item">
              <span>Zhanre</span>
              <strong>{genres.length || 0}</strong>
            </div>
            <div className="mini-item">
              <span>Procesi i porosisë</span>
              <strong>Gati</strong>
            </div>
          </div>
          <p className="muted">Filtro sipas zhanrit, dekadës ose çmimit. Çdo album ka të dhëna të drejtpërdrejta të stokut.</p>
        </div>
      </section>

      {albums.length > 0 && (
        <section className="featured-section">
          <div className="section-header">
            <div>
              <div className="status">Të zgjedhura</div>
              <h2>Vitet e fundit në rotacion</h2>
            </div>
            <Link className="btn secondary" to="/challenge">Zgjedhje e rastit</Link>
          </div>

          <div className="featured-grid">
            {albums.slice(0, 4).map((album) => (
              <Link key={album.id} className="feature-card" to={`/albums/${album.id}`}>
                <img src={album.coverImageUrl} alt={`${album.title} cover`} />
                <div className="feature-card-body">
                  <span className="feature-tag">{album.genre}</span>
                  <h3>{album.title}</h3>
                  <p>{album.artist}</p>
                  <div className="feature-meta">
                    <strong>${album.price.toFixed(2)}</strong>
                    <span>{album.stock} available</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div id="catalog" className="catalog-header">
        <div>
          <div className="status">Katalogu</div>
          <h2>Shfleto raftin</h2>
        </div>
      </div>

      <div className="filters">
        <label>
          Kërko
          <input value={filters.search} onChange={(e) => update('search', e.target.value)} placeholder="Titulli ose artisti" />
        </label>
        <label>
          Zhanri
          <select value={filters.genre} onChange={(e) => update('genre', e.target.value)}>
            <option value="">Të gjitha</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </label>
        <label>
          Dekada
          <select value={filters.decade} onChange={(e) => update('decade', e.target.value)}>
            <option value="">Të gjitha</option>
            {[1950, 1960, 1970, 1980, 1990, 2000, 2010].map((decade) => (
              <option key={decade} value={decade}>{decade}s</option>
            ))}
          </select>
        </label>
        <label>
          Çmim min
          <input type="number" min="0" step="0.01" value={filters.minPrice} onChange={(e) => update('minPrice', e.target.value)} />
        </label>
        <label>
          Çmim max
          <input type="number" min="0" step="0.01" value={filters.maxPrice} onChange={(e) => update('maxPrice', e.target.value)} />
        </label>
        <label>
          Rendit
          <select value={filters.sort} onChange={(e) => update('sort', e.target.value)}>
            <option value="title_asc">Titulli</option>
            <option value="price_asc">Çmimi: i ulët deri i lartë</option>
            <option value="price_desc">Çmimi: i lartë deri i ulët</option>
            <option value="year_desc">Viti më i ri</option>
            <option value="year_asc">Viti më i vjetër</option>
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
