'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'admin') router.push('/admin');
      else if (data.user.role === 'agent') router.push('/agent');
      else router.push('/dashboard');
    } else {
      setError(data.message);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '380px', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#0b5ed7' }}>TaskHun</div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>IT Service Management Portal</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
              required
            />
          </div>

          {error && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#0b5ed7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}