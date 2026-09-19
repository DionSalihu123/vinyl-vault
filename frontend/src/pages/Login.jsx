import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('user@vinylvault.local');
  const [password, setPassword] = useState('User123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form auth-box" onSubmit={onSubmit}>
      <h1>Hyr</h1>
      <p className="muted">Përdorues demo: user@vinylvault.local / User123! · Admin: admin@vinylvault.local / Admin123!</p>
      {error && <div className="flash error">{error}</div>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Fjalëkalimi
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" type="submit" disabled={busy}>Hyr</button>
        <Link to="/register">Keni nevojë për llogari?</Link>
      </div>
    </form>
  );
}
