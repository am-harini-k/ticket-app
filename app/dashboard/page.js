'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const badgeStyles = {
  open: { background: '#fdecea', color: '#c0392b' },
  in_progress: { background: '#fef6e0', color: '#a76b06' },
  resolved: { background: '#e6f6ed', color: '#1e7e4d' },
  closed: { background: '#f0f0f0', color: '#555' },
}

const priorityStyles = {
  critical: { background: '#fdecea', color: '#c0392b' },
  high: { background: '#ffedd9', color: '#b35c00' },
  medium: { background: '#e6f1fb', color: '#1d5fa8' },
  low: { background: '#f0f0f0', color: '#666' },
}

function StatusBadge({ status }) {
  const styles = badgeStyles[status] || badgeStyles.open
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, ...styles }}>
      {status.replace('_', ' ')}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const styles = priorityStyles[priority] || priorityStyles.low
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, ...styles }}>
      {priority}
    </span>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => {
    const token = window.localStorage.getItem('token')
    const userJson = window.localStorage.getItem('user')
    if (!token || !userJson) {
      router.replace('/login')
      return
    }
    let parsedUser
    try {
      parsedUser = JSON.parse(userJson)
    } catch (err) {
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('user')
      router.replace('/login')
      return
    }
    if (parsedUser.role !== 'user') {
      if (parsedUser.role === 'admin') router.replace('/admin')
      else if (parsedUser.role === 'agent') router.replace('/agent')
      else router.replace('/login')
      return
    }
    setUser(parsedUser)
    fetchTickets(token)
  }, [router])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timeout)
  }, [toast])

  const showToast = (message) => {
    setToast(message)
  }

  const fetchTickets = async (token) => {
    setLoading(true)
    try {
      const response = await fetch('/api/tickets', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        showToast('✗ Unable to load tickets')
        setTickets([])
      } else {
        setTickets(data.tickets || [])
      }
    } catch (error) {
      showToast('✗ Unable to load tickets')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f9' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px', background: '#1a1f2e', color: '#e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #2a3142' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>TaskHub</div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>Service Management</div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', fontSize: '14px', color: '#e5e7eb', background: '#252b3d', border: 'none', textAlign: 'left', cursor: 'pointer', borderLeft: '3px solid transparent' }}
        >
          <i className="ti ti-layout-dashboard" />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', fontSize: '14px', color: '#fff', background: '#2a3142', border: 'none', textAlign: 'left', cursor: 'pointer', borderLeft: '3px solid #4f46e5' }}
        >
          <i className="ti ti-ticket" />
          My Tickets
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', fontSize: '14px', color: '#e5e7eb', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
        >
          <i className="ti ti-plus" />
          New Ticket
        </button>
      </div>

      <div style={{ marginLeft: '220px', padding: '0 24px 40px' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e3e3e3', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#4f46e5' }}>TaskHub</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e6f1fb', color: '#1d5fa8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px' }}>
              {user?.name?.charAt(0)?.toUpperCase() || ''}
            </div>
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

        <div style={{ maxWidth: '1120px', margin: '32px auto 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>My Tickets</h2>
              <p style={{ margin: '6px 0 0', color: '#4b5563' }}>Your active and historical requests.</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/new')}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
            >
              + New Ticket
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '24px', color: '#4b5563' }}>Loading...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Ticket ID</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Title</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Category</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Priority</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Created</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '24px', color: '#6b7280' }}>No tickets found.</td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        onClick={() => router.push(`/dashboard/${ticket.id}`)}
                        onMouseEnter={() => setHoveredRow(ticket.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ cursor: 'pointer', background: hoveredRow === ticket.id ? '#f9fafb' : '#fff', transition: 'background 0.15s' }}
                      >
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#111827' }}>#{ticket.id}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#111827' }}>{ticket.title}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563' }}>{ticket.category}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3' }}><PriorityBadge priority={ticket.priority} /></td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3' }}><StatusBadge status={ticket.status} /></td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#6b7280' }}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#111827' }}>{ticket.assigned_to_email || ticket.assigned_to_name || 'Unassigned'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {toast ? (
          <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#111827', color: '#fff', padding: '12px 14px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999 }}>
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  )
}
