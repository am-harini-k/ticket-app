import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    // Step 1 - get data from request
    const body = await request.json();
    const { name, email, password } = body;

    // Step 2 - check if all fields are given
    if (!name || !email || !password) {
      return Response.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Step 3 - check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return Response.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }

    // Step 4 - hash the password (never save plain password)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 5 - save user to database
    const result = await pool.query(
      'INSERT INTO users (name, email, password, team_name) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, team_name',
      [name, email, hashedPassword, null]
    );

    const newUser = result.rows[0];

    return Response.json({
      success: true,
      message: 'Account created successfully',
      user: newUser,
    });

  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}