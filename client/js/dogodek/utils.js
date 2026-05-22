import { SERVER_URL } from '../auth.js';

export function pridobiPotSlike(slikaIzBaze, privzetaSlika) {
  if (!slikaIzBaze) return privzetaSlika;
  if (slikaIzBaze.startsWith('/public/')) return `${SERVER_URL}${slikaIzBaze.replace('/public', '')}`;
  if (slikaIzBaze.startsWith('http://') || slikaIzBaze.startsWith('https://')) return slikaIzBaze;
  if (slikaIzBaze.startsWith('/uploads/')) return `${SERVER_URL}${slikaIzBaze}`;
  return `${SERVER_URL}/uploads/dogodkov/${slikaIzBaze}`;
}

export function generirajZvezdice(ocena) {
  let zvezdiceHtml = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= ocena) {
      zvezdiceHtml += '<i class="bi bi-star-fill text-warning me-0.5"></i>';
    } else {
      zvezdiceHtml += '<i class="bi bi-star text-muted me-0.5"></i>';
    }
  }
  return zvezdiceHtml;
}

export function posodobiIzgledVnosaZvezdic(trenutnaOcena) {
  const zvezdice = document.querySelectorAll('.tekst-vnos-zvezda');
  zvezdice.forEach(zvezda => {
    const vrednost = parseInt(zvezda.getAttribute('data-vrednost'));
    if (vrednost <= trenutnaOcena) {
      zvezda.classList.remove('bi-star', 'text-muted');
      zvezda.classList.add('bi-star-fill', 'text-warning');
    } else {
      zvezda.classList.remove('bi-star-fill', 'text-warning');
      zvezda.classList.add('bi-star', 'text-muted');
    }
  });
}

const MESECI = ['januar','februar','marec','april','maj','junij','julij','avgust','september','oktober','november','december'];
const MESECI_KRATKI = ['JAN','FEB','MAR','APR','MAJ','JUN','JUL','AVG','SEP','OKT','NOV','DEC'];
const DNEVI_KRATKI = ['ned','pon','tor','sre','čet','pet','sob'];

export function pripraviPodatkeZaPrikaz(dogodek) {
  const dZacetek = new Date(dogodek.datum_zacetka);

  const privzeta = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80';
  const slikaUrl = pridobiPotSlike(dogodek.slika, privzeta);
  const cena = parseFloat(dogodek.cena);
  const cenaIzpis = cena > 0 ? `${cena.toFixed(0)} €` : 'Brezplačno';
  const cenaRazred = cena > 0 ? '' : 'free';

  const orgIme = dogodek.organizator_ime ? `${dogodek.organizator_ime} ${dogodek.organizator_priimek}` : 'Neznan organizator';
  const orgIniciali = dogodek.organizator_ime
    ? `${dogodek.organizator_ime[0]}${dogodek.organizator_priimek[0]}`.toUpperCase()
    : 'ORG';

  const ulicaIzpis = dogodek.ulica || '';
  const krajIzpis = dogodek.kraj || 'Neznana lokacija';
  const polnaLokacija = ulicaIzpis ? `${ulicaIzpis}, ${krajIzpis}` : krajIzpis;

  const sedezevSkupaj = dogodek.st_sedezov || 'Ni omejitve';
  const sedezevProstih = dogodek.st_prostih_sedezov !== undefined && dogodek.st_prostih_sedezov !== null
    ? `${dogodek.st_prostih_sedezov} / ${sedezevSkupaj} prostih mest`
    : 'Razpoložljivo';

  const statusPrevod = {
    'v_pregledu': 'Čaka na potrditev',
    'v_pripravi': 'V pripravi',
    'aktiven': 'Aktiven',
    'promoviran': 'Izpostavljen',
    'zakljucen': 'Zaključen',
    'odpovedan': 'Odpovedan',
  };

  return {
    dan: dZacetek.getDate(),
    mesecKratica: MESECI_KRATKI[dZacetek.getMonth()],
    mesecPolno: MESECI[dZacetek.getMonth()],
    leto: dZacetek.getFullYear(),
    danVTednu: DNEVI_KRATKI[dZacetek.getDay()],
    ura: dZacetek.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' }),
    slikaUrl,
    cenaIzpis,
    cenaRazred,
    orgIme,
    orgIniciali,
    polnaLokacija,
    sedezevSkupaj,
    sedezevProstih,
    lepStatus: statusPrevod[dogodek.status] || dogodek.status || 'Aktiven',
  };
}
