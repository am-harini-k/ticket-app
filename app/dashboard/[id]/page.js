'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

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

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params?.id
  const [user, setUser] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newAttachments, setNewAttachments] = useState([])
  const [uploadingAttachments, setUploadingAttachments] = useState(false)
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
    if (parsed.role !== 'user') {
      if (parsed.role === 'admin') router.replace('/admin')
      else if (parsed.role === 'agent') router.replace('/agent')
      else router.replace('/login')
      return
    }
    setUser(parsed)
    fetchData()
  }, [router, ticketId])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timeout)
  }, [toast])

  const showToast = (message) => {
    setToast(message)
  }

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || [])
    const combined = [...newAttachments, ...files]

    if (combined.length > 5) {
      setNewAttachments(combined.slice(0, 5))
      showToast('You can upload up to 5 attachments. Only the first 5 files were kept.')
    } else {
      setNewAttachments(combined)
    }

    event.target.value = ''
  }

  const handleAttachmentUpload = async (event) => {
    event.preventDefault()
    if (newAttachments.length === 0) return

    setUploadingAttachments(true)
    const token = window.localStorage.getItem('token')

    try {
      const formData = new FormData()
      newAttachments.forEach((file) => formData.append('attachments', file))

      const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        showToast(`✗ ${data?.message || 'Unable to upload attachments'}`)
        return
      }

      setTicket((prev) => prev ? { ...prev, attachments: [...(prev.attachments || []), ...(data.attachments || [])] } : prev)
      setNewAttachments([])
      showToast('✓ Attachments uploaded')
    } catch (err) {
      showToast('✗ Unable to upload attachments')
    } finally {
      setUploadingAttachments(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const token = window.localStorage.getItem('token')
    try {
      const ticketResponse = await fetch(`/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const ticketData = await ticketResponse.json()
      if (!ticketResponse.ok || !ticketData.success) {
        showToast('✗ Unable to load ticket')
        setLoading(false)
        return
      }
      setTicket(ticketData.ticket)
      const commentsResponse = await fetch(`/api/tickets/${ticketId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const commentsData = await commentsResponse.json()
      if (!commentsResponse.ok || !commentsData.success) {
        showToast('✗ Unable to load comments')
        setComments([])
      } else {
        setComments(commentsData.comments || [])
      }
    } catch (err) {
      showToast('✗ Unable to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    const token = window.localStorage.getItem('token')
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: commentText }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        const message = data?.message || 'Unable to post comment'
        showToast(`✗ ${message}`)
      } else {
        setComments((prev) => [...prev, data.comment])
        setCommentText('')
        showToast('✓ Comment added')
      }
    } catch (err) {
      showToast('✗ Unable to post comment')
    } finally {
      setSubmitting(false)
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

      <div style={{ maxWidth: '900px', margin: '32px auto 0' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '6px', padding: '10px 14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s', marginBottom: '20px' }}
        >
          ← Back
        </button>

        <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '28px' }}>
          {loading ? (
            <div style={{ color: '#4b5563' }}>Loading...</div>
          ) : ticket ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Ticket #{ticket.id}</div>
                  <h1 style={{ margin: '6px 0 0', fontSize: '28px', color: '#111827' }}>{ticket.title}</h1>
                </div>
                <StatusBadge status={ticket.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px', marginBottom: '24px' }}>
                {ticket.ai_summary ? (
                  <div style={{ background: '#eef2ff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '18px' }}>
                    <div style={{ color: '#1e3a8a', fontWeight: 600, marginBottom: '8px' }}>AI Summary</div>
                    <div style={{ color: '#1f2937' }}>{ticket.ai_summary}</div>
                  </div>
                ) : null}
                <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ marginBottom: '12px', color: '#4b5563', fontWeight: 600 }}>Description</div>
                  <div style={{ color: '#1f2937', whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '18px', flex: '1 1 220px' }}>
                    <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>Priority</div>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '18px', flex: '1 1 220px' }}>
                    <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>Created</div>
                    <div style={{ color: '#1f2937' }}>{new Date(ticket.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {ticket.resolution_notes ? (
                  <div style={{ background: '#e6f6ed', border: '1px solid #d1e7d5', borderRadius: '8px', padding: '18px' }}>
                    <div style={{ fontSize: '14px', color: '#1e7e4d', fontWeight: 600, marginBottom: '8px' }}>Resolution Notes</div>
                    <div style={{ color: '#134e2f', whiteSpace: 'pre-wrap' }}>{ticket.resolution_notes}</div>
                  </div>
                ) : null}
                {ticket.attachments?.length > 0 ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: '8px', padding: '18px' }}>
                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>Attachments</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#1f2937' }}>
                      {ticket.attachments.map((attachment) => (
                        <li key={attachment.id} style={{ marginBottom: '8px' }}>
                          <a href={attachment.file_path} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                            {attachment.file_name}
                          </a>
                          <div style={{ fontSize: '12px', color: '#4b5563' }}>
                            Uploaded by {attachment.uploaded_by_name || 'Unknown'} on {new Date(attachment.created_at).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div style={{ background: '#fff', border: '1px solid #e3e3e3', borderRadius: '8px', padding: '18px', marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#111827' }}>Upload new attachments</h3>
                  <form onSubmit={handleAttachmentUpload}>
                    <div style={{ marginBottom: '8px', color: '#4b5563', fontSize: '13px' }}>
                      You can upload up to 5 files at once.
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleAttachmentChange}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff', marginBottom: '12px' }}
                    />
                    {newAttachments.length > 0 ? (
                      <div style={{ marginBottom: '12px', color: '#4b5563', fontSize: '13px' }}>
                        Ready to upload:
                        <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                          {newAttachments.map((file, index) => (
                            <li key={`${file.name}-${index}`} style={{ marginBottom: '4px' }}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      disabled={uploadingAttachments}
                      style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '11px 16px', fontWeight: 600, cursor: uploadingAttachments ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                    >
                      {uploadingAttachments ? 'Uploading...' : 'Upload Attachments'}
                    </button>
                  </form>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Comments</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  {comments.length === 0 ? (
                    <div style={{ color: '#6b7280' }}>No comments yet.</div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#111827' }}>{comment.user_name}</span>
                          <span style={{ fontSize: '12px', color: '#4b5563', background: '#fff', border: '1px solid #d1d5db', borderRadius: '999px', padding: '4px 10px' }}>{comment.user_role}</span>
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ color: '#1f2937', whiteSpace: 'pre-wrap' }}>{comment.message}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleCommentSubmit}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#111827', fontWeight: 600 }}>Add a comment</label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                    rows={4}
                    style={{ width: '100%', padding: '10px', border: '1px solid #d8d8d8', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#fff', resize: 'vertical', marginBottom: '14px' }}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '11px 16px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ color: '#6b7280' }}>Ticket not found.</div>
          )}
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
