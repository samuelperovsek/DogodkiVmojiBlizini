import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dogodki_db',
  timezone: '+02:00',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function preveriPovezavo(poskusi = 10, zamikMs = 2000) {
  for (let i = 1; i <= poskusi; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('✓ Povezava z MySQL bazo deluje.');
      conn.release();
      return;
    } catch (err) {
      if (i === poskusi) {
        console.error('✗ Napaka pri povezovanju z bazo:', err.message);
        console.error('  Preveri, da Docker kontejner teče in da so podatki v .env pravilni.');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, zamikMs));
    }
  }
}

preveriPovezavo();

export default pool;
