import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo, zahtevajAdmina } from '../middleware/auth.js';

const router = express.Router();

const DOVOLJENI_STATUSI = ['v_pregledu', 'v_pripravi', 'aktiven', 'promoviran', 'zakljucen', 'odpovedan'];

router.use(zahtevajPrijavo, zahtevajAdmina);

router.get('/dogodki', async (req, res) => {
  try {
    const [dogodki] = await pool.query(`
      SELECT
        d.ID_dogodek, d.Naslov, d.kratek_opis, d.status, d.datum_zacetka, d.podkategorija,
        u.ime AS org_ime, u.priimek AS org_priimek, u.naziv_podjetja AS org_podjetje,
        k.naziv AS kategorija_naziv,
        kr.ime_kraja AS kraj_ime
      FROM Dogodek d
      LEFT JOIN Uporabnik u ON d.TK_uporabnik_organizator = u.ID_uporabnik
      LEFT JOIN Kategorija k ON d.TK_kategorija = k.ID_kategorija
      LEFT JOIN Kraj kr ON d.TK_kraj = kr.postna_stevilka
      ORDER BY d.datum_zacetka ASC
    `);
    res.json(dogodki);
  } catch (err) {
    console.error('Napaka pri pridobivanju dogodkov:', err);
    res.status(500).json({ napaka: 'Napaka na strežniku.' });
  }
});

router.patch(
  '/dogodki/:id/status',
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(DOVOLJENI_STATUSI).withMessage(`Status mora biti ena od: ${DOVOLJENI_STATUSI.join(', ')}`),
  ],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    try {
      const [rezultat] = await pool.query(
        'UPDATE Dogodek SET status = ? WHERE ID_dogodek = ?',
        [req.body.status, req.params.id]
      );

      if (rezultat.affectedRows === 0) {
        return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
      }

      res.json({ sporocilo: `Status uspešno spremenjen v "${req.body.status}".` });
    } catch (err) {
      console.error('Napaka pri spreminjanju statusa:', err);
      res.status(500).json({ napaka: 'Napaka na strežniku.' });
    }
  }
);

router.delete(
  '/dogodki/:id',
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({ napaka: 'Neveljaven ID.' });
    }

    try {
      const [rezultat] = await pool.query(
        'DELETE FROM Dogodek WHERE ID_dogodek = ?',
        [req.params.id]
      );

      if (rezultat.affectedRows === 0) {
        return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
      }

      res.json({ sporocilo: 'Dogodek uspešno izbrisan.' });
    } catch (err) {
      console.error('Napaka pri brisanju dogodka:', err);
      res.status(500).json({ napaka: 'Napaka na strežniku.' });
    }
  }
);

export default router;
