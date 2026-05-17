import express from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../db.js';
import { zahtevajPrijavo, zahtevajAdmina } from '../middleware/auth.js';

const router = express.Router();

const DOVOLJENE_VLOGE = ['uporabnik', 'organizator', 'admin'];

router.use(zahtevajPrijavo, zahtevajAdmina);

router.get('/uporabniki', async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      `SELECT ID_uporabnik AS id, ime, priimek, email, vloga, datum_registracije
       FROM Uporabnik
       ORDER BY datum_registracije DESC`
    );
    res.json({ uporabniki: vrstice });
  } catch (err) {
    console.error('Napaka pri /admin/uporabniki:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.patch(
  '/uporabniki/:id/vloga',
  [
    param('id').isInt({ min: 1 }),
    body('vloga').isIn(DOVOLJENE_VLOGE).withMessage(`Vloga mora biti ena od: ${DOVOLJENE_VLOGE.join(', ')}`),
  ],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const idUporabnika = Number(req.params.id);
    const { vloga } = req.body;

    if (idUporabnika === req.uporabnik.id) {
      return res.status(400).json({ napaka: 'Ne morete spremeniti svoje lastne vloge.' });
    }

    try {
      const [rezultat] = await pool.query(
        'UPDATE Uporabnik SET vloga = ? WHERE ID_uporabnik = ?',
        [vloga, idUporabnika]
      );

      if (rezultat.affectedRows === 0) {
        return res.status(404).json({ napaka: 'Uporabnik ne obstaja.' });
      }

      res.json({ sporocilo: `Vloga spremenjena v "${vloga}".` });
    } catch (err) {
      console.error('Napaka pri spreminjanju vloge:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    }
  }
);

router.get('/prosnje', async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      `SELECT p.ID_prosnja AS id, p.naziv_podjetja, p.spletna_stran, p.opis, p.razlog,
              p.status, p.datum_prosnje, p.datum_obravnave, p.opomba_admina,
              u.ID_uporabnik AS uporabnik_id, u.ime, u.priimek, u.email
       FROM Prosnja_organizator p
       JOIN Uporabnik u ON p.TK_uporabnik = u.ID_uporabnik
       ORDER BY
         CASE p.status WHEN 'cakajoca' THEN 0 ELSE 1 END,
         p.datum_prosnje DESC`
    );
    res.json({ prosnje: vrstice });
  } catch (err) {
    console.error('Napaka pri /admin/prosnje:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.patch(
  '/prosnje/:id',
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(['odobrena', 'zavrnjena']).withMessage('Status mora biti "odobrena" ali "zavrnjena".'),
    body('opomba_admina').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const napake = validationResult(req);
    if (!napake.isEmpty()) {
      return res.status(400).json({
        napaka: 'Neveljavni podatki',
        podrobnosti: napake.array().map(n => n.msg),
      });
    }

    const id = Number(req.params.id);
    const { status, opomba_admina } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [vrstice] = await conn.query(
        `SELECT p.*, u.vloga AS trenutna_vloga FROM Prosnja_organizator p
         JOIN Uporabnik u ON p.TK_uporabnik = u.ID_uporabnik
         WHERE p.ID_prosnja = ?`,
        [id]
      );
      if (vrstice.length === 0) {
        await conn.rollback();
        return res.status(404).json({ napaka: 'Prošnja ne obstaja.' });
      }

      const prosnja = vrstice[0];
      if (prosnja.status !== 'cakajoca') {
        await conn.rollback();
        return res.status(400).json({ napaka: `Prošnja je že "${prosnja.status}".` });
      }

      await conn.query(
        `UPDATE Prosnja_organizator
         SET status = ?, opomba_admina = ?, datum_obravnave = NOW(), TK_odobril = ?
         WHERE ID_prosnja = ?`,
        [status, opomba_admina || null, req.uporabnik.id, id]
      );

      if (status === 'odobrena') {
        const [orgRez] = await conn.query(
          `INSERT INTO Organizator (naziv, spletna_stran) VALUES (?, ?)`,
          [prosnja.naziv_podjetja, prosnja.spletna_stran]
        );

        await conn.query(
          `UPDATE Uporabnik SET vloga = 'organizator' WHERE ID_uporabnik = ?`,
          [prosnja.TK_uporabnik]
        );

        await conn.commit();
        return res.json({
          sporocilo: 'Prošnja odobrena. Uporabnik je zdaj organizator.',
          organizator_id: orgRez.insertId,
        });
      }

      await conn.commit();
      res.json({ sporocilo: 'Prošnja zavrnjena.' });
    } catch (err) {
      await conn.rollback();
      console.error('Napaka pri obravnavi prošnje:', err);
      res.status(500).json({ napaka: 'Napaka strežnika.' });
    } finally {
      conn.release();
    }
  }
);

export default router;
