import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from '../db.js';

async function main() {
  const [uporabniki] = await pool.query(
    'SELECT ID_uporabnik, email, geslo FROM Uporabnik'
  );

  let posodobljeno = 0;

  for (const u of uporabniki) {
    const jeHash = /^\$2[aby]\$/.test(u.geslo);
    if (jeHash) {
      console.log(`✓ ${u.email} — že hashirano, preskočeno.`);
      continue;
    }

    const hash = await bcrypt.hash(u.geslo, 10);
    await pool.query(
      'UPDATE Uporabnik SET geslo = ? WHERE ID_uporabnik = ?',
      [hash, u.ID_uporabnik]
    );
    console.log(`→ ${u.email} — geslo hashirano.`);
    posodobljeno++;
  }

  console.log(`\nKončano. Posodobljenih: ${posodobljeno}/${uporabniki.length}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Napaka:', err);
  process.exit(1);
});
