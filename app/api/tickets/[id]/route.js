import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

// helper function to verify token
function verifyToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - get single ticket
export async function GET(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json(
        { success: false, message: 'Please login first' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const result = await pool.query(
      `SELECT tickets.*, users.name as user_name, users.email as user_email,
              assignee.name as assigned_to_name, teams.name as team_name
       FROM tickets
       JOIN users ON tickets.user_id = users.id
       LEFT JOIN users assignee ON tickets.assigned_to = assignee.id
       LEFT JOIN teams ON tickets.team_id = teams.id
       WHERE tickets.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticket = result.rows[0];

    let canView = false;
    if (user.role === 'admin') {
      canView = true;
    } else if (user.role === 'agent') {
      if (ticket.assigned_to === user.id) {
        canView = true;
      } else {
        // allow agents who are explicit team members
        const teamMemberResult = await pool.query(
          'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
          [ticket.team_id, user.id]
        );
        if (teamMemberResult.rows.length > 0) {
          canView = true;
        } else {
          // or allow agents whose user.team_name matches the team's name
          if (ticket.team_id) {
            const teamResult = await pool.query('SELECT name FROM teams WHERE id = $1', [ticket.team_id]);
            const teamName = teamResult.rows[0] ? teamResult.rows[0].name : null;
            if (teamName && user.team_name && teamName === user.team_name) {
              canView = true;
            }
          }
        }
      }
    } else if (user.role === 'user') {
      canView = ticket.user_id === user.id;
    }

    if (!canView) {
      return Response.json(
        { success: false, message: 'Not allowed' },
        { status: 403 }
      );
    }

    const attachmentsResult = await pool.query(
      `SELECT attachments.*, users.name as uploaded_by_name
       FROM attachments
       LEFT JOIN users ON attachments.uploaded_by = users.id
       WHERE attachments.ticket_id = $1
       ORDER BY attachments.created_at ASC`,
      [id]
    );

    ticket.attachments = attachmentsResult.rows;

    return Response.json({
      success: true,
      ticket: ticket,
    });

  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// PUT - update ticket status (admin only)
// PUT - update ticket status (admin only)
export async function PUT(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json(
        { success: false, message: 'Please login first' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin' && user.role !== 'agent') {
      return Response.json(
        { success: false, message: 'Only admin or agent can update ticket status' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, resolution_notes } = body;

    const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!allowedStatuses.includes(status)) {
      return Response.json(
        { success: false, message: 'Invalid status value' },
        { status: 400 }
      );
    }

    // require resolution notes before closing
    if (status === 'closed' && !resolution_notes) {
      // check if resolution_notes already exists on the ticket from before
      const existing = await pool.query('SELECT resolution_notes FROM tickets WHERE id = $1', [id]);
      if (!existing.rows[0]?.resolution_notes) {
        return Response.json(
          { success: false, message: 'Resolution notes are required before closing a ticket' },
          { status: 400 }
        );
      }
    }

    const result = await pool.query(
      `UPDATE tickets 
       SET status = $1, resolution_notes = COALESCE($2, resolution_notes)
       WHERE id = $3 
       RETURNING *`,
      [status, resolution_notes || null, id]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 }
      );
    }

    const updatedTicket = result.rows[0];

    // get user details to send email
    const userResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [updatedTicket.user_id]
    );
    const ticketOwner = userResult.rows[0];

    // send status update email to customer
    const { sendStatusUpdateEmail } = await import('@/lib/email');
    await sendStatusUpdateEmail({
      ticketId: updatedTicket.id,
      title: updatedTicket.title,
      status: status,
      userEmail: ticketOwner.email,
      userName: ticketOwner.name,
    });

    // if resolved or closed, also notify the TL
    if (status === 'resolved' || status === 'closed') {
      const tlResult = await pool.query(`SELECT name, email FROM users WHERE role = 'admin' LIMIT 1`);

      if (tlResult.rows.length > 0) {
        const tl = tlResult.rows[0];
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"Ticket App Support" <${process.env.GMAIL_USER}>`,
          to: tl.email,
          subject: `Ticket #${updatedTicket.id} marked as ${status.toUpperCase()}`,
          html: `
            <h2>Ticket ${status === 'resolved' ? 'Resolved' : 'Closed'}</h2>
            <p>Hi ${tl.name},</p>
            <p>Ticket #${updatedTicket.id} - "${updatedTicket.title}" has been marked as <strong>${status.toUpperCase()}</strong> by ${user.name}.</p>
            <p><strong>Customer:</strong> ${ticketOwner.name} (${ticketOwner.email})</p>
          `,
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Ticket status updated',
      ticket: updatedTicket,
    });

  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - delete ticket (admin only)
export async function DELETE(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json(
        { success: false, message: 'Please login first' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return Response.json(
        { success: false, message: 'Only admin can delete tickets' },
        { status: 403 }
      );
    }

    const { id } = await params;

    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);

    return Response.json({
      success: true,
      message: 'Ticket deleted successfully',
    });

  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}