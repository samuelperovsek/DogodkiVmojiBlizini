import express from 'express';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js'; 

const router = express.Router();

router.get('/:id/spremlja', zahtevajPrijavo, async (req, res) => {
  try {
    const uporabnikId = req.uporabnik.id;
    const organizatorId = req.params.id;

    const [rows] = await pool.query(
      'SELECT 1 FROM Priljubljeni_organizatorji WHERE TK_uporabnik = ? AND TK_organizator = ?',
      [uporabnikId, organizatorId]
    );

    res.json({ spremlja: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ napaka: 'Napaka pri preverjanju spremljanja.' });
  }
});

router.post('/:id/toggle-spremljaj', zahtevajPrijavo, async (req, res) => {
  try {
    const uporabnikId = req.uporabnik.id;
    const organizatorId = req.params.id;

    const [rows] = await pool.query(
      'SELECT ID_priljubljeni_organizatorji FROM Priljubljeni_organizatorji WHERE TK_uporabnik = ? AND TK_organizator = ?',
      [uporabnikId, organizatorId]
    );

    if (rows.length > 0) {
      await pool.query(
        'DELETE FROM Priljubljeni_organizatorji WHERE TK_uporabnik = ? AND TK_organizator = ?',
        [uporabnikId, organizatorId]
      );
      return res.json({ spremlja: false, sporocilo: 'Ne spremljaš več organizatorja.' });
    } else {
      await pool.query(
        'INSERT INTO Priljubljeni_organizatorji (TK_uporabnik, TK_organizator) VALUES (?, ?)',
        [uporabnikId, organizatorId]
      );
      return res.json({ spremlja: true, sporocilo: 'Uspešno spremljaš organizatorja!' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ napaka: 'Napaka pri spreminjanju statusa spremljanja.' });
  }
});

export default router;