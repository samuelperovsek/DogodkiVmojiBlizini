import express from 'express';
import { body, validationResult } from 'express-validator';
import { transporter, FROM } from '../services/email.js';

const router = express.Router();

router.post(
  '/novicnik',
  [
    body('email')
      .trim()
      .isEmail().withMessage('Neveljaven e-poštni naslov.')
      .normalizeEmail(),
  ],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const { email } = req.body;

    try {
      await transporter.sendMail({
        from: FROM,
        to: email,
        subject: 'Dobrodošel v Eventli novičniku!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;">
            <h2 style="color: #6d28d9; margin-top: 0;">Hvala za prijavo! 🎉</h2>
            <p>Uspešno si se naročil/a na <strong>Eventli novičnik</strong>.</p>
            <p>Vsak teden ti bomo poslali izbor najboljših dogodkov v tvoji okolici — koncerti, delavnice, šport in več.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="https://www.eventli.si/dogodki.html" style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Razišči dogodke
              </a>
            </div>
            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <small style="color: #6c757d;">
              Če se nisi prijavil/a ti, lahko ta email mirno zanemariš. Odjava je možna kadarkoli.
            </small>
          </div>
        `,
      });

      res.json({ sporocilo: 'Uspešno naročen! Preveri svoj e-poštni predal.' });
    } catch (err) {
      console.error('Napaka pri pošiljanju novičnika:', err);
      res.status(500).json({ napaka: 'Napaka pri pošiljanju. Poskusi znova.' });
    }
  }
);

export default router;
