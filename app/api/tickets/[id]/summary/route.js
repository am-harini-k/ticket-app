import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { summarizeTicket } from '@/lib/gemini';

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

export async function GET(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    // accept id from route param or query string for robustness
    const url = new URL(request.url);
    // `params` can be a Promise in Next.js App Router — await it before use
    let { id } = await params;
    if ((!id || typeof id !== 'string' || !id.trim()) && url.searchParams.get('id')) {
      id = url.searchParams.get('id');
    }

    console.log('[SUMMARY] requested id=', id);

    if (!id || typeof id !== 'string' || !id.trim()) {
      return Response.json({ success: false, message: 'Ticket ID is required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT tickets.*, users.name as user_name, users.email as user_email, assignee.name as assigned_to_name, teams.name as team_name
       FROM tickets
       JOIN users ON tickets.user_id = users.id
       LEFT JOIN users assignee ON tickets.assigned_to = assignee.id
       LEFT JOIN teams ON tickets.team_id = teams.id
       WHERE tickets.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return Response.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    const ticket = result.rows[0];

    const commentsResult = await pool.query(
      `SELECT comments.*, users.name as user_name
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE comments.ticket_id = $1
       ORDER BY comments.created_at ASC`,
      [id]
    );

    ticket.comments = commentsResult.rows;

    const summary = await summarizeTicket(ticket);

    return Response.json({ success: true, summary });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
