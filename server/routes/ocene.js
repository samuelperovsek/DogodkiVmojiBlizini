import express from 'express';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js';

const router = express.Router();

router.get('/dogodki/:id/ocene', async (req, res) => {
  const dogodekId = req.params.id;
  const stran = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (stran - 1) * limit;

  try {
    const [vrstice] = await pool.query(
      `SELECT o.ID_ocena, o.ocena, o.komentar, o.datum_objave,
              u.ID_uporabnik AS uporabnik_id, u.ime, u.priimek
       FROM Ocena_komentar o
       JOIN Uporabnik u ON o.TK_uporabnik = u.ID_uporabnik
       WHERE o.TK_dogodek = ?
       ORDER BY o.datum_objave DESC
       LIMIT ? OFFSET ?`,
      [dogodekId, limit + 1, offset]
    );

    const imaSe = vrstice.length > limit;
    const oceneZaIzvoz = imaSe ? vrstice.slice(0, limit) : vrstice;

    const [vseOcene] = await pool.query(
      `SELECT ocena FROM Ocena_komentar WHERE TK_dogodek = ?`,
      [dogodekId]
    );

    let skupnoOcen = vseOcene.length;
    let povprecje = 0;
    let porazdelitev = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (skupnoOcen > 0) {
      let vsota = 0;
      vseOcene.forEach(o => {
        vsota += o.ocena;
        if (porazdelitev[o.ocena] !== undefined) {
          porazdelitev[o.ocena]++;
        }
      });
      povprecje = (vsota / skupnoOcen).toFixed(1);
    }

    let procenti = {};
    for (let i = 1; i <= 5; i++) {
      procenti[i] = skupnoOcen > 0 ? Math.round((porazdelitev[i] / skupnoOcen) * 100) : 0;
    }

    res.json({
      uspeh: true,
      ocene: oceneZaIzvoz,
      imaSe: imaSe,
      statistika: {
        skupnoOcen,
        povprecje,
        procenti
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ uspeh: false, napaka: 'Napaka strežnika.' });
  }
});

router.post('/dogodki/:id/ocene', zahtevajPrijavo, async (req, res) => {
  const dogodekId = req.params.id;
  const { ocena, komentar } = req.body;
  const uporabnikId = req.uporabnik.id;

  if (!ocena || ocena < 1 || ocena > 5) {
    return res.status(400).json({ uspeh: false, napaka: 'Ocena mora biti med 1 in 5.' });
  }

  try {
    const [obstaja] = await pool.query(
      `SELECT ID_ocena FROM Ocena_komentar WHERE TK_uporabnik = ? AND TK_dogodek = ?`,
      [uporabnikId, dogodekId]
    );

    if (obstaja.length > 0) {
      return res.status(400).json({ 
        uspeh: false, 
        napaka: 'Ta dogodek ste že ocenili.' 
      });
    }

    await pool.query(
      `INSERT INTO Ocena_komentar (ocena, komentar, TK_uporabnik, TK_dogodek, datum_objave) 
       VALUES (?, ?, ?, ?, NOW())`,
      [ocena, komentar ? komentar.trim() : null, uporabnikId, dogodekId]
    );

    // 4. Uspešen odgovor
    res.status(201).json({
      uspeh: true,
      sporocilo: 'Ocena je bila uspešno shranjena.'
    });

  } catch (err) {
    console.error('Napaka pri shranjevanju ocene:', err);
    res.status(500).json({ 
      uspeh: false, 
      napaka: 'Prišlo je do napake na strežniku.' 
    });
  }
});

router.delete('/ocene/:id', zahtevajPrijavo, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ uspeh: false, napaka: 'Neveljaven ID.' });
  }

  try {
    const [vrstice] = await pool.query(
      'SELECT TK_uporabnik FROM Ocena_komentar WHERE ID_ocena = ?',
      [id]
    );
    if (vrstice.length === 0) {
      return res.status(404).json({ uspeh: false, napaka: 'Komentar ne obstaja.' });
    }

    const lastnik = vrstice[0].TK_uporabnik === req.uporabnik.id;
    const admin = req.uporabnik.vloga === 'admin';
    if (!lastnik && !admin) {
      return res.status(403).json({ uspeh: false, napaka: 'Lahko brišeš samo svoje komentarje.' });
    }

    await pool.query('DELETE FROM Ocena_komentar WHERE ID_ocena = ?', [id]);
    res.json({ uspeh: true, sporocilo: 'Komentar izbrisan.' });
  } catch (err) {
    console.error('Napaka pri brisanju komentarja:', err);
    res.status(500).json({ uspeh: false, napaka: 'Napaka strežnika.' });
  }
});

export default router;