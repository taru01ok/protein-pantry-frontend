import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await register(form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      navigate('/dashboard');
    } catch (err) {
      setError('Username already exists or registration failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={{ position: 'absolute', fontSize: '100px', opacity: 0.07, top: '10%', right: '5%' }}>🌱</div>
      <div style={{ position: 'absolute', fontSize: '80px', opacity: 0.07, bottom: '10%', left: '5%' }}>🥦</div>

      <div style={styles.card}>
        <div style={styles.iconWrap}>🌱</div>
        <h1 style={styles.title}>Join Protein Pantry</h1>
        <p style={styles.subtitle}>Start tracking your protein staples today 💪</p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>👤</span>
            <input
              style={styles.input}
              placeholder="Choose a username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div style={styles.inputWrap}>
            <span style={styles.inputIcon}>🔒</span>
            <input
              style={styles.input}
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button style={styles.button} type="submit">Create Account →</button>
        </form>

        <p style={styles.link}>
          Already have an account? <Link to="/" style={{ color: '#2c5f2d', fontWeight: '700' }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a3a1a 0%, #2c5f2d 40%, #4a8c5c 70%, #7dbf8e 100%)',
    position: 'relative', overflow: 'hidden', fontFamily: "'Segoe UI', sans-serif"
  },
  blob1: {
    position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,195,74,0.2), transparent)',
    top: '-150px', right: '-150px'
  },
  blob2: {
    position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(212,168,83,0.15), transparent)',
    bottom: '-100px', left: '-100px'
  },
  card: {
    position: 'relative', zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.97)',
    padding: '48px 44px', borderRadius: '28px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
    width: '100%', maxWidth: '440px',
    backdropFilter: 'blur(20px)'
  },
  iconWrap: { fontSize: '52px', textAlign: 'center', marginBottom: '8px', display: 'block' },
  title: { textAlign: 'center', color: '#1a3a1a', marginBottom: '4px', fontSize: '28px', fontWeight: '800' },
  subtitle: { textAlign: 'center', color: '#7a9e7a', marginBottom: '28px', fontSize: '14px', fontWeight: '500' },
  inputWrap: { position: 'relative', marginBottom: '16px' },
  inputIcon: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' },
  input: {
    width: '100%', padding: '14px 14px 14px 46px', borderRadius: '14px',
    border: '2px solid #d8ead8', fontSize: '15px', boxSizing: 'border-box',
    outline: 'none', backgroundColor: '#f8fdf8', color: '#2c3e1f'
  },
  button: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #1a3a1a, #2c5f2d, #52b788)',
    color: 'white', border: 'none', borderRadius: '14px',
    fontSize: '16px', cursor: 'pointer', fontWeight: '800',
    boxShadow: '0 6px 20px rgba(44,95,45,0.45)', marginTop: '4px'
  },
  error: {
    color: '#c0392b', textAlign: 'center', marginBottom: '16px',
    backgroundColor: '#fdecea', padding: '12px', borderRadius: '10px',
    fontSize: '14px', fontWeight: '600'
  },
  link: { textAlign: 'center', marginTop: '20px', color: '#888', fontSize: '14px' }
};