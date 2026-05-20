import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/statistika', async (req, res) => {
  try {
    const [
      [dogodkiVrstice],
      [dogodkiVseVrstice],
      [organizatorjiVrstice],
      [uporabnikiVrstice],
      [krajiVrstice],
      [noviVrstice],
      [vPregleduVrstice],
      [oceneVrstice],
      [kategorije],
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS stevilo
         FROM Dogodek
         WHERE status IN ('aktiven', 'promoviran')`
      ),
      pool.query(`SELECT COUNT(*) AS stevilo FROM Dogodek`),
      pool.query(
        `SELECT COUNT(*) AS stevilo
         FROM Uporabnik
         WHERE vloga = 'organizator'`
      ),
      pool.query(`SELECT COUNT(*) AS stevilo FROM Uporabnik`),
      pool.query(`SELECT COUNT(*) AS stevilo FROM Kraj`),
      pool.query(
        `SELECT COUNT(*) AS stevilo
         FROM Dogodek
         WHERE status IN ('aktiven', 'promoviran')
           AND datum_zacetka BETWEEN NOW() AND NOW() + INTERVAL 7 DAY`
      ),
      pool.query(
        `SELECT COUNT(*) AS stevilo
         FROM Dogodek
         WHERE status = 'v_pregledu'`
      ),
      pool.query(`SELECT COUNT(*) AS stevilo FROM Ocena_komentar`),
      pool.query(
        `SELECT k.ID_kategorija AS id, k.naziv,
                COUNT(d.ID_dogodek) AS stevilo
         FROM Kategorija k
         LEFT JOIN Dogodek d
           ON d.TK_kategorija = k.ID_kategorija
          AND d.status IN ('aktiven', 'promoviran')
         GROUP BY k.ID_kategorija, k.naziv
         ORDER BY k.ID_kategorija`
      ),
    ]);

    res.json({
      dogodki: dogodkiVrstice[0].stevilo,
      dogodki_vse: dogodkiVseVrstice[0].stevilo,
      organizatorji: organizatorjiVrstice[0].stevilo,
      uporabniki: uporabnikiVrstice[0].stevilo,
      kraji: krajiVrstice[0].stevilo,
      novi_dogodki_teden: noviVrstice[0].stevilo,
      dogodki_v_pregledu: vPregleduVrstice[0].stevilo,
      ocene_skupaj: oceneVrstice[0].stevilo,
      kategorije: kategorije.map(k => ({
        id: k.id,
        naziv: k.naziv,
        stevilo: k.stevilo,
      })),
    });
  } catch (err) {
    console.error('Napaka pri /statistika:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

export default router;
