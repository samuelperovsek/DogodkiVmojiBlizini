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

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

router.post('/dogodki', zahtevajPrijavo, zahtevajOrganizatorja, upload.single('slika'), async (req, res) => {
  try {
    const p = req.body;
    
    let potDoSlike = null;
    if (req.file) {
      potDoSlike = `/public/uploads/dogodkov/${req.file.filename}`;
    }

    const datumZacetka = `${p.datum_zacetka} ${p.ura_zacetka}:00`;
    
    const datumKonca = (p.vecdnevno === 'true' && p.datum_konca && p.ura_konca) 
      ? `${p.datum_konca} ${p.ura_konca}:00` 
      : null;

    const vrednosti = [
      parseInt(p.id_organizatorja),                    
      p.naslov, 
      p.kratek_opis, 
      p.opis || null, 
      Number.isNaN(parseInt(p.lokacija_mesto)) ? 1000 : parseInt(p.lokacija_mesto),      
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
      p.podkategorija || null
    ];

    const sql = `
      INSERT INTO Dogodek (
        TK_uporabnik_organizator, Naslov, kratek_opis, opis, TK_kraj, ulica, ime_prizorisca, 
        datum_zacetka, datum_konca, vecdnevno, telefon, email, spletna_stran, slika, 
        st_sedezov, st_prostih_sedezov, tip_cene, cena, prijave_preko_platforme, opomnik_24h, 
        status, TK_kategorija, podkategorija
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'v_pregledu', ?, ?)
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

router.get('/organizator-podatki', zahtevajPrijavo, async (req, res) => {
  try {
    const idUporabnika = req.query.id; 

    if (!idUporabnika) {
      return res.status(400).json({ napaka: 'ID uporabnika manjka.' });
    }

    const [rows] = await pool.query(
      'SELECT email, naziv_podjetja, spletna_stran, telefon FROM Uporabnik WHERE ID_uporabnik = ? AND vloga = "organizator"',
      [idUporabnika]
    );

    if (rows.length === 0) {
      return res.status(404).json({ napaka: 'Organizator s tem ID-jem ne obstaja.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Napaka pri pridobivanju podatkov organizatorja:', err);
    res.status(500).json({ napaka: 'Napaka na strežniku.' });
  }
});

export default router;