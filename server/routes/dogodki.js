import express from 'express';
import pool from '../db.js';

const router = express.Router();

import { zahtevajPrijavo } from '../middleware/auth.js';

router.get('/dogodki/najboljsi', async (req, res) => {
  try {
    const [dogodki] = await pool.query(`
      SELECT 
        d.ID_dogodek, d.Naslov, d.opis, d.ulica, d.datum_zacetka, d.slika, d.cena, d.status,
        k.ime_kraja AS kraj, kat.naziv AS kategorija
      FROM Dogodek d
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
      WHERE d.status = 'promoviran'
        AND d.datum_zacetka BETWEEN NOW() AND NOW() + INTERVAL 30 DAY
      ORDER BY d.datum_zacetka ASC
      LIMIT 6
    `);
    res.json(dogodki);
  } catch (err) {
    console.error(err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.get('/dogodki', zahtevajPrijavo, async (req, res) => {
  try {
    const { lokacija, datum, cene, kategorije, userLat, userLng, maxRazdalja, sort, page, limit } = req.query;

    // Paginacija nastavitve
    const trenutnaStran = parseInt(page) || 1;
    const poStrani = parseInt(limit) || 6;
    const zamik = (trenutnaStran - 1) * poStrani;

    let queryArgs = [];
    let razdaljaStolpec = '';
    
    // Haversinova formula za izračun razdalje med dvema koordinatama
    if (userLat && userLng) {
      razdaljaStolpec = `,
        (6371 * acos(
          cos(radians(?)) * cos(radians(d.lat)) * cos(radians(d.lng) - radians(?)) + 
          sin(radians(?)) * sin(radians(d.lat))
        )) AS razdalja_km`;
      
      queryArgs.push(parseFloat(userLat), parseFloat(userLng), parseFloat(userLat));
    } else {
      razdaljaStolpec = `, NULL AS razdalja_km`;
    }

    let whereSql = `
      WHERE d.status IN ('aktiven', 'promoviran')
        AND d.datum_zacetka >= NOW()
    `;

    if (lokacija) {
      whereSql += ` AND (k.ime_kraja LIKE ? OR d.ulica LIKE ?)`;
      queryArgs.push(`%${lokacija}%`, `%${lokacija}%`);
    }

    if (kategorije) {
      const seznamKategorij = kategorije.split(',');
      whereSql += ` AND kat.naziv IN (${seznamKategorij.map(() => '?').join(',')})`;
      queryArgs.push(...seznamKategorij);
    }

    if (cene) {
      const seznamCen = cene.split(',');
      let cenaQueries = [];

      seznamCen.forEach(c => {
        if (c === 'brezplacno') {
          cenaQueries.push(`d.cena = 0`);
        } else if (c === 'do_10') {
          cenaQueries.push(`(d.cena > 0 AND d.cena <= 10)`);
        } else if (c === '10_30') {
          cenaQueries.push(`(d.cena > 10 AND d.cena <= 30)`);
        } else if (c === 'nad_30') {
          cenaQueries.push(`d.cena > 30`);
        }
      });

      if (cenaQueries.length > 0) {
        whereSql += ` AND (${cenaQueries.join(' OR ')})`;
      }
    }

    if (datum) {
      if (datum === 'danes') {
        whereSql += ` AND DATE(d.datum_zacetka) = CURDATE()`;
      } else if (datum === 'jutri') {
        whereSql += ` AND DATE(d.datum_zacetka) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`;
      } else if (datum === 'ta_teden') {
        whereSql += ` AND YEARWEEK(d.datum_zacetka, 1) = YEARWEEK(CURDATE(), 1)`;
      } else if (datum === 'vikend') {
        whereSql += ` AND WEEKDAY(d.datum_zacetka) IN (4, 5, 6)`;
      }
    }

    let avtomatskiHavingSql = '';
    if (userLat && userLng && maxRazdalja) {
      avtomatskiHavingSql = ` HAVING razdalja_km <= ?`;
      queryArgs.push(parseFloat(maxRazdalja));
    }

    const sqlStevec = `
      SELECT COUNT(*) AS skupno FROM (
        SELECT d.ID_dogodek ${razdaljaStolpec}
        FROM Dogodek d
        LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
        LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
        ${whereSql}
        ${avtomatskiHavingSql}
      ) AS najdeni_dogodki
    `;
    
    const [rezultatStevca] = await pool.query(sqlStevec, queryArgs);
    const skupnoStevilo = rezultatStevca[0]?.skupno || 0;

    let sortirajSql = ' ORDER BY d.datum_zacetka ASC';
    if (sort === 'cena') {
      sortirajSql = ' ORDER BY d.cena ASC, d.datum_zacetka ASC';
    } else if (sort === 'priljubljenost') {
      sortirajSql = ' ORDER BY (SELECT COUNT(*) FROM Prijava p WHERE p.TK_dogodek = d.ID_dogodek) DESC, d.datum_zacetka ASC';
    } else if (sort === 'oddaljenost' && userLat && userLng) {
      sortirajSql = ' ORDER BY razdalja_km ASC, d.datum_zacetka ASC';
    }

    let sqlGlavni = `
      SELECT 
        d.ID_dogodek, d.Naslov, d.opis, d.ulica, d.datum_zacetka, d.slika, d.cena, d.status,
        k.ime_kraja AS kraj, kat.naziv AS kategorija
        ${razdaljaStolpec}
      FROM Dogodek d
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
      ${whereSql}
      ${avtomatskiHavingSql}
      ${sortirajSql}
      LIMIT ? OFFSET ?
    `;

    queryArgs.push(poStrani, zamik);

    const [dogodki] = await pool.query(sqlGlavni, queryArgs);

    res.json({
      skupnoStevilo: skupnoStevilo,
      dogodki: dogodki
    });

  } catch (err) {
    console.error('Napaka pri pridobivanju dogodkov z filtri:', err);
    res.status(500).json({ napaka: 'Napaka strežnika pri pridobivanju dogodkov.' });
  }
});

router.get('/dogodki/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [dogodki] = await pool.query(`
      SELECT 
        d.*,
        k.ime_kraja AS kraj, 
        kat.naziv AS kategorija,
        u.ime AS organizator_ime,
        u.priimek AS organizator_priimek
      FROM Dogodek d
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      LEFT JOIN Kategorija kat ON d.TK_kategorija = kat.ID_kategorija
      LEFT JOIN Uporabnik u ON d.TK_uporabnik_organizator = u.ID_uporabnik
      WHERE d.ID_dogodek = ?
    `, [id]);

    if (dogodki.length === 0) {
      return res.status(404).json({ napaka: 'Dogodek ne obstaja.' });
    }

    res.json(dogodki[0]);
  } catch (err) {
    console.error('Napaka pri pridobivanju podrobnosti dogodka:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.get('/dogodki/:id/prijava-status', zahtevajPrijavo, async (req, res) => {
  try {
    const [vrstice] = await pool.query(
      'SELECT 1 FROM Prijava WHERE TK_uporabnik = ? AND TK_dogodek = ? LIMIT 1',
      [req.uporabnik.id, req.params.id]
    );
    res.json({ prijavljen: vrstice.length > 0 });
  } catch (err) {
    console.error('Napaka pri preverjanju statusa prijave:', err);
    res.status(500).json({ napaka: 'Napaka strežnika.' });
  }
});

router.post('/dogodki/:id/rezervacija', zahtevajPrijavo, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const dogodekId = req.params.id;
    const uporabnikId = req.uporabnik?.id;

    if (!uporabnikId) {
      return res.status(401).json({ error: 'Niste prijavljeni.' });
    }

    await connection.beginTransaction();

    const [dogodki] = await connection.query(
      'SELECT st_prostih_sedezov, datum_zacetka, status FROM Dogodek WHERE ID_dogodek = ? FOR UPDATE',
      [dogodekId]
    );

    if (dogodki.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Dogodek ne obstaja.' });
    }

    const dogodek = dogodki[0];

    if (new Date(dogodek.datum_zacetka) <= new Date()) {
      await connection.rollback();
      return res.status(400).json({ message: 'Dogodek se je že začel ali pa je zaključen.' });
    }

    if (dogodek.st_prostih_sedezov !== null && dogodek.st_prostih_sedezov <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Žal so vsa mesta za ta dogodek že zasedena.' });
    }

    try {
      await connection.query(
        'INSERT INTO Prijava (TK_uporabnik, TK_dogodek) VALUES (?, ?)',
        [uporabnikId, dogodekId]
      );
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return res.status(400).json({ message: 'Na ta dogodek ste že prijavljeni.' });
      }
      throw dbErr;
    }

    if (dogodek.st_prostih_sedezov !== null) {
      await connection.query(
        'UPDATE Dogodek SET st_prostih_sedezov = st_prostih_sedezov - 1 WHERE ID_dogodek = ?',
        [dogodekId]
      );
    }

    await connection.commit();
    res.json({ uspeh: true, message: 'Rezervacija uspešna.' });

  } catch (err) {
    await connection.rollback();
    console.error('Napaka pri rezervaciji:', err);
    res.status(500).json({ message: 'Napaka strežnika pri izvajanju rezervacije.' });
  } finally {
    connection.release();
  }
});

router.delete('/dogodki/:id/rezervacija', zahtevajPrijavo, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const dogodekId = req.params.id;
    const uporabnikId = req.uporabnik.id;

    await connection.beginTransaction();

    const [vrstice] = await connection.query(
      'SELECT ID_prijava FROM Prijava WHERE TK_uporabnik = ? AND TK_dogodek = ? FOR UPDATE',
      [uporabnikId, dogodekId]
    );

    if (vrstice.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Nisi prijavljen na ta dogodek.' });
    }

    await connection.query(
      'DELETE FROM Prijava WHERE TK_uporabnik = ? AND TK_dogodek = ?',
      [uporabnikId, dogodekId]
    );

    await connection.query(
      'UPDATE Dogodek SET st_prostih_sedezov = st_prostih_sedezov + 1 WHERE ID_dogodek = ? AND st_prostih_sedezov IS NOT NULL',
      [dogodekId]
    );

    await connection.commit();
    res.json({ uspeh: true, message: 'Uspešno odjavljen z dogodka.' });
  } catch (err) {
    await connection.rollback();
    console.error('Napaka pri odjavi z dogodka:', err);
    res.status(500).json({ message: 'Napaka strežnika pri odjavi.' });
  } finally {
    connection.release();
  }
});

export default router;