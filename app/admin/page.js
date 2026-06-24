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

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [toast, setToast] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [view, setView] = useState('dashboard')
  const [dashboardFilter, setDashboardFilter] = useState('assigned')

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
    if (parsed.role !== 'admin') {
      router.replace('/dashboard')
      return
    }
    setUser(parsed)
    // if admin has no team or team is the generic 'General Team', default to dashboard (no team filtering)
    if (!parsed.team_name || parsed.team_name === 'General Team') {
      setView('dashboard')
    }
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
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        showToast('✗ Unable to load tickets')
        setTickets([])
      } else {
        // DEBUG: inspect tickets payload for assigned_to values
        try { console.log('DEBUG: fetched tickets', data.tickets) } catch (e) {}
        setTickets(data.tickets || [])
      }
    } catch (err) {
      showToast('✗ Unable to load tickets')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = filterStatus === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filterStatus)
  const raisedTickets = tickets.filter((ticket) => ticket.user_id === user?.id)

  // Determine what to render based on view
  let viewTitle = 'Admin Dashboard'
  let viewDescription = 'Manage all tickets across the system.'
  // When showing the main dashboard, exclude tickets the current admin raised (keep raised tickets in separate view)
  let viewTickets = []
  if (view === 'raised') {
    viewTickets = raisedTickets
    viewTitle = 'My Raised Tickets'
    viewDescription = 'Tickets you have raised.'
  } else if (view === 'assigned') {
    viewTickets = tickets.filter((t) => String(t.assigned_to) === String(user?.id))
    viewTitle = 'Assigned to Me'
    viewDescription = 'Tickets assigned to you.'
  } else if (view === 'team') {
    // show tickets that belong to the admin's team (requires team_name on ticket rows)
    viewTickets = tickets.filter((t) => t.team_name && t.team_name === user?.team_name)
    viewTitle = user?.team_name ? `${user.team_name} Tickets` : 'My Team Tickets'
    viewDescription = `Tickets under ${user?.team_name || 'your team'}.`
  } else if (view === 'dashboard') {
    // dashboard obeys dashboardFilter
    if (dashboardFilter === 'assigned') {
      viewTitle = 'Admin Dashboard — Assigned to Me'
      viewDescription = 'Tickets assigned to you.'
      viewTickets = tickets.filter((t) => String(t.assigned_to) === String(user?.id))
    } else if (dashboardFilter === 'team') {
      viewTitle = user?.team_name ? `${user.team_name} Tickets` : 'My Team Tickets'
      viewDescription = `Tickets under ${user?.team_name || 'your team'}.`
      viewTickets = tickets.filter((t) => t.team_name && t.team_name === user?.team_name)
    } else {
      viewTickets = filteredTickets.filter((t) => t.user_id !== user?.id)
    }
  } else {
    viewTickets = filteredTickets
  }
  let showFilterStatus = view === 'dashboard'

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7f9' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px', background: '#1a1f2e', color: '#e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #2a3142' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>TaskHub</div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>Service Management</div>
        </div>
        <button
          type="button"
          onClick={() => setView('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', fontSize: '14px', color: '#e5e7eb', background: view === 'dashboard' ? '#2a3142' : 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', borderLeft: view === 'dashboard' ? '3px solid #4f46e5' : '3px solid transparent' }}
        >
          <i className="ti ti-layout-dashboard" />
          Dashboard
        </button>
        <div style={{ padding: '10px 16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontSize: '12px', fontWeight: 600 }}>View</label>
          <select
            value={dashboardFilter}
            onChange={(e) => { setDashboardFilter(e.target.value); setView('dashboard'); }}
            style={{ width: '100%', padding: '10px', border: '1px solid #2a3142', borderRadius: '6px', background: '#1a1f2e', color: '#e5e7eb', fontSize: '14px' }}
          >
            <option value="assigned">Assigned to Me</option>
            <option value="team">My Team Tickets</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setView('raised')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', fontSize: '14px', color: '#e5e7eb', background: view === 'raised' ? '#2a3142' : 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', borderLeft: view === 'raised' ? '3px solid #4f46e5' : '3px solid transparent' }}
        >
          <i className="ti ti-ticket" />
          My Raised Tickets
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
              <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>{viewTitle}</h2>
              <p style={{ margin: '6px 0 0', color: '#4b5563' }}>{viewDescription}</p>
            </div>
            {showFilterStatus && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ color: '#4b5563', fontWeight: 600 }}>Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '10px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff' }}
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '24px', color: '#4b5563' }}>Loading...</div>
            ) : viewTickets.length === 0 ? (
              <div style={{ padding: '24px', color: '#4b5563' }}>No tickets found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Ticket ID</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Title</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Category</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Priority</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Raised By</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Created</th>
                    <th style={{ textAlign: 'left', padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563', fontSize: '14px' }}>Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {viewTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => router.push(`/admin/${ticket.id}`)}
                        onMouseEnter={() => setHoveredRow(ticket.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ cursor: 'pointer', background: hoveredRow === ticket.id ? '#f9fafb' : '#fff', transition: 'background 0.15s' }}
                      >
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#111827' }}>#{ticket.id}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#111827' }}>{ticket.title}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#4b5563' }}>{ticket.category}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3' }}><PriorityBadge priority={ticket.priority} /></td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3' }}><StatusBadge status={ticket.status} /></td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#111827' }}>{ticket.user_name || ticket.user_email || 'Unknown'}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#6b7280' }}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #e3e3e3', color: '#111827' }}>{ticket.assigned_to_email || ticket.assigned_to_name || 'Unassigned'}</td>
                      </tr>
                    ))}
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
