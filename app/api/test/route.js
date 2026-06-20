import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    return Response.json({
      success: true,
      message: 'Database connected!',
      time: result.rows[0].current_time,
    });
  } catch (error) {
    return Response.json({
      success: false,
      message: error.message,
    });
  }
}