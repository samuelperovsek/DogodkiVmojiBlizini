import express from 'express';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js';

const router = express.Router();

router.get('/obvestila', zahtevajPrijavo, async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      `SELECT ID_obvestilo AS id, tip, sporocilo, povezava, prebrano, datum_obvestila
       FROM Obvestilo
       WHERE TK_uporabnik = ?
       ORDER BY datum_obvestila DESC
       LIMIT 50`,
      [req.uporabnik.id]
    );

    const [stetjeRow] = await pool.query(
      `SELECT COUNT(*) AS neprebrano FROM Obvestilo WHERE TK_uporabnik = ? AND prebrano = 0`,
      [req.uporabnik.id]
    );

    res.json({
      obvestila: vrstice,
      neprebrano: stetjeRow[0].neprebrano,
    });
  } catch (err) {
    console.error('Napaka pri /obvestila:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.patch('/obvestila/:id', zahtevajPrijavo, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ napaka: 'Neveljaven ID.' });
  }

  try {
    const [rezultat] = await pool.query(
      `UPDATE Obvestilo SET prebrano = 1
       WHERE ID_obvestilo = ? AND TK_uporabnik = ?`,
      [id, req.uporabnik.id]
    );
    if (rezultat.affectedRows === 0) {
      return res.status(404).json({ napaka: 'Obvestilo ne obstaja.' });
    }
    res.json({ uspeh: true });
  } catch (err) {
    console.error('Napaka pri označevanju obvestila:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.post('/obvestila/oznaci-vse-prebrano', zahtevajPrijavo, async (req, res) => {
  try {
    await pool.query(
      `UPDATE Obvestilo SET prebrano = 1
       WHERE TK_uporabnik = ? AND prebrano = 0`,
      [req.uporabnik.id]
    );
    res.json({ uspeh: true });
  } catch (err) {
    console.error('Napaka pri označevanju vseh obvestil:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.delete('/obvestila/:id', zahtevajPrijavo, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ napaka: 'Neveljaven ID.' });
  }

  try {
    const [rezultat] = await pool.query(
      `DELETE FROM Obvestilo WHERE ID_obvestilo = ? AND TK_uporabnik = ?`,
      [id, req.uporabnik.id]
    );
    if (rezultat.affectedRows === 0) {
      return res.status(404).json({ napaka: 'Obvestilo ne obstaja.' });
    }
    res.json({ uspeh: true });
  } catch (err) {
    console.error('Napaka pri brisanju obvestila:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

export default router;
