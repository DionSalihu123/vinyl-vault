import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import AlbumDetail from './pages/AlbumDetail';
import Challenge from './pages/Challenge';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Admin from './pages/Admin';

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted">Loading session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { isAdmin, ready, user } = useAuth();
  if (!ready) return <p className="muted">Loading session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <p className="flash error">Administrator access required.</p>;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/albums/:id" element={<AlbumDetail />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/cart" element={<Protected><Cart /></Protected>} />
        <Route path="/orders" element={<Protected><Orders /></Protected>} />
        <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
      </Route>
    </Routes>
  );
}
