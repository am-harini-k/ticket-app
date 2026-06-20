import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

// PUT - assign or reassign ticket to an agent
export async function PUT(request, { params }) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'agent') {
      return Response.json({ success: false, message: 'Not allowed' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assigned_to } = body;

    const agentCheck = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [assigned_to]
    );

    if (agentCheck.rows.length === 0) {
      return Response.json({ success: false, message: 'Agent not found' }, { status: 404 });
    }

    const agent = agentCheck.rows[0];

    if (agent.role !== 'agent' && agent.role !== 'admin') {
      return Response.json({ success: false, message: 'Can only assign to an agent or admin' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE tickets 
       SET assigned_to = $1, status = 'in_progress' 
       WHERE id = $2 
       RETURNING *`,
      [assigned_to, id]
    );

    if (result.rows.length === 0) {
      return Response.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    const ticket = result.rows[0];

    await transporter.sendMail({
      from: `"Ticket App Support" <${process.env.GMAIL_USER}>`,
      to: agent.email,
      subject: `Ticket #${ticket.id} Assigned to You`,
      html: `
        <h2>Ticket Assigned to You</h2>
        <p>Hi ${agent.name},</p>
        <p>Ticket #${ticket.id} - "${ticket.title}" has been assigned to you.</p>
        <p><strong>Assigned By:</strong> ${user.name} (${user.role})</p>
        <p>Please check your dashboard to view details and take action.</p>
      `,
    });

    return Response.json({
      success: true,
      message: `Ticket assigned to ${agent.name}`,
      ticket: ticket,
    });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}