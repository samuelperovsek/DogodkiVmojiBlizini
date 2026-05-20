import express from 'express';
import { param, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js';

const router = express.Router();

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Neveljaven ID dogodka.'),
  (req, res, next) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({ napaka: napake.array()[0].msg });
    }
    next();
  },
];

router.get('/priljubljeni', zahtevajPrijavo, async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      'SELECT TK_dogodek FROM Priljubljeni_dogodki WHERE TK_uporabnik = ?',
      [req.uporabnik.id]
    );
    res.json({ ids: vrstice.map(v => v.TK_dogodek) });
  } catch (err) {
    console.error('Napaka pri /priljubljeni:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.post('/dogodki/:id/priljubljen', zahtevajPrijavo, validateId, async (req, res) => {
  const dogodekId = Number(req.params.id);
  try {
    await pool.query(
      'INSERT INTO Priljubljeni_dogodki (TK_uporabnik, TK_dogodek) VALUES (?, ?)',
      [req.uporabnik.id, dogodekId]
    );
    res.status(201).json({ priljubljen: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(200).json({ priljubljen: true });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
    }
    console.error('Napaka pri dodajanju priljubljenega:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.delete('/dogodki/:id/priljubljen', zahtevajPrijavo, validateId, async (req, res) => {
  const dogodekId = Number(req.params.id);
  try {
    await pool.query(
      'DELETE FROM Priljubljeni_dogodki WHERE TK_uporabnik = ? AND TK_dogodek = ?',
      [req.uporabnik.id, dogodekId]
    );
    res.json({ priljubljen: false });
  } catch (err) {
    console.error('Napaka pri brisanju priljubljenega:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

export default router;
