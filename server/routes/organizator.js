import express from 'express';
import db from '../db.js'; 
import { zahtevajPrijavo } from '../middleware/auth.js'; 

const router = express.Router();

router.get('/:id', zahtevajPrijavo, async (req, res) => {
  const organizatorId = parseInt(req.params.id);
  const trenutniUporabnikId = req.user ? req.user.id : null;

  if (isNaN(organizatorId)) {
    return res.status(400).json({ error: 'Napačen ID organizatorja.' });
  }

  try {
    const [orgPodatki] = await db.query(`
      SELECT 
        u.ID_uporabnik, 
        u.ime, 
        u.priimek, 
        u.email,
        u.naziv_podjetja,
        u.spletna_stran,
        (SELECT COUNT(*) FROM Priljubljeni_organizatorji WHERE TK_organizator = u.ID_uporabnik) AS sledilci_count
      FROM Uporabnik u
      WHERE u.ID_uporabnik = ? AND u.vloga = 'organizator'
    `, [organizatorId]);

    if (orgPodatki.length === 0) {
      return res.status(404).json({ error: 'Organizator ni bil najden.' });
    }

    const organizator = orgPodatki[0];

    let jeSledil = false;
    if (trenutniUporabnikId) {
      const [sledenje] = await db.query(`
        SELECT 1 FROM Priljubljeni_organizatorji 
        WHERE TK_uporabnik = ? AND TK_organizator = ?
      `, [trenutniUporabnikId, organizatorId]);
      
      jeSledil = sledenje.length > 0;
    }

    const [dogodki] = await db.query(`
      SELECT 
        d.ID_dogodek, 
        d.Naslov, 
        d.kratek_opis, 
        d.opis, 
        d.datum_zacetka, 
        d.cena, 
        d.slika, 
        d.ulica, 
        k.ime_kraja AS kraj, 
        kat.naziv AS kategorija
      FROM Dogodek d
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
      WHERE d.TK_uporabnik_organizator = ? AND d.status IN ('aktiven', 'promoviran')
      ORDER BY d.datum_zacetka ASC
    `, [organizatorId]);

    return res.json({
      profil: {
        id: organizator.ID_uporabnik,
        ime: organizator.ime,
        priimek: organizator.priimek,
        naziv_podjetja: organizator.naziv_podjetja,
        email: organizator.email,
        spletna_stran: organizator.spletna_stran,
        sledilci_count: parseInt(organizator.sledilci_count || 0),
        je_sledil: jeSledil
      },
      dogodki: dogodki
    });

  } catch (err) {
    console.error('Napaka pri pridobivanju podatkov organizatorja:', err);
    return res.status(500).json({ error: 'Napaka na strežniku.' });
  }
});

export default router;