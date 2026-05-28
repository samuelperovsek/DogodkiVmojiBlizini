import pool from '../db.js';

const DOVOLJENI_TIPI = new Set([
  'prosnja_odobrena',
  'prosnja_zavrnjena',
  'dogodek_aktiven',
  'dogodek_zavrnjen',
  'dogodek_promoviran',
  'nova_prijava',
  'odpoved_prijave',
  'prijava_potrjena',
  'prijava_preklicana',
  'dogodek_odpovedan_zame',
  'dogodek_kmalu',
  'geslo_spremenjeno',
  'profil_posodobljen',
  'splosno',
]);

export async function ustvariObvestilo({ uporabnikId, tip, sporocilo, povezava = null }) {
  if (!uporabnikId || !tip || !sporocilo) {
    throw new Error('ustvariObvestilo: manjka obvezno polje (uporabnikId/tip/sporocilo)');
  }
  if (!DOVOLJENI_TIPI.has(tip)) {
    throw new Error(`ustvariObvestilo: neveljaven tip "${tip}"`);
  }

  await pool.query(
    'INSERT INTO Obvestilo (TK_uporabnik, tip, sporocilo, povezava) VALUES (?, ?, ?, ?)',
    [uporabnikId, tip, sporocilo, povezava]
  );
}
