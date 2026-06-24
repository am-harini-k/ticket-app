import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    // Step 1 - get email and password from request
    const body = await request.json();
    const { email, password } = body;

    // Step 2 - check if fields are given
    if (!email || !password) {
      return Response.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Step 3 - find user in database by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Step 4 - compare password with hashed password in DB
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return Response.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Step 5 - create JWT token (ID card for the user)
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team_name: user.team_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return Response.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team_name: user.team_name,
      },
    });

  } catch (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}