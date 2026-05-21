import express from 'express';
import { param, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo, zahtevajAdmina } from '../middleware/auth.js';

const router = express.Router();

router.use(zahtevajPrijavo, zahtevajAdmina);

router.get('/ocene', async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      `SELECT
         o.ID_ocena       AS id,
         o.ocena,
         o.komentar,
         o.datum_objave,
         u.ID_uporabnik   AS uporabnik_id,
         u.ime            AS uporabnik_ime,
         u.priimek        AS uporabnik_priimek,
         u.email          AS uporabnik_email,
         d.ID_dogodek     AS dogodek_id,
         d.Naslov         AS dogodek_naslov
       FROM Ocena_komentar o
       JOIN Uporabnik u ON o.TK_uporabnik = u.ID_uporabnik
       JOIN Dogodek   d ON o.TK_dogodek   = d.ID_dogodek
       ORDER BY o.datum_objave DESC`
    );
    res.json({ ocene: vrstice });
  } catch (err) {
    console.error('Napaka pri /admin/ocene:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.delete(
  '/ocene/:id',
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({ napaka: 'Neveljaven ID.' });
    }

    try {
      const [rezultat] = await pool.query(
        'DELETE FROM Ocena_komentar WHERE ID_ocena = ?',
        [req.params.id]
      );

      if (rezultat.affectedRows === 0) {
        return res.status(404).json({ napaka: 'Ocena ne obstaja.' });
      }

      res.json({ sporocilo: 'Ocena uspešno izbrisana.' });
    } catch (err) {
      console.error('Napaka pri brisanju ocene:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

export default router;
