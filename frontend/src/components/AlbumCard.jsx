import { Link } from 'react-router-dom';

export default function AlbumCard({ album }) {
  return (
    <article className="card">
      <Link to={`/albums/${album.id}`}>
        <img src={album.coverImageUrl} alt={`${album.title} cover`} />
      </Link>
      <div className="card-body">
        <h3>
          <Link to={`/albums/${album.id}`}>{album.title}</Link>
        </h3>
        <div className="meta">{album.artist}</div>
        <div className="meta">
          {album.genre} · {album.releaseYear} · {album.stock} in stock
        </div>
        <div className="price">${album.price.toFixed(2)}</div>
      </div>
    </article>
  );
}
