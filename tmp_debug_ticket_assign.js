const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Nallisabai@06@localhost:5432/ticketdb' });
(async () => {
  try {
    const admins = await pool.query("SELECT id, name, role, team_name FROM users WHERE role = 'admin'");
    console.log('admins', admins.rows);
    const tickets = await pool.query('SELECT id, title, assigned_to, team_id, category, user_id FROM tickets ORDER BY id DESC LIMIT 50');
    console.log('tickets', tickets.rows);
    const adminIds = admins.rows.map((a) => String(a.id));
    const assigned = tickets.rows.filter((t) => adminIds.includes(String(t.assigned_to)));
    console.log('assigned to admin', assigned);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
