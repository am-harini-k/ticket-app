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

export async function GET(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    const { id } = await params;
    const ticketResult = await pool.query(
      'SELECT user_id, assigned_to, team_id FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return Response.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    const ticket = ticketResult.rows[0];
    let canView = false;

    if (user.role === 'admin') {
      canView = true;
    } else if (user.role === 'agent') {
      if (ticket.assigned_to === user.id) {
        canView = true;
      } else {
        const teamMemberResult = await pool.query(
          'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
          [ticket.team_id, user.id]
        );
        if (teamMemberResult.rows.length > 0) {
          canView = true;
        } else if (ticket.team_id) {
          const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [ticket.team_id]);
          const teamName = teamResult.rows[0] ? teamResult.rows[0].name : null;
          if (teamName && user.team_name && teamName === user.team_name) {
            canView = true;
          }
        }
      }
    } else if (user.role === 'user') {
      canView = ticket.user_id === user.id;
    }

    if (!canView) {
      return Response.json({ success: false, message: 'Not allowed' }, { status: 403 });
    }

    if (!ticket.team_id) {
      return Response.json({ success: true, members: [] });
    }

    const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [ticket.team_id]);
    const teamName = teamResult.rows[0] ? teamResult.rows[0].name : null;

    if (!teamName) {
      return Response.json({ success: true, members: [] });
    }

    const membersResult = await pool.query(
      `SELECT id, name, email, role
       FROM users
       WHERE role IN ('admin', 'agent')
         AND team_name = $1
       ORDER BY name`,
      [teamName]
    );

    return Response.json({ success: true, members: membersResult.rows });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
