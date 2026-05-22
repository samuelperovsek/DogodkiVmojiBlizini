import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/prosnja-organizator', zahtevajPrijavo, async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      `SELECT ID_prosnja AS id, naziv_podjetja, spletna_stran, opis, razlog,
              status, datum_prosnje, datum_obravnave, opomba_admina
       FROM Prosnja_organizator
       WHERE TK_uporabnik = ?
       ORDER BY datum_prosnje DESC
       LIMIT 1`,
      [req.uporabnik.id]
    );
    res.json({ prosnja: vrstice[0] || null });
  } catch (err) {
    console.error('Napaka pri /me/prosnja-organizator:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.post(
  '/me/prosnja-organizator',
  zahtevajPrijavo,
  [
    body('naziv_podjetja').trim().notEmpty().withMessage('Naziv podjetja je obvezen.').isLength({ max: 255 }),
    body('spletna_stran').optional({ checkFalsy: true }).trim().isURL().withMessage('Spletna stran ni veljaven URL.'),
    body('opis').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('razlog').trim().notEmpty().withMessage('Razlog je obvezen.').isLength({ min: 20, max: 1000 }).withMessage('Razlog mora imeti med 20 in 1000 znakov.'),
  ],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    if (req.uporabnik.vloga === 'organizator') {
      return res.status(400).json({ napaka: 'Že imate vlogo organizatorja.' });
    }
    if (req.uporabnik.vloga === 'admin') {
      return res.status(400).json({ napaka: 'Administratorji ne morejo zaprositi za vlogo organizatorja.' });
    }

    try {
      const [obstojece] = await pool.query(
        `SELECT ID_prosnja FROM Prosnja_organizator
         WHERE TK_uporabnik = ? AND status = 'cakajoca'`,
        [req.uporabnik.id]
      );
      if (obstojece.length > 0) {
        return res.status(409).json({ napaka: 'Že imaš čakajočo prošnjo. Počakaj na obravnavo administratorja.' });
      }

      const { naziv_podjetja, spletna_stran, opis, razlog } = req.body;
      const [rezultat] = await pool.query(
        `INSERT INTO Prosnja_organizator (TK_uporabnik, naziv_podjetja, spletna_stran, opis, razlog)
         VALUES (?, ?, ?, ?, ?)`,
        [req.uporabnik.id, naziv_podjetja, spletna_stran || null, opis || null, razlog]
      );

      res.status(201).json({
        sporocilo: 'Prošnja uspešno oddana. Administrator jo bo obravnaval v najkrajšem možnem času.',
        id: rezultat.insertId,
      });
    } catch (err) {
      console.error('Napaka pri ustvarjanju prošnje:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

export default router;
