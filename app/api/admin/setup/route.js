import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { secret } = body;

    if (secret !== 'setup_secret_2026') {
      return Response.json({ success: false, message: 'Not allowed' }, { status: 401 });
    }

    const accounts = [
      { employee_id: 'TL0001', name: 'Harini', email: 'harinisabai2006@gmail.com', password: 'Harini@123', role: 'admin' },
      { employee_id: 'AGT0001', name: 'Praveen', email: 'praveensabai2003@gmail.com', password: 'Praveen@123', role: 'agent' },
      { employee_id: 'AGT0002', name: 'Godh', email: 'godh01godh@gmail.com', password: 'Godh@123', role: 'agent' },
      { employee_id: 'USR0001', name: 'Harini Customer', email: 'harinisabai@gmail.com', password: 'Customer@123', role: 'user' },
    ];

    const results = [];

    for (const account of accounts) {
      const hashedPassword = await bcrypt.hash(account.password, 10);

      await pool.query(
        `UPDATE users SET password = $1, must_change_password = true WHERE email = $2`,
        [hashedPassword, account.email]
      );

      await sendWelcomeEmail({
        name: account.name,
        email: account.email,
        employeeId: account.employee_id,
        password: account.password,
        role: account.role,
      });

      results.push({ email: account.email, employee_id: account.employee_id, role: account.role });
    }

    return Response.json({ success: true, message: 'All accounts set up and emails sent!', accounts: results });

  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}