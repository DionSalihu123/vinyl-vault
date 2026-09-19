import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form auth-box" onSubmit={onSubmit}>
      <h1>Krijo llogari</h1>
      <p className="muted">Llogaritë e reja marrin rolin USER nga Auth Service.</p>
      {error && <div className="flash error">{error}</div>}
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Fjalëkalimi
        <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" type="submit" disabled={busy}>Regjistrohu</button>
        <Link to="/login">Tashmë i regjistruar?</Link>
      </div>
    </form>
  );
}
