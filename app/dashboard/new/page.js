'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTicketPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('technical')
  const [priority, setPriority] = useState('medium')
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const token = window.localStorage.getItem('token')
    const userJson = window.localStorage.getItem('user')
    if (!token || !userJson) {
      router.replace('/login')
      return
    }
    let parsed
    try {
      parsed = JSON.parse(userJson)
    } catch (err) {
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('user')
      router.replace('/login')
      return
    }
    if (parsed.role === 'admin') {
      // Allow admin to create tickets; don't redirect
      setUser(parsed)
      return
    }
    if (parsed.role !== 'user' && parsed.role !== 'agent') {
      router.replace('/login')
      return
    }
    setUser(parsed)
  }, [router])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timeout)
  }, [toast])

  const showToast = (message) => {
    setToast(message)
  }

  const removeAttachment = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    const combined = [...attachments, ...files]

    if (combined.length > 5) {
      setAttachments(combined.slice(0, 5))
      showToast('You can upload up to 5 attachments. Only the first 5 files were kept.')
    } else {
      setAttachments(combined)
    }

    event.target.value = ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const token = window.localStorage.getItem('token')
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('category', category)
      // If category is 'general', assign to admin by default; backend will handle but include hint
      if (category === 'general') {
        formData.append('assign_to_admin', '1')
      }
      formData.append('priority', priority)
      attachments.forEach((file) => formData.append('attachments', file))

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        const message = data?.message || 'Failed to create ticket'
        setError(message)
        showToast(`✗ ${message}`)
        setLoading(false)
        return
      }
      showToast('✓ Ticket created')
      router.push('/dashboard')
    } catch (err) {
      setError('Unable to create ticket. Please try again.')
      showToast('✗ Unable to create ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f9', padding: '0 24px 40px' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e3e3e3', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#4f46e5' }}>TaskHub</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#1f2937' }}>{user?.name || ''}</span>
          <button
            onClick={() => {
              window.localStorage.removeItem('token')
              window.localStorage.removeItem('user')
              router.push('/login')
            }}
            style={{ background: '#fdecea', color: '#c0392b', border: '1px solid #f5c6c2', borderRadius: '6px', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '32px auto 0' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '6px', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s', marginBottom: '20px' }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Create New Ticket</h2>
          <p style={{ margin: '10px 0 24px', color: '#4b5563' }}>Provide the details so your request can be triaged quickly.</p>

          {error ? (
            <div style={{ marginBottom: '18px', color: '#c0392b', background: '#fdecea', padding: '12px 14px', borderRadius: '6px', border: '1px solid #f5c6c2' }}>
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#111827', fontWeight: 600 }}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#111827', fontWeight: 600 }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={6}
                style={{ width: '100%', padding: '10px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#111827', fontWeight: 600 }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff' }}
                >
                  <option value="login">login</option>
                  <option value="payment">payment</option>
                  <option value="whatsapp">whatsapp</option>
                  <option value="account">account</option>
                  <option value="technical">technical</option>
                  <option value="general">general</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#111827', fontWeight: 600 }}>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff' }}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#111827', fontWeight: 600 }}>Attachments</label>
              <div style={{ marginBottom: '10px', color: '#4b5563', fontSize: '13px' }}>
                Upload documents, images, PDFs, or other files for this ticket.
              </div>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileChange}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff' }}
              />
              {attachments.length > 0 ? (
                <div style={{ marginTop: '12px', color: '#4b5563', fontSize: '13px' }}>
                  Attached files ({attachments.length}):
                  <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                    {attachments.map((file, index) => (
                      <li key={`${file.name}-${index}`} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '11px 16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
            >
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      </div>

      {toast ? (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#111827', color: '#fff', padding: '12px 14px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999 }}>
          {toast}
        </div>
      ) : null}
    </div>
  )
}
