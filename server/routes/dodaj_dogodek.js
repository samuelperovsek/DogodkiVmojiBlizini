import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import pool from '../db.js';

import { zahtevajPrijavo, zahtevajAdmina, zahtevajOrganizatorja } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'dogodkov');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unikatno = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unikatno + path.extname(file.originalname));
  }
});

const DOVOLJENI_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (DOVOLJENI_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Dovoljene so samo slike (JPEG, PNG, WebP).'));
    }
  }
});

router.post('/dogodki', zahtevajPrijavo, zahtevajOrganizatorja, upload.single('slika'), async (req, res) => {
  try {
    const p = req.body;
    
    let potDoSlike = null;
    if (req.file) {
      potDoSlike = `/uploads/dogodkov/${req.file.filename}`;
    }

    const datumZacetka = `${p.datum_zacetka} ${p.ura_zacetka}:00`;
    
    const datumKonca = (p.vecdnevno === 'true' && p.datum_konca && p.ura_konca) 
      ? `${p.datum_konca} ${p.ura_konca}:00` 
      : null;

    const postnaStevilka = Number.isNaN(parseInt(p.lokacija_mesto)) ? 1000 : parseInt(p.lokacija_mesto);

    let lat = null;
    let lng = null;

    try {
      const [krajRes] = await pool.query('SELECT ime_kraja FROM Kraj WHERE postna_stevilka = ?', [postnaStevilka]);
      const krajIme = krajRes.length > 0 ? krajRes[0].ime_kraja : '';

      if (p.lokacija_naslov && krajIme) {
        const polnNaslov = `${p.lokacija_naslov}, ${krajIme}, Slovenia`;
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(polnNaslov)}&limit=1`,
          { headers: { 'User-Agent': 'EventliApp/1.0' } }
        );
        const data = await response.json();

        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
          console.log(`[GEO] Uspešno geokodirano: ${polnNaslov} -> Lat: ${lat}, Lng: ${lng}`);
        } else {
          console.warn(`[GEO] Ni mogoče najti koordinat za naslov: ${polnNaslov}`);
        }
      }
    } catch (geoErr) {
      console.error('Napaka pri pridobivanju lokacije (Nominatim API):', geoErr);
    }

    const vrednosti = [
      req.uporabnik.id,
      p.naslov,
      p.kratek_opis, 
      p.opis || null, 
      postnaStevilka,      
      p.lokacija_naslov,                
      p.lokacija_prizorisce || null, 
      datumZacetka, 
      datumKonca, 
      p.vecdnevno === 'true' ? 1 : 0, 
      p.kontakt_telefon || null, 
      p.kontakt_email || null, 
      p.spletna_stran || null, 
      potDoSlike, 
      p.stevilo_mest ? parseInt(p.stevilo_mest) : null, 
      p.stevilo_mest ? parseInt(p.stevilo_mest) : null, 
      p.tip_cene, 
      parseFloat(p.cena) || 0.00, 
      p.prijave_omogocene === 'true' ? 1 : 0, 
      p.opomnik_omogocen === 'true' ? 1 : 0, 
      Number.isNaN(parseInt(p.kategorija)) ? 1 : parseInt(p.kategorija),         
      p.podkategorija || null,
      lat,
      lng,
    ];

    const sql = `
      INSERT INTO Dogodek (
        TK_uporabnik_organizator, Naslov, kratek_opis, opis, TK_kraj, ulica, ime_prizorisca, 
        datum_zacetka, datum_konca, vecdnevno, telefon, email, spletna_stran, slika, 
        st_sedezov, st_prostih_sedezov, tip_cene, cena, prijave_preko_platforme, opomnik_24h, 
        status, TK_kategorija, podkategorija, lat, lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'v_pregledu', ?, ?, ?, ?)
    `;

    await pool.query(sql, vrednosti); 

    res.status(201).json({ 
      uspeh: true, 
      sporocilo: 'Dogodek je bil uspešno ustvarjen in poslan v pregled!' 
    });

  } catch (err) {
    console.error('Napaka pri vstavljanju dogodka:', err);
    res.status(500).json({ 
      uspeh: false, 
      napaka: 'Prišlo je do napake na strežniku pri shranjevanju dogodka.' 
    });
  }
});

router.get('/organizator-podatki', zahtevajPrijavo, zahtevajOrganizatorja, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT email, naziv_podjetja, spletna_stran, telefon
       FROM Uporabnik WHERE ID_uporabnik = ?`,
      [req.uporabnik.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ napaka: 'Uporabnik ne obstaja.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Napaka pri pridobivanju podatkov organizatorja:', err);
    res.status(500).json({ napaka: 'Napaka na strežniku.' });
  }
});

router.get('/moji-dogodki', zahtevajPrijavo, zahtevajOrganizatorja, async (req, res) => {
  try {
    const [dogodki] = await pool.query(
      `SELECT
         d.ID_dogodek, d.Naslov, d.kratek_opis, d.opis, d.datum_zacetka, d.datum_konca,
         d.cena, d.tip_cene, d.slika, d.status, d.st_sedezov, d.st_prostih_sedezov,
         k.ime_kraja AS kraj, kat.naziv AS kategorija,
         (SELECT COUNT(*) FROM Prijava p WHERE p.TK_dogodek = d.ID_dogodek) AS st_prijav
       FROM Dogodek d
       LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
       LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
       WHERE d.TK_uporabnik_organizator = ?
       ORDER BY d.datum_zacetka DESC`,
      [req.uporabnik.id]
    );
    res.json({ dogodki });
  } catch (err) {
    console.error('Napaka pri /moji-dogodki:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.patch('/dogodki/:id', zahtevajPrijavo, zahtevajOrganizatorja, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ napaka: 'Neveljaven ID.' });
  }

  try {
    const [obstojeci] = await pool.query(
      'SELECT TK_uporabnik_organizator, st_sedezov, st_prostih_sedezov FROM Dogodek WHERE ID_dogodek = ?',
      [id]
    );
    if (obstojeci.length === 0) {
      return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
    }
    if (obstojeci[0].TK_uporabnik_organizator !== req.uporabnik.id) {
      return res.status(403).json({ napaka: 'Urejaš lahko samo svoje dogodke.' });
    }

    const p = req.body;
    const polja = [];
    const vrednosti = [];

    if (typeof p.naslov === 'string' && p.naslov.trim()) {
      polja.push('Naslov = ?');
      vrednosti.push(p.naslov.trim().slice(0, 100));
    }
    if (typeof p.kratek_opis === 'string' && p.kratek_opis.trim()) {
      polja.push('kratek_opis = ?');
      vrednosti.push(p.kratek_opis.trim().slice(0, 160));
    }
    if (p.opis !== undefined) {
      polja.push('opis = ?');
      vrednosti.push(p.opis ? String(p.opis) : null);
    }
    if (p.tip_cene === 'Plačljivo' || p.tip_cene === 'Brezplačno') {
      polja.push('tip_cene = ?');
      vrednosti.push(p.tip_cene);
    }
    if (p.cena !== undefined) {
      const cena = parseFloat(p.cena);
      polja.push('cena = ?');
      vrednosti.push(Number.isFinite(cena) && cena >= 0 ? cena : 0);
    }
    if (typeof p.datum_zacetka === 'string' && p.datum_zacetka.trim()) {
      polja.push('datum_zacetka = ?');
      vrednosti.push(p.datum_zacetka.trim());
    }
    if (p.st_sedezov !== undefined && p.st_sedezov !== null && p.st_sedezov !== '') {
      const novoSkupno = parseInt(p.st_sedezov, 10);
      if (Number.isInteger(novoSkupno) && novoSkupno >= 0) {
        const zasedeni = Math.max(0, (obstojeci[0].st_sedezov || 0) - (obstojeci[0].st_prostih_sedezov || 0));
        const prosta = Math.max(0, novoSkupno - zasedeni);
        polja.push('st_sedezov = ?', 'st_prostih_sedezov = ?');
        vrednosti.push(novoSkupno, prosta);
      }
    }

    if (polja.length === 0) {
      return res.status(400).json({ napaka: 'Ni sprememb za shraniti.' });
    }

    vrednosti.push(id);
    await pool.query(`UPDATE Dogodek SET ${polja.join(', ')} WHERE ID_dogodek = ?`, vrednosti);

    res.json({ sporocilo: 'Dogodek uspešno posodobljen.' });
  } catch (err) {
    console.error('Napaka pri urejanju dogodka:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.delete('/dogodki/:id', zahtevajPrijavo, zahtevajOrganizatorja, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ napaka: 'Neveljaven ID.' });
  }

  try {
    const [obstojeci] = await pool.query(
      'SELECT TK_uporabnik_organizator FROM Dogodek WHERE ID_dogodek = ?',
      [id]
    );
    if (obstojeci.length === 0) {
      return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
    }
    if (obstojeci[0].TK_uporabnik_organizator !== req.uporabnik.id) {
      return res.status(403).json({ napaka: 'Brišeš lahko samo svoje dogodke.' });
    }

    await pool.query('DELETE FROM Dogodek WHERE ID_dogodek = ?', [id]);
    res.json({ sporocilo: 'Dogodek uspešno izbrisan.' });
  } catch (err) {
    console.error('Napaka pri brisanju dogodka:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

export default router;