import mysql from 'mysql2/promise';

// Ustvarimo pool. Spremenljivke se bodo prebrale šele, ko bo dotenv opravil svoje delo.
const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dogodki',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Namesto takojšnjega izvajanja preverimo povezavo asinhrono
pool.getConnection()
  .then(conn => {
    console.log('✓ Povezava z MySQL bazo v Dockerju deluje.');
    conn.release();
  })
  .catch(err => {
    console.error('✗ Napaka pri povezovanju z bazo:', err.message);
    console.error('  Preveri, da Docker kontejner teče in da so podatki v .env pravilni.');
  });

export default pool;
