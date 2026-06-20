import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { summarizeTicket } from '@/lib/gemini';
import { sendTicketCreatedEmail, sendTeamAssignedEmail } from '@/lib/email';


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

// GET - fetch all tickets
export async function GET(request) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    let result;
    if (user.role === 'admin') {
      result = await pool.query(
        `SELECT tickets.*, users.name as user_name, users.email as user_email 
         FROM tickets 
         JOIN users ON tickets.user_id = users.id 
         ORDER BY tickets.created_at DESC`
      );
    } else if (user.role === 'agent') {
      result = await pool.query(
        `SELECT * FROM tickets 
         WHERE assigned_to = $1 OR user_id = $1
         ORDER BY created_at DESC`,
        [user.id]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM tickets 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [user.id]
      );
    }

    return Response.json({ success: true, tickets: result.rows });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST - create new ticket
export async function POST(request) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return Response.json({ success: false, message: 'Please login first' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, priority } = body;

    if (!title || !description) {
      return Response.json({ success: false, message: 'Title and description are required' }, { status: 400 });
    }

    const ticketCategory = category || 'general';
    const ticketPriority = priority || 'medium';

    // find matching team
    const teamResult = await pool.query(
      'SELECT id, name FROM teams WHERE category = $1',
      [ticketCategory]
    );
    const team = teamResult.rows[0] || null;
    const teamId = team ? team.id : null;

    // get AI summary
    const aiSummary = await summarizeTicket(title, description);

    // save ticket
    const result = await pool.query(
      `INSERT INTO tickets (title, description, user_id, category, team_id, ai_summary, priority) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [title, description, user.id, ticketCategory, teamId, aiSummary, ticketPriority]
    );

    const newTicket = result.rows[0];

    // get user details
    const userResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [user.id]);
    const userDetails = userResult.rows[0];

    // email confirmation to user
    await sendTicketCreatedEmail({
      ticketId: newTicket.id,
      title: newTicket.title,
      description: newTicket.description,
      userEmail: userDetails.email,
      userName: userDetails.name,
    });

    // notify TL (admin) about new ticket needing assignment
    // notify TL + all team members about new ticket
    // get TL name for "Assigned To" field in email
    const tlLookup = await pool.query(`SELECT name FROM users WHERE role = 'admin' LIMIT 1`);
    const tlName = tlLookup.rows[0] ? tlLookup.rows[0].name : 'Team Lead';

    // notify TL + all team members about new ticket
    const teamMembersQuery = await pool.query(
      `SELECT name, email FROM users WHERE role = 'admin'
       UNION
       SELECT users.name, users.email 
       FROM team_members 
       JOIN users ON team_members.user_id = users.id 
       WHERE team_members.team_id = $1`,
      [teamId]
    );

    if (teamMembersQuery.rows.length > 0) {
      await sendTeamAssignedEmail({
        teamMembers: teamMembersQuery.rows,
        ticketId: newTicket.id,
        title: newTicket.title,
        description: newTicket.description,
        openedFor: userDetails.name,
        openedForEmail: userDetails.email,
        category: team ? team.name : 'General',
        status: 'Open',
        tlName: tlName,
        priority: newTicket.priority,
      });
    }

    return Response.json({
      success: true,
      message: 'Ticket created successfully',
      ticket: newTicket,
      routedToTeam: team ? team.name : 'No matching team',
    });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}