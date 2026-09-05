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
          <NavLink to="/">Catalog</NavLink>
          <NavLink to="/challenge">Random challenge</NavLink>
          {user && <NavLink to="/cart">Cart</NavLink>}
          {user && <NavLink to="/orders">Orders</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          {user ? (
            <>
              <span className="muted">{user.email}</span>
              {isAdmin && <span className="badge">ADMIN</span>}
              <button className="btn secondary" type="button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
