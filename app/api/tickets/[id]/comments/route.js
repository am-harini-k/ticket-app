import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

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

// GET - fetch all comments for a ticket
export async function GET(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    const { id } = await params;

    const result = await pool.query(
      `SELECT comments.*, users.name as user_name, users.role as user_role
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE comments.ticket_id = $1
       ORDER BY comments.created_at ASC`,
      [id]
    );

    return Response.json({ success: true, comments: result.rows });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - add a new comment
export async function POST(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return Response.json({ success: false, message: 'Comment message is required' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, user.id, message]
    );

    return Response.json({
      success: true,
      message: 'Comment added',
      comment: result.rows[0],
    });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}