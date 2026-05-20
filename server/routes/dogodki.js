import express from 'express';
import pool from '../db.js';

const router = express.Router();


router.get('/dogodki/najboljsi', async (req, res) => {
  try {
    const [dogodki] = await pool.query(`
      SELECT 
        d.ID_dogodek, d.Naslov, d.opis, d.ulica, d.datum_zacetka, d.slika, d.cena, d.status,
        k.ime_kraja AS kraj, kat.naziv AS kategorija
      FROM Dogodek d
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
      WHERE d.status != 'zavrnjeno'              
        AND d.datum_zacetka >= NOW()             
        AND MONTH(d.datum_zacetka) = MONTH(CURRENT_DATE())
        AND YEAR(d.datum_zacetka) = YEAR(CURRENT_DATE())
      ORDER BY d.datum_zacetka ASC
      LIMIT 6
    `);
    res.json(dogodki);
  } catch (err) {
    console.error(err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.get('/dogodki', async (req, res) => {
  try {
    const [dogodki] = await pool.query(`
      SELECT 
        d.ID_dogodek, 
        d.Naslov, 
        d.opis, 
        d.ulica, 
        d.datum_zacetka, 
        d.slika, 
        d.cena, 
        d.status,
        k.ime_kraja AS kraj, 
        kat.naziv AS kategorija
      FROM Dogodek d
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
      WHERE d.status != 'zavrnjeno'              -- Izloči zavrnjene
        AND d.datum_zacetka >= NOW()             -- Skrije pretekle dogodke
      ORDER BY d.datum_zacetka ASC
    `);

    res.json(dogodki);
  } catch (err) {
    console.error('Napaka pri pridobivanju dogodkov:', err);
    res.status(500).json({ napaka: 'Napaka strežnika pri pridobivanju dogodkov.' });
  }
});

router.get('/dogodki/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [dogodki] = await pool.query(`
      SELECT 
        d.*,
        k.ime_kraja AS kraj, 
        kat.naziv AS kategorija,
        u.ime AS organizator_ime,
        u.priimek AS organizator_priimek
      FROM Dogodek d
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
      LEFT JOIN Uporabnik u ON d.TK_uporabnik_organizator = u.ID_uporabnik
      WHERE d.ID_dogodek = ?
    `, [id]);

    if (dogodki.length === 0) {
      return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
    }

    res.json(dogodki[0]);
  } catch (err) {
    console.error('Napaka pri pridobivanju podrobnosti dogodka:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

export default router;