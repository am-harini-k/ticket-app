import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function summarizeTicket(ticketOrTitle, description) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const ticket = typeof ticketOrTitle === 'object' && ticketOrTitle !== null
      ? ticketOrTitle
      : { title: ticketOrTitle, description };

    const title = ticket.title || 'Untitled ticket';
    const desc = ticket.description || 'No description provided.';
    const priority = ticket.priority ? `Priority: ${ticket.priority}` : 'Priority: not set';
    const status = ticket.status ? `Status: ${ticket.status}` : 'Status: unknown';
    const assignedTo = ticket.assigned_to ? `${ticket.assigned_to_name || ticket.assigned_to}` : 'Unassigned';
    const team = ticket.team_name ? `${ticket.team_name}` : 'None';
    const comments = Array.isArray(ticket.comments) && ticket.comments.length > 0
      ? ticket.comments.map((comment, i) => `${i + 1}. ${comment.user_name || 'Unknown'}: ${comment.comment}`).join('\n')
      : 'No comments yet.';

    // attachments may be an array of objects with filename/url; be defensive
    const attachments = Array.isArray(ticket.attachments) && ticket.attachments.length > 0
      ? ticket.attachments.map((a, i) => `${i + 1}. ${a.filename || a.name || a.path || a}`).join('\n')
      : null;

    const prompt = `You are a helpful support ticket assistant writing a clear, step-by-step summary for an agent or admin.
Produce a concise, numbered list that an agent can act on immediately. Include these sections as separate numbered points or subpoints:

1) Quick Overview: one short sentence describing the core user issue.
2) Key Details: bullet the title, priority, status, assigned person, and team.
3) Reproduction / Evidence: summarize the description and list any important comments in order (numbered).
4) Attachments: for each attachment, list the filename and a one-line note what it likely contains (based on filename or context). If you cannot determine contents, say 'attachment included — please review'.
5) Recommended Next Steps: 3 concise, prioritized actions the agent/admin should take (e.g., request logs, escalate to engineering, ask the user for X).
6) Suggested Reply To User: a 1-2 sentence friendly response the agent can send to the user.

Use plain text, keep each major section as its own numbered point, and keep language actionable and specific.

Now analyze the ticket and fill those sections.

Title: ${title}
Description: ${desc}
${priority}
${status}
Assigned to: ${assignedTo}
Team: ${team}

Comments:
${comments}

${attachments ? `Attachments:\n${attachments}` : 'Attachments: none'}

Summary:`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return summary.trim();
  } catch (error) {
    console.error('Gemini error:', error);
    return 'AI summary unavailable';
  }
}