import nodemailer from 'nodemailer';

// create transporter (email sender)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// send email when new ticket is created
export async function sendTicketCreatedEmail({ ticketId, title, description, userEmail, userName }) {
  try {
    // email to admin
    

    
    // confirmation email to user
    await transporter.sendMail({
      from: `"Ticket App Support" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `Ticket #${ticketId} Created Successfully`,
      html: `
        <h2>Your Ticket Has Been Raised!</h2>
        <p>Hi ${userName},</p>
        <p>Your ticket has been created successfully. Our team will look into it shortly.</p>
        <br/>
        <p><strong>Ticket ID:</strong> #${ticketId}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Status:</strong> Open</p>
        <p><strong>Created At:</strong> ${new Date().toLocaleString()}</p>
        <br/>
        <p>We will notify you when the status changes.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

// send email when ticket status changes
export async function sendStatusUpdateEmail({ ticketId, title, status, userEmail, userName }) {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: userEmail,
      subject: `Ticket #${ticketId} Status Updated - ${status}`,
      html: `
        <h2>Ticket Status Updated</h2>
        <p>Hi ${userName},</p>
        <p>Your ticket status has been updated.</p>
        <p><strong>Ticket ID:</strong> #${ticketId}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>New Status:</strong> ${status.toUpperCase()}</p>
        <br/>
        <p>Thank you for your patience.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}
// send welcome email when admin creates account
export async function sendWelcomeEmail({ name, email, employeeId, password, role }) {
  try {
    const roleLabel = role === 'admin' ? 'Team Leader' 
                    : role === 'agent' ? 'Support Agent' 
                    : 'Customer';

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: `Welcome to Ticket App — Your Account Details`,
      html: `
        <h2>Welcome to Ticket App, ${name}!</h2>
        <p>Your account has been created successfully.</p>
        <br/>
        <table style="border-collapse:collapse;width:100%">
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold">Your ID</td>
            <td style="padding:8px;border:1px solid #ddd">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td>
            <td style="padding:8px;border:1px solid #ddd">${email}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold">Password</td>
            <td style="padding:8px;border:1px solid #ddd">${password}</td>
          </tr>
          <tr>
            <td style="padding:8px;border:1px solid #ddd;font-weight:bold">Role</td>
            <td style="padding:8px;border:1px solid #ddd">${roleLabel}</td>
          </tr>
        </table>
        <br/>
        <p>Login at: <strong>http://localhost:3000/login</strong></p>
        <p style="color:red"><strong>Please change your password after first login!</strong></p>
        <br/>
        <p>Thank you,<br/>Ticket App Team</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false };
  }
}
// notify all team members when a new ticket is created (ServiceNow style)
// notify all team members when a new ticket is created (ServiceNow style)
export async function sendTeamAssignedEmail({ teamMembers, ticketId, title, description, openedFor, openedForEmail, category, status, tlName, priority }) {
  try {
    const taskNumber = `TKT${String(ticketId).padStart(7, '0')}`;
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    for (const member of teamMembers) {
      await transporter.sendMail({
        from: `"TicketApp4IT" <${process.env.GMAIL_USER}>`,
        to: member.email,
        subject: `TicketApp4IT: ${taskNumber} for "${title}" assigned to your group`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <table width="100%" style="margin-bottom:10px">
            <tr>
              <td style="font-size:18px;font-weight:bold;color:#333">TicketApp</td>
              <td style="text-align:right;font-size:14px;color:#888">Your Organization</td>
            </tr>
          </table>

          <div style="background:#0b5ed7;color:#fff;padding:30px 20px;text-align:center;font-size:24px;font-weight:bold">
            New Ticket Raised — Action Needed
          </div>

          <div style="padding:20px;background:#fff;border:1px solid #ddd">
            <p>Dear <strong>${category} Team</strong> member,</p>
            <p>Ticket <a href="http://localhost:3000/tickets/${ticketId}">${taskNumber}</a> has been raised and assigned to your group. It currently needs to be reviewed and picked up by an available group member.</p>
            <p>To view the ticket, click the link below.</p>

            <h3 style="color:#0b5ed7;border-bottom:2px solid #0b5ed7;padding-bottom:6px">What Do I Need to Know?</h3>
            <table width="100%" cellpadding="8" style="border-collapse:collapse">
              <tr style="background:#f5f5f5">
                <td style="font-weight:bold;width:160px">Ticket Number</td>
                <td><a href="http://localhost:3000/tickets/${ticketId}">${taskNumber}</a></td>
              </tr>
              <tr>
                <td style="font-weight:bold">Title</td>
                <td>${title}</td>
              </tr>
              <tr style="background:#f5f5f5">
                <td style="font-weight:bold">Description</td>
                <td>${description}</td>
              </tr>
              <tr>
                <td style="font-weight:bold">Priority</td>
                <td>${priority ? priority.toUpperCase() : 'MEDIUM'}</td>
              </tr>
              <tr style="background:#f5f5f5">
                <td style="font-weight:bold">Assignment Group</td>
                <td>${category} Team</td>
              </tr>
              <tr>
                <td style="font-weight:bold;background:#dbeafe">Assigned To</td>
                <td style="background:#dbeafe">${tlName} (Team Lead)</td>
              </tr>
              <tr style="background:#f5f5f5">
                <td style="font-weight:bold">Due Date</td>
                <td>${dueDate}</td>
              </tr>
              <tr>
                <td style="font-weight:bold;vertical-align:top">Requested For</td>
                <td>
                  <strong>${openedFor}</strong><br/>
                  Email: ${openedForEmail}
                </td>
              </tr>
            </table>

            <h3 style="color:#0b5ed7;margin-top:24px">How Do I Get Support?</h3>
            <p>Visit your TicketApp Dashboard or contact your Team Lead.</p>

            <p style="margin-top:30px">Thank You,<br/>TicketApp Support</p>

            <hr style="margin:30px 0;border:none;border-top:1px solid #ddd"/>
            <p style="font-size:11px;color:#999">Please do not reply directly as this is a system-generated email.</p>
          </div>
        </div>
        `,
      });
    }
    return { success: true };
  } catch (error) {
    console.error('Team assigned email error:', error);
    return { success: false };
  }
}