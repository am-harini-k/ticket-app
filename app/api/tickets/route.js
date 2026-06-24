import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { summarizeTicket } from '@/lib/gemini';
import { sendTicketCreatedEmail, sendTeamAssignedEmail } from '@/lib/email';
import { saveFilesToDisk } from '@/lib/attachments';


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
    // include assignee email so UI can display the assigned user's email
    if (user.role === 'admin') {
      result = await pool.query(
        `SELECT tickets.*, users.name as user_name, users.email as user_email,
                assignee.name as assigned_to_name, assignee.email as assigned_to_email,
                teams.name as team_name
         FROM tickets
         JOIN users ON tickets.user_id = users.id
         LEFT JOIN users assignee ON tickets.assigned_to = assignee.id
         LEFT JOIN teams ON tickets.team_id = teams.id
         ORDER BY tickets.created_at DESC`
      );
    } else if (user.role === 'agent') {
      // include tickets the agent raised, tickets assigned to them, tickets for their team
      result = await pool.query(
        `SELECT tickets.*, 
                assignee.name as assigned_to_name, assignee.email as assigned_to_email,
                teams.name as team_name
         FROM tickets
         LEFT JOIN users assignee ON tickets.assigned_to = assignee.id
         LEFT JOIN teams ON tickets.team_id = teams.id
         WHERE tickets.user_id = $1
            OR tickets.assigned_to = $2
            OR tickets.team_id IN (
                 SELECT team_id FROM team_members WHERE user_id = $1
               )
            OR (teams.name = $3)
         ORDER BY tickets.created_at DESC`,
        [user.id, user.id, user.team_name]
      );
    } else {
      result = await pool.query(
        `SELECT tickets.*, assignee.name as assigned_to_name, assignee.email as assigned_to_email
         FROM tickets
         LEFT JOIN users assignee ON tickets.assigned_to = assignee.id
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

    let title;
    let description;
    let category;
    let priority;
    let attachments = [];
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = formData.get('title');
      description = formData.get('description');
      category = formData.get('category');
      priority = formData.get('priority');
      const rawAttachments = formData.getAll('attachments') || [];
      attachments = Array.isArray(rawAttachments)
        ? rawAttachments.filter((file) => file && typeof file.arrayBuffer === 'function')
        : [];
    } else {
      const body = await request.json();
      title = body.title;
      description = body.description;
      category = body.category;
      priority = body.priority;
    }

    if (!title || !description) {
      return Response.json({ success: false, message: 'Title and description are required' }, { status: 400 });
    }

    if (attachments.length > 5) {
      return Response.json({ success: false, message: 'You can upload up to 5 attachments per ticket.' }, { status: 400 });
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

    // determine default assignee: if category is 'general', assign to an admin
    let defaultAssignee = null;
    if (ticketCategory === 'general') {
      const adminLookup = await pool.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
      if (adminLookup.rows.length > 0) defaultAssignee = adminLookup.rows[0].id;
    }

    // save ticket (include assigned_to if defaultAssignee is set)
    const insertQuery = defaultAssignee
      ? `INSERT INTO tickets (title, description, user_id, category, team_id, ai_summary, priority, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`
      : `INSERT INTO tickets (title, description, user_id, category, team_id, ai_summary, priority) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;

    const insertParams = defaultAssignee
      ? [title, description, user.id, ticketCategory, teamId, aiSummary, ticketPriority, defaultAssignee]
      : [title, description, user.id, ticketCategory, teamId, aiSummary, ticketPriority];

    const result = await pool.query(insertQuery, insertParams);

    const newTicket = result.rows[0];
    let insertedAttachments = [];

    if (attachments.length > 0) {
      const savedFiles = await saveFilesToDisk(newTicket.id, attachments);
      for (const attachment of savedFiles) {
        const insertResult = await pool.query(
          `INSERT INTO attachments (ticket_id, file_name, file_path, mime_type, uploaded_by) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, file_name, file_path, mime_type, uploaded_by, created_at`,
          [newTicket.id, attachment.file_name, attachment.file_path, attachment.mime_type, user.id]
        );
        insertedAttachments.push(insertResult.rows[0]);
      }
    }

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

    // notify admins and agents only if a matching team exists
    if (team) {
      const teamMembersQuery = await pool.query(
        `SELECT name, email, role FROM users
         WHERE role IN ('admin', 'agent')
           AND team_name = $1`,
        [team.name]
      );

      if (teamMembersQuery.rows.length > 0) {
        await sendTeamAssignedEmail({
          teamMembers: teamMembersQuery.rows,
          ticketId: newTicket.id,
          title: newTicket.title,
          description: newTicket.description,
          openedFor: userDetails.name,
          openedForEmail: userDetails.email,
          category: team.name,
          status: 'Open',
          tlName: tlName,
          priority: newTicket.priority,
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Ticket created successfully',
      ticket: newTicket,
      routedToTeam: team ? team.name : 'No matching team',
      attachments: insertedAttachments,
    });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}