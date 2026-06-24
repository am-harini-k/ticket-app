import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { saveFilesToDisk } from '@/lib/attachments';

function verifyToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function POST(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    const ticketId = params.id;
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (ticketResult.rows.length === 0) {
      return Response.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    const ticket = ticketResult.rows[0];
    const isOwner = ticket.user_id === user.id;
    const isAdmin = user.role === 'admin';
    const isAssigned = ticket.assigned_to === user.id;
    const isTeamMember = user.role === 'agent'
      ? (await pool.query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [ticket.team_id, user.id])).rows.length > 0
      : false;

    if (!isAdmin && !isOwner && !isAssigned && !isTeamMember) {
      return Response.json({ success: false, message: 'Not allowed to add attachments to this ticket' }, { status: 403 });
    }

    const formData = await request.formData();
    const newAttachments = formData.getAll('attachments');
    let fileItems = Array.isArray(newAttachments) ? newAttachments.filter((item) => item && typeof item.arrayBuffer === 'function') : [];

    if (fileItems.length === 0) {
      return Response.json({ success: false, message: 'At least one attachment is required' }, { status: 400 });
    }

    if (fileItems.length > 5) {
      fileItems = fileItems.slice(0, 5);
    }

    const savedFiles = await saveFilesToDisk(ticketId, fileItems);
    const insertedAttachments = [];

    for (const attachment of savedFiles) {
      const insertResult = await pool.query(
        `INSERT INTO attachments (ticket_id, file_name, file_path, mime_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, file_name, file_path, mime_type, uploaded_by, created_at`,
        [ticketId, attachment.file_name, attachment.file_path, attachment.mime_type, user.id]
      );
      insertedAttachments.push(insertResult.rows[0]);
    }

    return Response.json({ success: true, message: 'Attachments uploaded', attachments: insertedAttachments });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
