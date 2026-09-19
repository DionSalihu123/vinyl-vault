import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Vinyl <span>Vault</span>
        </NavLink>
        <nav className="nav">
          <NavLink to="/">Katalogu</NavLink>
          <NavLink to="/challenge">Sfida e rastit</NavLink>
          {user && <NavLink to="/cart">Shporta</NavLink>}
          {user && <NavLink to="/orders">Porositë</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <>
              <span className="muted">{user.email}</span>
              {isAdmin && <span className="badge">ADMIN</span>}
              <button className="btn secondary" type="button" onClick={logout}>
                Dil
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Hyr</NavLink>
              <NavLink to="/register">Regjistrohu</NavLink>
            </>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
