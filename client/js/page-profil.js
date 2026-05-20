import { apiFetch, Auth, ApiError } from './auth.js';

if (!Auth.jePrijavljen()) {
  window.location.href = 'prijava.html';
}

const MESECI = ['JAN','FEB','MAR','APR','MAJ','JUN','JUL','AVG','SEP','OKT','NOV','DEC'];
const VLOGA_RAZRED = { admin: 'status-rejected', organizator: 'status-promoted', uporabnik: 'status-approved' };

function napolniProfil(u) {
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
  return { dan: String(d.getDate()).padStart(2,'0'), mesec: MESECI[d.getMonth()], ura: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` };
}

function renderPrijave(prijave) {
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

function renderPriljubljeni(priljubljeni) {
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

// OSVEŽENA IN POSODOBLJENA FUNKCIJA ZA PRIKAZ ORGANIZATORJEV
function renderOrganizatorji(organizatorji) {
  document.getElementById('organizatorjiCount').textContent = organizatorji.length;
  const el = document.getElementById('organizatorjiList');
  if (!organizatorji.length) {
    el.innerHTML = '<div class="text-center text-muted py-3" style="font-size:0.9rem;">Ne slediš nobenemu organizatorju.</div>';
    return;
  }

  // Ustvarimo enak čudovit stil kot v dogodek-podrobnosti.html
  el.innerHTML = `<div class="d-flex flex-column gap-3">` + organizatorji.map(o => {
    // Generiranje inicialk iz naziva organizacije ali podjetja
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
              ${o.spletna_stran ? `<br><i class="bi bi-link-45deg"></i> <a href="${o.spletna_stran}" target="_blank" class="text-muted text-decoration-none text-truncate d-inline-block style="max-width:130px;">${o.spletna_stran.replace(/^https?:\/\/(www\.)?/, '')}</a>` : ''}
            </p>
          </div>

          <button class="btn btn-sm btn-link text-danger p-0 gumb-odstrani-org" style="font-size: 1.1rem;" title="Prenehaj slediti">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>
      </div>
    `;
  }).join('') + `</div>`;

  // Aktiviramo Event Listenere na gumbih za odstranjevanje
  dodajDogodkeZaOdstranjevanjeOrganizatorjev();
}

// Pomožna funkcija za takojšen preklop spremljanja iz profila
function dodajDogodkeZaOdstranjevanjeOrganizatorjev() {
  document.querySelectorAll('.gumb-odstrani-org').forEach(gumb => {
    gumb.addEventListener('click', async (e) => {
      const kartica = e.target.closest('.organizator-kartica');
      const orgId = kartica.getAttribute('data-id');

      if (confirm('Ali res želite prenehati slediti temu organizatorju?')) {
        try {
          await apiFetch(`/organizatorji/${orgId}/toggle-spremljaj`, { method: 'POST' });
          // Ko uspešno odstranimo, osvežimo celotne podatke profila, da posodobimo grafe in sezname
          osveziPodatkeProfila();
        } catch (err) {
          console.error('Napaka pri odstranjevanju:', err);
          alert('Napaka pri poskusu prenehanja sledenja.');
        }
      }
    });
  });
}

function renderOcene(ocene) {
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
        <div class="card p-3 h-100">
          <h5 class="mb-1" style="font-size:1rem;"><a href="dogodek.html?id=${o.dogodek_id}">${o.dogodek_naslov}</a></h5>
          <div class="text-warning mb-2" style="font-size:0.9rem;">
            ${zvezde}
            <small class="text-muted ms-2">— ${datum}</small>
          </div>
          <p class="mb-0" style="font-size:0.9rem;">${o.komentar || '<em class="text-muted">Brez komentarja</em>'}</p>
        </div>
      </div>
    `;
  }).join('') + '</div>';
}

function nastaviStatistike(s) {
  document.getElementById('statPrijave').textContent = s.prijave;
  document.getElementById('statPriljubljeni').textContent = s.priljubljeni;
  document.getElementById('statOcene').textContent = s.ocene;
  document.getElementById('statOrganizatorji').textContent = s.organizatorji;
}

const organizatorBox = document.getElementById('organizatorBox');
const organizatorContent = document.getElementById('organizatorContent');

async function renderOrganizatorBox(uporabnik) {
  if (uporabnik.vloga === 'admin') {
    organizatorBox.classList.add('d-none');
    return;
  }
  organizatorBox.classList.remove('d-none');

  if (uporabnik.vloga === 'organizator') {
    organizatorContent.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <i class="bi bi-patch-check-fill" style="font-size: 2rem;"></i>
        <div>
          <h3 class="text-white mb-1">Si potrjen organizator</h3>
          <p class="text-white/85 mb-0">Lahko dodajaš dogodke in jih upravljaš.</p>
        </div>
        <a href="dodaj-dogodek.html" class="btn bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800 ms-auto">
          <i class="bi bi-plus-circle"></i> Nov dogodek
        </a>
      </div>
    `;
    return;
  }

  const { prosnja } = await apiFetch('/me/prosnja-organizator');

  if (!prosnja) {
    renderProsnjaForm();
  } else if (prosnja.status === 'cakajoca') {
    renderProsnjaCakajoca(prosnja);
  } else if (prosnja.status === 'zavrnjena') {
    renderProsnjaZavrnjena(prosnja);
  }
}

function renderProsnjaForm() {
  organizatorContent.innerHTML = `
    <div id="prosnjaCTA" class="d-flex align-items-center gap-3 flex-wrap">
      <i class="bi bi-building" style="font-size: 2rem;"></i>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Ste podjetje ali organizator?</h3>
        <p class="text-white/85 mb-0">Zaprosi za status organizatorja in začni dodajati dogodke.</p>
      </div>
      <button id="odpriProsnjoBtn" class="btn bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800">
        <i class="bi bi-rocket-takeoff"></i> Postani organizator
      </button>
    </div>

    <form id="prosnjaForm" class="d-none mt-3">
      <div id="prosnjaError" class="alert alert-danger d-none mb-3"></div>

      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label text-white">Naziv podjetja / organizacije *</label>
          <input type="text" name="naziv_podjetja" class="form-control" required maxlength="255" placeholder="npr. Kavarna Slon">
        </div>
        <div class="col-md-6">
          <label class="form-label text-white">Spletna stran (neobvezno)</label>
          <input type="url" name="spletna_stran" class="form-control" placeholder="https://...">
        </div>
        <div class="col-12">
          <label class="form-label text-white">Kratek opis (neobvezno)</label>
          <input type="text" name="opis" class="form-control" maxlength="1000" placeholder="npr. Lokalna kavarna v centru Ljubljane">
        </div>
        <div class="col-12">
          <label class="form-label text-white">Zakaj želiš postati organizator? *</label>
          <textarea name="razlog" class="form-control" rows="3" required minlength="20" maxlength="1000" placeholder="Opiši, kakšne dogodke nameravaš organizirati (najmanj 20 znakov)..."></textarea>
          <small class="text-white/70">Admin bo prošnjo pregledal v 24 urah.</small>
        </div>
      </div>

      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800" id="prosnjaSubmit">
          <i class="bi bi-send"></i> Pošlji prošnjo
        </button>
        <button type="button" id="prekliciProsnjoBtn" class="btn text-white border border-white/30 hover:bg-white/10 hover:text-white">
          Prekliči
        </button>
      </div>
    </form>
  `;

  document.getElementById('odpriProsnjoBtn').addEventListener('click', () => {
    document.getElementById('prosnjaCTA').classList.add('d-none');
    document.getElementById('prosnjaForm').classList.remove('d-none');
  });
  document.getElementById('prekliciProsnjoBtn').addEventListener('click', () => {
    document.getElementById('prosnjaCTA').classList.remove('d-none');
    document.getElementById('prosnjaForm').classList.add('d-none');
  });
  document.getElementById('prosnjaForm').addEventListener('submit', oddajProsnjo);
}

function renderProsnjaCakajoca(p) {
  const datum = new Date(p.datum_prosnje).toLocaleDateString('sl-SI');
  organizatorContent.innerHTML = `
    <div class="d-flex align-items-center gap-3 flex-wrap">
      <i class="bi bi-hourglass-split" style="font-size: 2rem;"></i>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Prošnja v obdelavi</h3>
        <p class="text-white/85 mb-0">
          Tvojo prošnjo za <strong>${p.naziv_podjetja}</strong> obravnavamo. Oddana ${datum}.
        </p>
      </div>
    </div>
  `;
}

function renderProsnjaZavrnjena(p) {
  const datum = new Date(p.datum_obravnave).toLocaleDateString('sl-SI');
  organizatorContent.innerHTML = `
    <div class="d-flex align-items-start gap-3 flex-wrap mb-3">
      <i class="bi bi-x-circle" style="font-size: 2rem;"></i>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Prošnja zavrnjena</h3>
        <p class="text-white/85 mb-1">Prošnja za <strong>${p.naziv_podjetja}</strong> je bila zavrnjena (${datum}).</p>
        ${p.opomba_admina ? `<p class="text-white/85 mb-0"><strong>Razlog:</strong> ${p.opomba_admina}</p>` : ''}
      </div>
      <button id="novaProsnjaBtn" class="btn bg-white text-brand-700 hover:bg-brand-50">Oddaj novo prošnjo</button>
    </div>
  `;
  document.getElementById('novaProsnjaBtn').addEventListener('click', renderProsnjaForm);
}

async function oddajProsnjo(e) {
  e.preventDefault();
  const napaka = document.getElementById('prosnjaError');
  napaka.classList.add('d-none');

  const podatki = {
    naziv_podjetja: e.target.naziv_podjetja.value.trim(),
    spletna_stran: e.target.spletna_stran.value.trim(),
    opis: e.target.opis.value.trim(),
    razlog: e.target.razlog.value.trim(),
  };

  const gumb = document.getElementById('prosnjaSubmit');
  gumb.disabled = true;
  gumb.textContent = 'Pošiljam...';

  try {
    await apiFetch('/me/prosnja-organizator', {
      method: 'POST',
      body: JSON.stringify(podatki),
    });
    const { prosnja } = await apiFetch('/me/prosnja-organizator');
    renderProsnjaCakajoca(prosnja);
  } catch (err) {
    const podrobnosti = err.podrobnosti?.length ? `<ul class="mb-0 mt-1">${err.podrobnosti.map(p => `<li>${p}</li>`).join('')}</ul>` : '';
    napaka.innerHTML = `<strong>${err.message}</strong>${podrobnosti}`;
    napaka.classList.remove('d-none');
    gumb.disabled = false;
    gumb.innerHTML = '<i class="bi bi-send"></i> Pošlji prošnjo';
  }
}

const modal = document.getElementById('urediModal');
const podatkiForm = document.getElementById('podatkiForm');
const gesloForm = document.getElementById('gesloForm');
const podatkiAlert = document.getElementById('podatkiAlert');
const gesloAlert = document.getElementById('gesloAlert');
const shraniBtn = document.getElementById('shraniBtn');

let trenutniUporabnik = null;

document.getElementById('urediProfilBtn').addEventListener('click', () => {
  if (!trenutniUporabnik) return;
  podatkiForm.ime.value = trenutniUporabnik.ime;
  podatkiForm.priimek.value = trenutniUporabnik.priimek;
  podatkiForm.email.value = trenutniUporabnik.email;
  podatkiAlert.classList.add('d-none');
  gesloAlert.classList.add('d-none');
  gesloForm.reset();
  ocenaGesla('');
  modal.classList.add('show');
});

document.querySelectorAll('[data-zapri-modal]').forEach(btn => {
  btn.addEventListener('click', () => modal.classList.remove('show'));
});
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('show');
});

function pokaziNapako(el, msg, podrobnosti = []) {
  let html = `<strong>${msg}</strong>`;
  if (podrobnosti.length) html += '<ul class="mb-0 mt-1">' + podrobnosti.map(p => `<li>${p}</li>`).join('') + '</ul>';
  el.className = 'alert alert-danger mb-3';
  el.innerHTML = html;
  el.classList.remove('d-none');
}

function pokaziUspeh(el, msg) {
  el.className = 'alert alert-success mb-3';
  el.textContent = msg;
  el.classList.remove('d-none');
}

function ocenaGesla(g) {
  const bars = document.querySelectorAll('#strengthBars .password-strength-bar');
  const label = document.getElementById('strengthLabel');
  bars.forEach(b => { b.className = 'password-strength-bar'; });

  if (!g) { label.textContent = 'Vsaj 8 znakov, ena velika črka in ena številka.'; label.className = 'field-hint'; return; }

  let score = 0;
  if (g.length >= 8) score++;
  if (/[A-Z]/.test(g)) score++;
  if (/[0-9]/.test(g)) score++;
  if (/[^A-Za-z0-9]/.test(g) || g.length >= 12) score++;

  const labels = ['Prešibko', 'Šibko', 'Srednje', 'Močno', 'Odlično'];
  const klase = ['weak', 'weak', 'medium', 'strong', 'strong'];

  for (let i = 0; i < score; i++) bars[i].classList.add(klase[score]);
  label.textContent = labels[score];
  label.className = 'field-hint ' + (score < 2 ? 'invalid' : score < 4 ? '' : 'valid');
}

document.getElementById('novoGesloInput').addEventListener('input', (e) => {
  ocenaGesla(e.target.value);
  preveriUjemanje();
});

document.getElementById('potrdiGesloInput').addEventListener('input', preveriUjemanje);

function preveriUjemanje() {
  const novo = document.getElementById('novoGesloInput').value;
  const potrdi = document.getElementById('potrdiGesloInput').value;
  const hint = document.getElementById('potrdiHint');
  if (!potrdi) { hint.textContent = ''; hint.className = 'field-hint'; return; }
  if (novo === potrdi) { hint.textContent = '✓ Gesli se ujemata.'; hint.className = 'field-hint valid'; }
  else { hint.textContent = '✗ Gesli se ne ujemata.'; hint.className = 'field-hint invalid'; }
}

shraniBtn.addEventListener('click', async () => {
  const aktivenTab = document.querySelector('.tab-pane.active').id;

  shraniBtn.disabled = true;
  const originalHTML = shraniBtn.innerHTML;
  shraniBtn.innerHTML = 'Shranjujem...';

  try {
    if (aktivenTab === 'tabPodatki') {
      const podatki = {
        ime: podatkiForm.ime.value.trim(),
        priimek: podatkiForm.priimek.value.trim(),
        email: podatkiForm.email.value.trim(),
      };
      const odgovor = await apiFetch('/me', { method: 'PATCH', body: JSON.stringify(podatki) });
      Auth.osveziUporabnika(odgovor.uporabnik);
      trenutniUporabnik = odgovor.uporabnik;
      napolniProfil(odgovor.uporabnik);
      pokaziUspeh(podatkiAlert, odgovor.sporocilo);
      setTimeout(() => modal.classList.remove('show'), 1200);
    } else {
      const novo = gesloForm.novo_geslo.value;
      const potrdi = document.getElementById('potrdiGesloInput').value;
      if (novo !== potrdi) {
        pokaziNapako(gesloAlert, 'Novi gesli se ne ujemata.');
        return;
      }
      const odgovor = await apiFetch('/me/spremeni-geslo', {
        method: 'POST',
        body: JSON.stringify({
          staro_geslo: gesloForm.staro_geslo.value,
          novo_geslo: novo,
        }),
      });
      gesloForm.reset();
      ocenaGesla('');
      pokaziUspeh(gesloAlert, odgovor.sporocilo);
      setTimeout(() => modal.classList.remove('show'), 1200);
    }
  } catch (err) {
    const cilj = aktivenTab === 'tabPodatki' ? podatkiAlert : gesloAlert;
    pokaziNapako(cilj, err.message || 'Napaka.', err.podrobnosti || []);
  } finally {
    shraniBtn.disabled = false;
    shraniBtn.innerHTML = originalHTML;
  }
});

// GLAVNA FUNKCIJA ZA NALAGANJE PODATKOV IZ BACKENDA
async function osveziPodatkeProfila() {
  try {
    const [{ uporabnik }, dashboard] = await Promise.all([
      apiFetch('/me'),
      apiFetch('/me/dashboard'),
    ]);
    trenutniUporabnik = uporabnik;
    napolniProfil(uporabnik);
    nastaviStatistike(dashboard.statistike);
    renderPrijave(dashboard.prijave);
    renderPriljubljeni(dashboard.priljubljeni);
    renderOcene(dashboard.ocene);
    renderOrganizatorji(dashboard.organizatorji); // Tukaj se pokliče najina nova logika
    renderOrganizatorBox(uporabnik);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      Auth.odjavi();
      window.location.href = 'prijava.html';
    } else {
      console.error('Napaka pri nalaganju dashboarda:', err);
    }
  }
}

// Inicializacijski klic ob prvem nalaganju strani
const lokalniUporabnik = Auth.getUporabnik();
if (lokalniUporabnik) { trenutniUporabnik = lokalniUporabnik; napolniProfil(lokalniUporabnik); }

// Pokličemo skupno funkcijo za nalaganje
osveziPodatkeProfila();