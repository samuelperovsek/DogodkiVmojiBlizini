import cron from 'node-cron';
import pool from '../db.js';
import { transporter, FROM } from './email.js';

cron.schedule('*/15 * * * *', async () => {
  console.log('[Cron] Preverjanje dogodkov za pošiljanje opomnikov...');

  try {
    const [prijave] = await pool.query(`
      SELECT 
        p.ID_prijava, 
        u.email AS uporabnik_email, 
        u.ime AS uporabnik_ime, 
        d.Naslov AS dogodek_naslov, 
        d.datum_zacetka,
        d.ulica,
        k.ime_kraja AS kraj
      FROM Prijava p
      JOIN Uporabnik u ON p.TK_uporabnik = u.ID_uporabnik
      JOIN Dogodek d ON p.TK_dogodek = d.ID_dogodek
      LEFT JOIN Kraj k ON d.TK_kraj = k.postna_stevilka
      WHERE p.opomnik_poslan = 0
        AND d.datum_zacetka <= NOW() + INTERVAL 1 DAY
        AND d.datum_zacetka > NOW()
    `);

    if (prijave.length === 0) {
      return;
    }

    for (const prijava of prijave) {
      const dZacetek = new Date(prijava.datum_zacetka);
      const formatiranDatum = dZacetek.toLocaleString('sl-SI', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      const lokacija = prijava.ulica ? `${prijava.ulica}, ${prijava.kraj}` : prijava.kraj;

      const mailOptions = {
        from: FROM,
        to: prijava.uporabnik_email,
        subject: `Opomnik: Jutri se začne dogodek ${prijava.dogodek_naslov}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #0d6efd;">Pozdravljeni, ${prijava.uporabnik_ime}!</h2>
            <p>To je avtomatski opomnik, da se čez manj kot 24 ur začne dogodek, na katerega ste se prijavili.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">${prijava.dogodek_naslov}</h3>
              <p style="margin-bottom: 5px;"><strong>📅 Kdaj:</strong> ${formatiranDatum}</p>
              <p style="margin-bottom: 0;"><strong>📍 Kje:</strong> ${lokacija}</p>
            </div>
            
            <p>Priporočamo, da na prizorišče prispete nekaj minut pred začetkom. Želimo vam prijetno izkušnjo!</p>
            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <small style="color: #6c757d;">Če se dogodka ne morete udeležiti, prosimo, da pravočasno odpovete svojo rezervacijo v profilu.</small>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        
        await pool.query('UPDATE Prijava SET opomnik_poslan = 1 WHERE ID_prijava = ?', [prijava.ID_prijava]);
        console.log(`[Cron] Opomnik uspešno poslan na ${prijava.uporabnik_email} za dogodek id: ${prijava.ID_prijava}`);
      } catch (mailErr) {
        console.error(`[Cron] Napaka pri pošiljanju maila za prijava_id ${prijava.ID_prijava}:`, mailErr);
      }
    }

  } catch (err) {
    console.error('[Cron] Napaka v glavnem opravilu opomnikov:', err);
  }
});