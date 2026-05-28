import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js';
import { ustvariObvestilo } from '../services/obvestila.js';

const router = express.Router();

const OZNAKE_POLJ = {
  ime: 'ime',
  priimek: 'priimek',
  email: 'e-mail',
};

router.get('/me', zahtevajPrijavo, async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      `SELECT ID_uporabnik AS id, ime, priimek, email, vloga, datum_registracije
       FROM Uporabnik WHERE ID_uporabnik = ?`,
      [req.uporabnik.id]
    );

    if (vrstice.length === 0) {
      return res.status(404).json({ napaka: 'Uporabnik ne obstaja.' });
    }

    res.json({ uporabnik: vrstice[0] });
  } catch (err) {
    console.error('Napaka pri /me:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.patch(
  '/me',
  zahtevajPrijavo,
  [
    body('ime').optional().trim().notEmpty().withMessage('Ime ne sme biti prazno.').isLength({ max: 50 }),
    body('priimek').optional().trim().notEmpty().withMessage('Priimek ne sme biti prazen.').isLength({ max: 60 }),
    body('email').optional().trim().isEmail().withMessage('Neveljaven email.').normalizeEmail().isLength({ max: 255 }),
  ],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const polja = ['ime', 'priimek', 'email'].filter(k => req.body[k] !== undefined);
    if (polja.length === 0) {
      return res.status(400).json({ napaka: 'Ni sprememb za shraniti.' });
    }

    try {
      const [staraVrstica] = await pool.query(
        'SELECT ime, priimek, email FROM Uporabnik WHERE ID_uporabnik = ?',
        [req.uporabnik.id]
      );
      const star = staraVrstica[0] || {};

      if (polja.includes('email')) {
        const [obstaja] = await pool.query(
          'SELECT ID_uporabnik FROM Uporabnik WHERE email = ? AND ID_uporabnik <> ?',
          [req.body.email, req.uporabnik.id]
        );
        if (obstaja.length > 0) {
          return res.status(409).json({ napaka: 'Email je že v uporabi.' });
        }
      }

      const set = polja.map(k => `${k} = ?`).join(', ');
      const vrednosti = polja.map(k => req.body[k]);
      await pool.query(
        `UPDATE Uporabnik SET ${set} WHERE ID_uporabnik = ?`,
        [...vrednosti, req.uporabnik.id]
      );

      const [vrstice] = await pool.query(
        `SELECT ID_uporabnik AS id, ime, priimek, email, vloga, datum_registracije
         FROM Uporabnik WHERE ID_uporabnik = ?`,
        [req.uporabnik.id]
      );

      const spremenjenaPolja = polja.filter(k => String(star[k] ?? '') !== String(req.body[k] ?? ''));
      if (spremenjenaPolja.length > 0) {
        const oznake = spremenjenaPolja.map(k => OZNAKE_POLJ[k] || k).join(', ');
        ustvariObvestilo({
          uporabnikId: req.uporabnik.id,
          tip: 'profil_posodobljen',
          sporocilo: `Posodobil/a si svoj profil (${oznake}). Če nisi ti, takoj spremeni geslo.`,
          povezava: 'profil.html',
        }).catch(err => console.error('Obvestilo profil_posodobljen:', err));
      }

      res.json({ sporocilo: 'Profil posodobljen.', uporabnik: vrstice[0] });
    } catch (err) {
      console.error('Napaka pri posodabljanju profila:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

router.post(
  '/me/spremeni-geslo',
  zahtevajPrijavo,
  [
    body('staro_geslo').notEmpty().withMessage('Staro geslo je obvezno.'),
    body('novo_geslo')
      .isLength({ min: 8 }).withMessage('Novo geslo mora imeti vsaj 8 znakov.')
      .matches(/[A-Z]/).withMessage('Novo geslo mora vsebovati veliko črko.')
      .matches(/[0-9]/).withMessage('Novo geslo mora vsebovati številko.'),
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
      const [vrstice] = await pool.query(
        'SELECT geslo FROM Uporabnik WHERE ID_uporabnik = ?',
        [req.uporabnik.id]
      );
      if (vrstice.length === 0) return res.status(404).json({ napaka: 'Uporabnik ne obstaja.' });

      const ujema = await bcrypt.compare(req.body.staro_geslo, vrstice[0].geslo);
      if (!ujema) return res.status(401).json({ napaka: 'Staro geslo je napačno.' });

      const novHash = await bcrypt.hash(req.body.novo_geslo, 10);
      await pool.query('UPDATE Uporabnik SET geslo = ? WHERE ID_uporabnik = ?', [novHash, req.uporabnik.id]);

      ustvariObvestilo({
        uporabnikId: req.uporabnik.id,
        tip: 'geslo_spremenjeno',
        sporocilo: 'Geslo si uspešno spremenil/a. Če nisi bil/a to ti, takoj kontaktiraj podporo.',
        povezava: 'nastavitve.html',
      }).catch(err => console.error('Obvestilo geslo_spremenjeno:', err));

      res.json({ sporocilo: 'Geslo uspešno spremenjeno.' });
    } catch (err) {
      console.error('Napaka pri menjavi gesla:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

router.get('/me/dashboard', zahtevajPrijavo, async (req, res) => {
  const userId = req.uporabnik.id;
  try {
    const [prijave] = await pool.query(
      `SELECT d.ID_dogodek AS id, d.Naslov AS naslov, d.datum_zacetka, d.ulica,
              k.ime_kraja AS kraj, ka.naziv AS kategorija, p.opomnik_poslan
       FROM Prijava p
       JOIN Dogodek d ON p.TK_dogodek = d.ID_dogodek
       JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
       JOIN Kategorija ka ON d.TK_kategorija = ka.ID_kategorija
       WHERE p.TK_uporabnik = ?
       ORDER BY d.datum_zacetka ASC`,
      [userId]
    );

    const [priljubljeni] = await pool.query(
      `SELECT d.ID_dogodek AS id, d.Naslov AS naslov, d.datum_zacetka,
              k.ime_kraja AS kraj, ka.naziv AS kategorija
       FROM Priljubljeni_dogodki pd
       JOIN Dogodek d ON pd.TK_dogodek = d.ID_dogodek
       JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
       JOIN Kategorija ka ON d.TK_kategorija = ka.ID_kategorija
       WHERE pd.TK_uporabnik = ?
       ORDER BY pd.datum_shranjevanja DESC`,
      [userId]
    );

    const [ocene] = await pool.query(
      `SELECT o.ID_ocena AS id, o.ocena, o.komentar, o.datum_objave,
              d.Naslov AS dogodek_naslov, d.ID_dogodek AS dogodek_id
       FROM Ocena_komentar o
       JOIN Dogodek d ON o.TK_dogodek = d.ID_dogodek
       WHERE o.TK_uporabnik = ?
       ORDER BY o.datum_objave DESC`,
      [userId]
    );

    const [organizatorji] = await pool.query(
      `SELECT u.ID_uporabnik AS id, CONCAT(u.ime, ' ', u.priimek) AS naziv, u.email AS spletna_stran
       FROM Priljubljeni_organizatorji po
       JOIN Uporabnik u ON po.TK_organizator = u.ID_uporabnik
       WHERE po.TK_uporabnik = ?`,
      [userId]
    );

    res.json({
      prijave,
      priljubljeni,
      ocene,
      organizatorji,
      statistike: {
        prijave: prijave.length,
        priljubljeni: priljubljeni.length,
        ocene: ocene.length,
        organizatorji: organizatorji.length,
      },
    });
  } catch (err) {
    console.error('Napaka pri /me/dashboard:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

export default router;
