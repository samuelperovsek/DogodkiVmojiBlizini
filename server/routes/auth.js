import express from 'express';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto'; 
import pool from '../db.js';

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

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3001/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const ime = profile.name.givenName || 'Google';
      const priimek = profile.name.familyName || 'Uporabnik';

      const [uporabniki] = await pool.query('SELECT * FROM Uporabnik WHERE email = ?', [email]);
      
      let uporabnik;
      if (uporabniki.length > 0) {
        uporabnik = uporabniki[0];
      } else {
        const surovoGeslo = crypto.randomBytes(32).toString('hex');
        const hashGesla = await bcrypt.hash(surovoGeslo, 10);
        
        const [rezultat] = await pool.query(
          "INSERT INTO Uporabnik (ime, priimek, email, geslo, vloga) VALUES (?, ?, ?, ?, 'uporabnik')",
          [ime, priimek, email, hashGesla]
        );
        
        uporabnik = {
          ID_uporabnik: rezultat.insertId,
          ime,
          priimek,
          email,
          vloga: 'uporabnik'
        };
      }
      return done(null, uporabnik);
    } catch (err) {
      return done(err, null);
    }
  }
));

router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback', 
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: process.env.NODE_ENV === 'production' 
      ? '/prijava.html?napaka=google' 
      : 'http://127.0.0.1:5500/DogodkiVmojiBlizini/client/prijava.html?napaka=google'
  }),
  (req, res) => {
    // Ustvarimo JWT žeton z ustreznimi podatki uporabnika
    const token = ustvariToken(req.user);

    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? `/?token=${token}` 
      : `http://127.0.0.1:5500/DogodkiVmojiBlizini/client/index.html?token=${token}`;
      
    res.redirect(frontendUrl);
  }
);

router.post(
  '/registracija',
  [
    body('ime').trim().notEmpty().withMessage('Ime je obvezno.').isLength({ max: 50 }).withMessage('Ime je predolgo.'),
    body('priimek').trim().notEmpty().withMessage('Priimek je obvezen.').isLength({ max: 60 }).withMessage('Priimek je predolg.'),
    body('email').trim().isEmail().withMessage('Neveljaven e-poštni naslov.').normalizeEmail().isLength({ max: 255 }),
    body('geslo').isLength({ min: 8 }).withMessage('Geslo mora imeti vsaj 8 znakov.').matches(/[A-Z]/).withMessage('Geslo mora vsebovati veliko črko.').matches(/[0-9]/).withMessage('Geslo mora vsebovati številko.'),
    body('interesi').optional().isArray().withMessage('Interesi morajo biti poslani kot polje (array).'),
  ],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const { ime, priimek, email, geslo, interesi } = req.body;
    const connection = await pool.getConnection();

    try {
      const [obstajaUporabnik] = await connection.query('SELECT ID_uporabnik FROM Uporabnik WHERE email = ?', [email]);
      if (obstajaUporabnik.length > 0) {
        connection.release();
        return res.status(409).json({ napaka: 'Uporabnik s tem emailom že obstaja.' });
      }

      const hashGesla = await bcrypt.hash(geslo, 10);
      await connection.beginTransaction();

      const [rezultat] = await connection.query(
        `INSERT INTO Uporabnik (ime, priimek, email, geslo, vloga) VALUES (?, ?, ?, ?, 'uporabnik')`,
        [ime, priimek, email, hashGesla]
      );

      const noviUporabnikId = rezultat.insertId;

      if (interesi && interesi.length > 0) {
        const vrednostiInteresov = interesi.map(katId => [noviUporabnikId, katId]);
        await connection.query('INSERT INTO Uporabnik_Interesi (TK_uporabnik, TK_kategorija) VALUES ?', [vrednostiInteresov]);
      }

      await connection.commit();
      connection.release();

      const uporabnik = { ID_uporabnik: noviUporabnikId, email, vloga: 'uporabnik' };
      const token = ustvariToken(uporabnik);

      res.status(201).json({
        sporocilo: 'Račun uspešno ustvarjen z interesi.',
        token,
        uporabnik: { id: uporabnik.ID_uporabnik, ime, priimek, email, vloga: uporabnik.vloga },
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      console.error('Napaka pri registraciji:', err);
      res.status(500).json({ napaka: 'Napaka strežnika pri shranjevanju računa.' });
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
      const [vrstice] = await pool.query('SELECT * FROM Uporabnik WHERE email = ?', [email]);
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

export default router;