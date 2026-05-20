import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo } from '../middleware/auth.js';

const router = express.Router();

function ustvariToken(uporabnik) {
  return jwt.sign(
    {
      id:    uporabnik.ID_uporabnik,
      email: uporabnik.email,
      vloga: uporabnik.vloga,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post(
  '/registracija',

  [
    body('ime')
      .trim()
      .notEmpty().withMessage('Ime je obvezno.')
      .isLength({ max: 50 }).withMessage('Ime je predolgo.'),
    body('priimek')
      .trim()
      .notEmpty().withMessage('Priimek je obvezen.')
      .isLength({ max: 60 }).withMessage('Priimek je predolg.'),
    body('email')
      .trim()
      .isEmail().withMessage('Neveljaven e-poštni naslov.')
      .normalizeEmail()
      .isLength({ max: 255 }),
    body('geslo')
      .isLength({ min: 8 }).withMessage('Geslo mora imeti vsaj 8 znakov.')
      .matches(/[A-Z]/).withMessage('Geslo mora vsebovati veliko črko.')
      .matches(/[0-9]/).withMessage('Geslo mora vsebovati številko.'),
  ],

  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const { ime, priimek, email, geslo } = req.body;

    try {
      const [obstajaUporabnik] = await pool.query(
        'SELECT ID_uporabnik FROM Uporabnik WHERE email = ?',
        [email]
      );
      if (obstajaUporabnik.length > 0) {
        return res.status(409).json({
          napaka: 'Uporabnik s tem emailom že obstaja.',
        });
      }

      const hashGesla = await bcrypt.hash(geslo, 10);

      const [rezultat] = await pool.query(
        `INSERT INTO Uporabnik (ime, priimek, email, geslo, vloga)
         VALUES (?, ?, ?, ?, 'uporabnik')`,
        [ime, priimek, email, hashGesla]
      );

      const uporabnik = {
        ID_uporabnik: rezultat.insertId,
        email,
        vloga: 'uporabnik',
      };

      const token = ustvariToken(uporabnik);

      res.status(201).json({
        sporocilo: 'Račun uspešno ustvarjen.',
        token,
        uporabnik: {
          id:      uporabnik.ID_uporabnik,
          ime,
          priimek,
          email,
          vloga:   uporabnik.vloga,
        },
      });
    } catch (err) {
      console.error('Napaka pri registraciji:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

router.post(
  '/prijava',

  [
    body('email').trim().isEmail().withMessage('Neveljaven email.').normalizeEmail(),
    body('geslo').notEmpty().withMessage('Geslo je obvezno.'),
  ],

  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const { email, geslo } = req.body;

    try {
      const [vrstice] = await pool.query(
        'SELECT * FROM Uporabnik WHERE email = ?',
        [email]
      );

      if (vrstice.length === 0) {
        return res.status(401).json({ napaka: 'Napačen email ali geslo.' });
      }

      const uporabnik = vrstice[0];

      const geslo_ujema = await bcrypt.compare(geslo, uporabnik.geslo);
      if (!geslo_ujema) {
        return res.status(401).json({ napaka: 'Napačen email ali geslo.' });
      }

      const token = ustvariToken(uporabnik);

      res.json({
        sporocilo: 'Prijava uspešna.',
        token,
        uporabnik: {
          id:      uporabnik.ID_uporabnik,
          ime:     uporabnik.ime,
          priimek: uporabnik.priimek,
          email:   uporabnik.email,
          vloga:   uporabnik.vloga,
        },
      });
    } catch (err) {
      console.error('Napaka pri prijavi:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

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
  [
    body('naziv_podjetja').trim().notEmpty().withMessage('Naziv podjetja je obvezen.').isLength({ max: 255 }),
    body('spletna_stran').optional({ checkFalsy: true }).trim().isURL().withMessage('Spletna stran ni veljaven URL.'),
    body('opis').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('razlog').trim().notEmpty().withMessage('Razlog je obvezen.').isLength({ min: 20, max: 1000 }).withMessage('Razlog mora imeti med 20 in 1000 znakov.'),
  ],
  zahtevajPrijavo,
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
