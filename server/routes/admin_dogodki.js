import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo, zahtevajAdmina } from '../middleware/auth.js';
import { ustvariObvestilo } from '../services/obvestila.js';

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
      const [dogodki] = await pool.query(
        'SELECT ID_dogodek, Naslov, TK_uporabnik_organizator, status AS stari_status FROM Dogodek WHERE ID_dogodek = ?',
        [req.params.id]
      );

      if (dogodki.length === 0) {
        return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
      }

      const dogodek = dogodki[0];
      const noviStatus = req.body.status;

      if (dogodek.stari_status === noviStatus) {
        return res.json({ sporocilo: `Status je že "${noviStatus}".` });
      }

      await pool.query(
        'UPDATE Dogodek SET status = ? WHERE ID_dogodek = ?',
        [noviStatus, req.params.id]
      );

      const mapaObvestil = {
        aktiven: {
          tip: 'dogodek_aktiven',
          sporocilo: `Tvoj dogodek "${dogodek.Naslov}" je bil odobren in je zdaj aktiven.`,
        },
        promoviran: {
          tip: 'dogodek_promoviran',
          sporocilo: `Tvoj dogodek "${dogodek.Naslov}" je bil promoviran in bo izpostavljen uporabnikom.`,
        },
        odpovedan: {
          tip: 'dogodek_zavrnjen',
          sporocilo: `Tvoj dogodek "${dogodek.Naslov}" je bil odpovedan oz. zavrnjen s strani administratorja.`,
        },
      };

      const obvestilo = mapaObvestil[noviStatus];
      if (obvestilo && dogodek.TK_uporabnik_organizator) {
        ustvariObvestilo({
          uporabnikId: dogodek.TK_uporabnik_organizator,
          tip: obvestilo.tip,
          sporocilo: obvestilo.sporocilo,
          povezava: `dogodek.html?id=${dogodek.ID_dogodek}`,
        }).catch(err => console.error(`Obvestilo ${obvestilo.tip}:`, err));
      }

      if (noviStatus === 'odpovedan') {
        try {
          const [prijavljeni] = await pool.query(
            'SELECT TK_uporabnik FROM Prijava WHERE TK_dogodek = ?',
            [dogodek.ID_dogodek]
          );
          for (const p of prijavljeni) {
            ustvariObvestilo({
              uporabnikId: p.TK_uporabnik,
              tip: 'dogodek_odpovedan_zame',
              sporocilo: `Dogodek "${dogodek.Naslov}", na katerega si prijavljen/a, je bil odpovedan.`,
              povezava: `dogodek.html?id=${dogodek.ID_dogodek}`,
            }).catch(err => console.error('Obvestilo dogodek_odpovedan_zame:', err));
          }
        } catch (err) {
          console.error('Napaka pri pošiljanju obvestil prijavljenim:', err);
        }
      }

      res.json({ sporocilo: `Status uspešno spremenjen v "${noviStatus}".` });
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
      const [dogodki] = await pool.query(
        'SELECT Naslov, TK_uporabnik_organizator FROM Dogodek WHERE ID_dogodek = ?',
        [req.params.id]
      );
      if (dogodki.length === 0) {
        return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
      }
      const dogodek = dogodki[0];

      const [prijavljeni] = await pool.query(
        'SELECT TK_uporabnik FROM Prijava WHERE TK_dogodek = ?',
        [req.params.id]
      );

      const [rezultat] = await pool.query(
        'DELETE FROM Dogodek WHERE ID_dogodek = ?',
        [req.params.id]
      );

      if (rezultat.affectedRows === 0) {
        return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
      }

      const obvescajIde = new Set(prijavljeni.map(p => p.TK_uporabnik));
      if (dogodek.TK_uporabnik_organizator) obvescajIde.add(dogodek.TK_uporabnik_organizator);

      for (const uporabnikId of obvescajIde) {
        ustvariObvestilo({
          uporabnikId,
          tip: 'dogodek_odpovedan_zame',
          sporocilo: `Dogodek "${dogodek.Naslov}" je bil izbrisan iz platforme.`,
          povezava: null,
        }).catch(err => console.error('Obvestilo o brisanju dogodka:', err));
      }

      res.json({ sporocilo: 'Dogodek uspešno izbrisan.' });
    } catch (err) {
      console.error('Napaka pri brisanju dogodka:', err);
      res.status(500).json({ napaka: 'Napaka na strežniku.' });
    }
  }
);

export default router;
