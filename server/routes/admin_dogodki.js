import express from 'express';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js';

const router = express.Router();

router.get('/admin/dogodki', zahtevajPrijavo, async (req, res) => {
  try {
    if (req.uporabnik.vloga !== 'admin') {
      return res.status(403).json({ napaka: 'Dostop zavrnjen. Niste administrator.' });
    }

    const sql = `
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
    `;

    const [dogodki] = await pool.query(sql);
    res.json(dogodki);
  } catch (err) {
    console.error('Napaka pri pridobivanju dogodkov:', err);
    res.status(500).json({ napaka: 'Napaka na strežniku.' });
  }
});

router.patch('/admin/dogodki/:id/status', zahtevajPrijavo, async (req, res) => {
  try {
    if (req.uporabnik.vloga !== 'admin') {
      return res.status(403).json({ napaka: 'Dostop zavrnjen.' });
    }

    const idDogodka = req.params.id;
    const { status } = req.body;

    const [result] = await pool.query(
      'UPDATE Dogodek SET status = ? WHERE ID_dogodek = ?',
      [status, idDogodka]
    );

    res.json({ sporocilo: `Status uspešno spremenjen v "${status}".` });
  } catch (err) {
    res.status(500).json({ napaka: 'Napaka na strežniku.' });
  }
});

router.delete('/admin/dogodki/:id', zahtevajPrijavo, async (req, res) => {
  try {
    if (req.uporabnik.vloga !== 'admin') {
      return res.status(403).json({ napaka: 'Dostop zavrnjen.' });
    }

    const idDogodka = req.params.id;
    await pool.query('DELETE FROM Dogodek WHERE ID_dogodek = ?', [idDogodka]);

    res.json({ sporocilo: 'Dogodek uspešno izbrisan.' });
  } catch (err) {
    res.status(500).json({ napaka: 'Napaka na strežniku.' });
  }
});

export default router;