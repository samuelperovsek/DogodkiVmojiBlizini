import { apiFetch, Auth, ApiError } from '../auth.js';
import { potrdiAkcijo, pobegniHtml } from '../components.js';
import { generirajZvezdice } from './utils.js';

const LIMIT_OCEN = 10;
let trenutnaStran = 1;
let dogodekIdLokal = null;

export function inicializirajOcene(dogodekId) {
  dogodekIdLokal = dogodekId;
  trenutnaStran = 1;

  const seznam = document.getElementById('ocene-seznam-kontejner');
  if (seznam) seznam.innerHTML = '';
  const naloziVecKont = document.getElementById('nalozi-vec-kontejner');
  if (naloziVecKont) naloziVecKont.style.display = '';

  document.getElementById('gumb-nalozi-vec')?.addEventListener('click', naloziOcene);
  return naloziOcene();
}

export async function naloziOcene() {
  if (!dogodekIdLokal) return;

  const kontejnerOcen = document.getElementById('ocene-seznam-kontejner');
  const kontejnerStatistike = document.getElementById('statistika-ocen-kontejner');

  try {
    const podaci = await apiFetch(`/dogodki/${dogodekIdLokal}/ocene?page=${trenutnaStran}&limit=${LIMIT_OCEN}`);

    const ocene = podaci.ocene || [];
    const imaSeOcen = podaci.imaSe;
    const stat = podaci.statistika;

    if (trenutnaStran === 1 && stat) {
      renderStatistika(stat, kontejnerStatistike);
      posodobiOcenoVHeaderju(stat);
    }

    if (ocene.length === 0 && trenutnaStran === 1) {
      kontejnerOcen.innerHTML = '<p class="text-muted text-center my-3">Ta dogodek še nima ocen. Bodi prvi!</p>';
      document.getElementById('nalozi-vec-kontejner').style.display = 'none';
      
      posodobiOcenoVHeaderju({ povprecje: 0, skupnoOcen: 0 });
      return;
    }

    const trenutniUporabnikId = Auth.getUporabnik()?.id ?? null;
    ocene.forEach(o => kontejnerOcen.appendChild(generirajOcenaKartico(o, trenutniUporabnikId)));

    if (!imaSeOcen || ocene.length < LIMIT_OCEN) {
      document.getElementById('nalozi-vec-kontejner').style.display = 'none';
    } else {
      trenutnaStran++;
    }
  } catch (err) {
    console.error('Napaka pri pridobivanju ocen:', err);
    if (trenutnaStran === 1) {
      kontejnerOcen.innerHTML = '<p class="text-danger text-center">Ni bilo mogoče naložiti komentarjev.</p>';
    }
  }
}

function posodobiOcenoVHeaderju(stat) {
  const kontejner = document.getElementById('dinamicna-ocena-header');
  if (!kontejner) return;

  const povprecje = Number(stat?.povprecje || 0);
  const skupnoOcen = Number(stat?.skupnoOcen || 0);

  if (skupnoOcen > 0 && povprecje > 0) {
    let znackaTekst = 'Priporočeno';
    if (povprecje >= 4.7) znackaTekst = 'Izjemno';
    else if (povprecje >= 4.3) znackaTekst = 'Odlično';
    else if (povprecje >= 4.0) znackaTekst = 'Zelo dobro';
    else if (povprecje < 3.5) znackaTekst = 'Dobro';

    kontejner.innerHTML = `
      <i class="bi bi-star-fill text-yellow-300"></i> 
      ${povprecje.toFixed(1)} 
      <span class="text-white/70">(${znackaTekst})</span>
    `;
  } else {
    kontejner.innerHTML = `
      <i class="bi bi-star text-white/50"></i> 
      <span class="text-white/70">Še ni ocen</span>
    `;
  }
}

function renderStatistika(stat, kontejner) {
  if (!kontejner) return;
  if (stat.skupnoOcen === 0) { kontejner.innerHTML = ''; return; }

  const zvezdiceHtml = generirajZvezdice(Math.round(stat.povprecje));
  const besedaOcena = stat.skupnoOcen === 1 ? 'ocena' : stat.skupnoOcen === 2 ? 'oceni' : stat.skupnoOcen < 5 ? 'ocene' : 'ocen';

  kontejner.innerHTML = `
    <div class="card p-3 mb-4">
      <div class="row align-items-center">
        <div class="col-md-4 text-center border-end">
          <h1 class="mb-0">${stat.povprecje}</h1>
          <div class="text-warning mb-1">${zvezdiceHtml}</div>
          <small class="text-muted">${stat.skupnoOcen} ${besedaOcena}</small>
        </div>
        <div class="col-md-8">
          ${[5, 4, 3, 2, 1].map(zvezda => `
            <div class="d-flex align-items-center mb-1">
              <span class="me-2" style="width: 15px;">${zvezda}</span>
              <div class="progress flex-grow-1" style="height: 8px;">
                <div class="progress-bar bg-warning" role="progressbar" style="width: ${stat.procenti[zvezda]}%;" aria-valuenow="${stat.procenti[zvezda]}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <small class="ms-2" style="width: 45px; text-align: right;">${stat.procenti[zvezda]}%</small>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function generirajOcenaKartico(o, trenutniUporabnikId) {
  const datumO = new Date(o.datum_objave || o.datum).toLocaleDateString('sl-SI');
  const uporabnikIme = pobegniHtml(o.ime_uporabnika ? `${o.ime.trim()} ${o.priimek[0]}.` : (o.ime || 'Obiskovalec'));
  const komentarTekst = o.komentar ? pobegniHtml(o.komentar.trim()) : '<em class="text-muted">Uporabnik ni dodal komentarja.</em>';
  const jeLastnik = trenutniUporabnikId !== null && o.uporabnik_id === trenutniUporabnikId;
  const brisiGumb = jeLastnik
    ? `<button class="btn btn-sm btn-link text-danger p-0 ms-2 gumb-brisi-svoj-komentar" data-id="${Number(o.ID_ocena)}" title="Izbrisati svoj komentar" style="font-size: 0.95rem; line-height: 1;"><i class="bi bi-trash"></i></button>`
    : '';
  const lastnikOznaka = jeLastnik
    ? '<span class="badge bg-light text-muted border ms-1" style="font-size: 0.65rem;">tvoj</span>'
    : '';

  const card = document.createElement('div');
  card.className = 'card p-3 border-light shadow-sm mb-3';
  card.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="d-flex align-items-center gap-2">
        <strong class="text-dark">${uporabnikIme}</strong>
        <span class="text-xs text-muted">• ${datumO}</span>
        ${lastnikOznaka}
      </div>
      <div class="text-sm d-flex align-items-center">
        ${generirajZvezdice(o.ocena)}
        ${brisiGumb}
      </div>
    </div>
    <p class="mb-0 text-secondary" style="font-size: 0.95rem;">${komentarTekst}</p>
  `;

  const brisiBtn = card.querySelector('.gumb-brisi-svoj-komentar');
  if (brisiBtn) brisiBtn.addEventListener('click', izbrisiSvojKomentar);
  return card;
}

async function izbrisiSvojKomentar(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;

  const potrjeno = await potrdiAkcijo({
    naslov: 'Izbriši svoj komentar',
    sporocilo: 'Komentar bo trajno izbrisan. Tega dejanja ni mogoče razveljaviti.',
    gumbPotrdi: 'Izbriši',
    tipGumba: 'btn-danger',
  });
  if (potrjeno !== true) return;

  btn.disabled = true;
  try {
    await apiFetch(`/ocene/${id}`, { method: 'DELETE' });
    window.pokaziToast?.('success', 'Komentar izbrisan.');
    trenutnaStran = 1;
    document.getElementById('ocene-seznam-kontejner').innerHTML = '';
    document.getElementById('nalozi-vec-kontejner').style.display = '';
    await naloziOcene();
  } catch (err) {
    window.pokaziToast?.('danger', err instanceof ApiError ? err.message : 'Napaka pri brisanju.');
    btn.disabled = false;
  }
}