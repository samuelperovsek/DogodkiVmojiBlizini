import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pool from '../db.js';
import { transporter, FROM } from '../services/email.js';
import { ustvariObvestilo } from '../services/obvestila.js';

const router = express.Router();

const RESET_EXPIRY = '15m';

function pridobiFrontendUrl(req) {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.trim();
  if (process.env.FRONTEND_ORIGIN) {
    return process.env.FRONTEND_ORIGIN.split(',')[0].trim();
  }
  return `${req.protocol}://${req.get('host')}`;
}

function generirajResetToken(uporabnik) {
  return jwt.sign(
    { id: uporabnik.ID_uporabnik, namen: 'reset-geslo' },
    process.env.JWT_SECRET + uporabnik.geslo,
    { expiresIn: RESET_EXPIRY }
  );
}

function preveriResetToken(token, uporabnik) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET + uporabnik.geslo);
    if (payload.namen !== 'reset-geslo') return null;
    if (payload.id !== uporabnik.ID_uporabnik) return null;
    return payload;
  } catch {
    return null;
  }
}

router.post(
  '/pozabljeno-geslo',
  [body('email').trim().isEmail().withMessage('Neveljaven email.').normalizeEmail()],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const odgovor = {
      sporocilo: 'Če račun s tem e-naslovom obstaja, smo poslali navodila za ponastavitev gesla.',
    };

    try {
      const [vrstice] = await pool.query(
        'SELECT ID_uporabnik, ime, email, geslo FROM Uporabnik WHERE email = ?',
        [req.body.email]
      );

      if (vrstice.length === 0) {
        return res.json(odgovor);
      }

      const uporabnik = vrstice[0];
      const token = generirajResetToken(uporabnik);
      const resetLink = `${pridobiFrontendUrl(req)}/reset-geslo.html?token=${encodeURIComponent(token)}&id=${uporabnik.ID_uporabnik}`;

      const mailOptions = {
        from: FROM,
        to: uporabnik.email,
        subject: 'Ponastavitev gesla — Eventli.si',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #6d28d9;">Pozdravljen, ${uporabnik.ime}!</h2>
            <p>Prejeli smo zahtevek za ponastavitev gesla za tvoj račun.</p>
            <p>Klikni spodnji gumb za nastavitev novega gesla. Povezava velja <strong>15 minut</strong>.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Ponastavi geslo
              </a>
            </div>

            <p style="font-size: 0.85rem; color: #6c757d;">
              Če gumb ne deluje, kopiraj to povezavo v brskalnik:<br>
              <a href="${resetLink}" style="color: #6d28d9; word-break: break-all;">${resetLink}</a>
            </p>

            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <small style="color: #6c757d;">
              Če nisi zahteval ponastavitve gesla, lahko ta email mirno zanemariš.
              Tvoje geslo ostane nespremenjeno.
            </small>
          </div>
        `,
      };

      transporter.sendMail(mailOptions).catch(err => {
        console.error('[Pozabljeno geslo] Napaka pri pošiljanju emaila:', err);
      });

      res.json(odgovor);
    } catch (err) {
      console.error('[Pozabljeno geslo] Napaka:', err);
      res.json(odgovor);
    }
  }
);

router.post(
  '/reset-geslo',
  [
    body('id').isInt({ min: 1 }).withMessage('Neveljaven ID.'),
    body('token').notEmpty().withMessage('Manjka token.'),
    body('novo_geslo')
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

    const { id, token, novo_geslo } = req.body;

    try {
      const [vrstice] = await pool.query(
        'SELECT ID_uporabnik, geslo FROM Uporabnik WHERE ID_uporabnik = ?',
        [id]
      );

      if (vrstice.length === 0) {
        return res.status(400).json({ napaka: 'Povezava za ponastavitev ni veljavna ali je potekla.' });
      }

      const uporabnik = vrstice[0];
      const payload = preveriResetToken(token, uporabnik);
      if (!payload) {
        return res.status(400).json({ napaka: 'Povezava za ponastavitev ni veljavna ali je potekla.' });
      }

      const novHash = await bcrypt.hash(novo_geslo, 10);
      await pool.query(
        'UPDATE Uporabnik SET geslo = ? WHERE ID_uporabnik = ?',
        [novHash, uporabnik.ID_uporabnik]
      );

      ustvariObvestilo({
        uporabnikId: uporabnik.ID_uporabnik,
        tip: 'geslo_spremenjeno',
        sporocilo: 'Geslo si ponastavil/a preko e-poštne povezave. Če nisi bil/a to ti, takoj kontaktiraj podporo.',
        povezava: 'nastavitve.html',
      }).catch(err => console.error('Obvestilo geslo_spremenjeno (reset):', err));

      res.json({ sporocilo: 'Geslo uspešno ponastavljeno. Lahko se prijaviš z novim geslom.' });
    } catch (err) {
      console.error('[Reset geslo] Napaka:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

router.get('/reset-geslo/preveri', async (req, res) => {
  const { id, token } = req.query;
  if (!id || !token) return res.json({ veljaven: false });

  try {
    const [vrstice] = await pool.query(
      'SELECT ID_uporabnik, geslo FROM Uporabnik WHERE ID_uporabnik = ?',
      [id]
    );
    if (vrstice.length === 0) return res.json({ veljaven: false });

    const payload = preveriResetToken(token, vrstice[0]);
    res.json({ veljaven: payload !== null });
  } catch {
    res.json({ veljaven: false });
  }
});

export default router;
