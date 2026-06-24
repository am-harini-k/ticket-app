'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
    const userJson = typeof window !== 'undefined' ? window.localStorage.getItem('user') : null
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson)
        if (user?.role === 'admin') router.replace('/admin')
        else if (user?.role === 'agent') router.replace('/agent')
        else router.replace('/dashboard')
      } catch (err) {
        window.localStorage.removeItem('token')
        window.localStorage.removeItem('user')
      }
    }
  }, [router])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timeout)
  }, [toast])

  const showToast = (message) => {
    setToast(message)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        const message = data?.message || data?.error || 'Invalid email or password'
        setError(message)
        showToast(`✗ ${message}`)
        setLoading(false)
        return
      }
      window.localStorage.setItem('token', data.token)
      window.localStorage.setItem('user', JSON.stringify(data.user))
      showToast('✓ Signed in successfully')
      if (data.user?.role === 'admin') router.push('/admin')
      else if (data.user?.role === 'agent') router.push('/agent')
      else router.push('/dashboard')
    } catch (err) {
      setError('Unable to sign in. Please try again.')
      showToast('✗ Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#111827' }}>Sign in to TaskHub</h1>
        <p style={{ marginTop: '10px', marginBottom: '24px', color: '#4b5563' }}>IT Service Management Portal</p>
        {error ? (
          <div style={{ marginBottom: '20px', color: '#c0392b', background: '#fdecea', padding: '12px 14px', borderRadius: '6px', border: '1px solid #f5c6c2' }}>
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#111827' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff', marginBottom: '16px' }}
          />

          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#111827' }}>Password</label>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f3f4f6', color: '#111827', cursor: 'pointer', padding: '6px 10px', fontSize: '12px', fontWeight: 600 }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '11px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
          >
            {loading ? 'Signing In...' : 'Sign In →'}
          </button>
        </form>
      </div>
      {toast ? (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#111827', color: '#fff', padding: '12px 14px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999 }}>
          {toast}
        </div>
      ) : null}
    </div>
  )
}
