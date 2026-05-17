import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

try {
  const conn = await pool.getConnection();
  console.log('✓ Povezava z MySQL bazo deluje.');
  conn.release();
} catch (err) {
  console.error('✗ Napaka pri povezovanju z bazo:', err.message);
  console.error('  Preveri .env in da MySQL teče (XAMPP/MAMP).');
}

export default pool;
