import { apiFetch, ApiError } from '../auth.js';
import { potrdiAkcijo } from '../components.js';

const MESECI = ['JAN','FEB','MAR','APR','MAJ','JUN','JUL','AVG','SEP','OKT','NOV','DEC'];
const VLOGA_RAZRED = { admin: 'status-rejected', organizator: 'status-promoted', uporabnik: 'status-approved' };

export function napolniProfil(u) {
  const polnoIme = `${u.ime} ${u.priimek}`;
  const inicialke = (u.ime[0] + u.priimek[0]).toUpperCase();

  document.getElementById('profileAvatar').textContent = inicialke;
  document.getElementById('profileImePriimek').textContent = polnoIme;
  document.getElementById('profileEmail').textContent = u.email;
  const badge = document.getElementById('profileVlogaBadge');
  badge.textContent = u.vloga;
  badge.className = 'status-badge ' + (VLOGA_RAZRED[u.vloga] || '');
}

function formatDatum(iso) {
  const d = new Date(iso);
  return {
    dan: String(d.getDate()).padStart(2, '0'),
    mesec: MESECI[d.getMonth()],
    ura: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

export function renderPrijave(prijave) {
  document.getElementById('prijaveCount').textContent = prijave.length;
  const el = document.getElementById('prijaveList');
  if (!prijave.length) {
    el.innerHTML = '<div class="text-center text-muted py-4">Nimaš še nobene prijave. <a href="dogodki.html">Razišči dogodke →</a></div>';
    return;
  }
  el.innerHTML = prijave.map(p => {
    const { dan, mesec, ura } = formatDatum(p.datum_zacetka);
    const opomnik = p.opomnik_poslan
      ? '<small class="text-success"><i class="bi bi-bell-fill"></i> Opomnik poslan</small>'
      : '<small class="text-muted"><i class="bi bi-bell"></i> Opomnik bo poslan 24h pred</small>';
    return `
      <div class="upcoming-event">
        <div class="d-flex align-items-center gap-3">
          <div class="event-date position-static flex-shrink-0">
            <span class="day">${dan}</span><span class="month">${mesec}</span>
          </div>
          <div class="flex-grow-1">
            <span class="badge bg-light text-dark">${p.kategorija}</span>
            <small class="text-muted ms-2"><i class="bi bi-clock"></i> ${ura} • <i class="bi bi-geo-alt"></i> ${p.kraj}</small>
            <h5 class="mb-0 mt-1" style="font-size: 0.98rem;"><a href="dogodek.html?id=${p.id}">${p.naslov}</a></h5>
            ${opomnik}
          </div>
          <span class="badge bg-success flex-shrink-0"><i class="bi bi-ticket-perforated"></i> Prijavljen</span>
        </div>
      </div>
    `;
  }).join('');
}

export function renderPriljubljeni(priljubljeni) {
  document.getElementById('priljubljeniCount').textContent = priljubljeni.length;
  const el = document.getElementById('priljubljeniList');
  if (!priljubljeni.length) {
    el.innerHTML = '<div class="text-center text-muted py-3" style="font-size:0.9rem;">Še nimaš priljubljenih.</div>';
    return;
  }
  el.innerHTML = priljubljeni.map(d => {
    const { dan, mesec } = formatDatum(d.datum_zacetka);
    return `
      <div class="d-flex gap-3 mb-3 align-items-center">
        <div class="event-date position-static flex-shrink-0" style="min-width: 48px; padding: 0.35rem 0.5rem;">
          <span class="day" style="font-size:1.1rem;">${dan}</span><span class="month" style="font-size:0.65rem;">${mesec}</span>
        </div>
        <div class="flex-grow-1" style="min-width: 0;">
          <small class="text-muted d-block"><i class="bi bi-geo-alt"></i> ${d.kraj}</small>
          <strong class="d-block" style="font-size:0.92rem;"><a href="dogodek.html?id=${d.id}">${d.naslov}</a></strong>
        </div>
      </div>
    `;
  }).join('');
}

export function renderOrganizatorji(organizatorji, onSpremembi) {
  document.getElementById('organizatorjiCount').textContent = organizatorji.length;
  const el = document.getElementById('organizatorjiList');
  if (!organizatorji.length) {
    el.innerHTML = '<div class="text-center text-muted py-3" style="font-size:0.9rem;">Ne slediš nobenemu organizatorju.</div>';
    return;
  }

  el.innerHTML = `<div class="d-flex flex-column gap-3">` + organizatorji.map(o => {
    const inic = o.naziv ? o.naziv.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'ORG';
    return `
      <div class="card p-3 shadow-sm border-0 position-relative organizator-kartica" data-id="${o.id || o.ID_uporabnik}">
        <div class="d-flex align-items-center gap-3">
          <div class="profile-avatar flex-shrink-0" style="width: 45px; height: 45px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; background-color: #0d6efd; color: white; border-radius: 50%; font-weight: bold;">
            ${inic}
          </div>
          <div class="flex-grow-1 min-w-0">
            <h6 class="mb-1 text-truncate" style="font-size:0.92rem;" title="${o.naziv}">${o.naziv}</h6>
            <p class="mb-0 text-muted" style="font-size: 0.8rem;">
              <i class="bi bi-patch-check-fill text-primary"></i> Preverjen
              ${o.spletna_stran ? `<br><i class="bi bi-link-45deg"></i> <a href="${o.spletna_stran}" target="_blank" class="text-muted text-decoration-none text-truncate d-inline-block" style="max-width:130px;">${o.spletna_stran.replace(/^https?:\/\/(www\.)?/, '')}</a>` : ''}
            </p>
          </div>
          <button class="btn btn-sm btn-link text-danger p-0 gumb-odstrani-org" style="font-size: 1.1rem;" title="Prenehaj slediti">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>
      </div>
    `;
  }).join('') + `</div>`;

  el.querySelectorAll('.gumb-odstrani-org').forEach(gumb => {
    gumb.addEventListener('click', (e) => odstraniOrganizatorja(e, onSpremembi));
  });
}

async function odstraniOrganizatorja(e, onSpremembi) {
  const kartica = e.target.closest('.organizator-kartica');
  const orgId = kartica.getAttribute('data-id');

  const potrjeno = await potrdiAkcijo({
    naslov: 'Prenehaj slediti',
    sporocilo: 'Ali res želiš prenehati slediti temu organizatorju? Njegovih dogodkov ne boš več videl med priporočenimi.',
    gumbPotrdi: 'Prenehaj slediti',
    tipGumba: 'btn-danger',
  });
  if (!potrjeno) return;

  try {
    await apiFetch(`/organizatorji/${orgId}/toggle-spremljaj`, { method: 'POST' });
    onSpremembi?.();
  } catch (err) {
    console.error('Napaka pri odstranjevanju:', err);
    window.pokaziToast?.('danger', 'Napaka pri poskusu prenehanja sledenja.');
  }
}

export function renderOcene(ocene, onSpremembi) {
  document.getElementById('oceneCount').textContent = ocene.length;
  const el = document.getElementById('oceneList');
  if (!ocene.length) {
    el.innerHTML = '<div class="text-center text-muted py-3" style="font-size:0.9rem;">Še nisi napisal nobene ocene.</div>';
    return;
  }
  el.innerHTML = '<div class="row g-3">' + ocene.map(o => {
    const zvezde = '<i class="bi bi-star-fill"></i>'.repeat(o.ocena) + '<i class="bi bi-star"></i>'.repeat(5 - o.ocena);
    const datum = new Date(o.datum_objave).toLocaleDateString('sl-SI');
    return `
      <div class="col-md-6">
        <div class="card p-3 h-100 position-relative">
          <button class="btn btn-sm btn-link text-danger p-0 position-absolute gumb-brisi-oceno"
                  data-id="${o.id}"
                  style="top: 0.5rem; right: 0.6rem; font-size: 1.05rem; line-height: 1;"
                  title="Izbriši komentar">
            <i class="bi bi-x-circle-fill"></i>
          </button>
          <h5 class="mb-1" style="font-size:1rem; padding-right: 1.5rem;"><a href="dogodek.html?id=${o.dogodek_id}">${o.dogodek_naslov}</a></h5>
          <div class="text-warning mb-2" style="font-size:0.9rem;">
            ${zvezde}
            <small class="text-muted ms-2">— ${datum}</small>
          </div>
          <p class="mb-0" style="font-size:0.9rem;">${o.komentar || '<em class="text-muted">Brez komentarja</em>'}</p>
        </div>
      </div>
    `;
  }).join('') + '</div>';

  el.querySelectorAll('.gumb-brisi-oceno').forEach(btn => {
    btn.addEventListener('click', (e) => izbrisiSvojOceno(e, onSpremembi));
  });
}

async function izbrisiSvojOceno(e, onSpremembi) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;

  const potrjeno = await potrdiAkcijo({
    naslov: 'Izbriši komentar',
    sporocilo: 'Komentar bo trajno izbrisan. Tega dejanja ni mogoče razveljaviti.',
    gumbPotrdi: 'Izbriši',
    tipGumba: 'btn-danger',
  });
  if (!potrjeno) return;

  btn.disabled = true;
  try {
    await apiFetch(`/ocene/${id}`, { method: 'DELETE' });
    window.pokaziToast?.('success', 'Komentar izbrisan.');
    onSpremembi?.();
  } catch (err) {
    window.pokaziToast?.('danger', err instanceof ApiError ? err.message : 'Napaka pri brisanju.');
    btn.disabled = false;
  }
}

export function nastaviStatistike(s) {
  document.getElementById('statPrijave').textContent = s.prijave;
  document.getElementById('statPriljubljeni').textContent = s.priljubljeni;
  document.getElementById('statOcene').textContent = s.ocene;
  document.getElementById('statOrganizatorji').textContent = s.organizatorji;
}
