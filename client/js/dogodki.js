import { apiFetch, Auth, SERVER_URL } from './auth.js';
import { pobegniHtml } from './components.js';

const priljubljeniSet = new Set();
let initPriljubljenihPromise = null;

let uporabnikLokacija = null;

let trenutnoRazvrscanje = 'datum';
let trenutnaStran = 1;
const DOGODKOV_NA_STRAN = 6;

let mapa = null;
let skupinaMarkerjev = null;

export async function inicializirajPriljubljene() {
  if (initPriljubljenihPromise) return initPriljubljenihPromise;
  if (!Auth.jePrijavljen()) return Promise.resolve();

  initPriljubljenihPromise = apiFetch('/priljubljeni')
    .then(({ ids }) => ids.forEach(id => priljubljeniSet.add(id)))
    .catch(err => console.warn('Ne morem prebrati priljubljenih:', err));
  return initPriljubljenihPromise;
}

export function osveziSrckeNaStrani() {
  document.querySelectorAll('[data-fav-id]').forEach(gumb => {
    const id = Number(gumb.dataset.favId);
    const aktiven = priljubljeniSet.has(id);
    gumb.classList.toggle('active', aktiven);
    const ikona = gumb.querySelector('i');
    if (ikona) ikona.className = aktiven ? 'bi bi-heart-fill' : 'bi bi-heart';
    gumb.setAttribute('aria-label', aktiven ? 'Odstrani iz priljubljenih' : 'Dodaj med priljubljene');
  });
}

function inicializirajZemljevid() {
  const kontejner = document.getElementById('zemljevid-dogodkov');
  if (!kontejner || mapa) return;

  // Postavi pogled na sredino Slovenije
  mapa = L.map('zemljevid-dogodkov').setView([46.1512, 14.9955], 8);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapa);

  skupinaMarkerjev = L.layerGroup().addTo(mapa);
}

function osveziMarkerjeNaZemljevidu(dogodki, privzetaSlika) {
  inicializirajZemljevid();
  if (!skupinaMarkerjev) return;

  skupinaMarkerjev.clearLayers();

  dogodki.forEach(dogodek => {
    const lat = dogodek.latitud || dogodek.lat || dogodek.latitude;
    const lng = dogodek.longitud || dogodek.lng || dogodek.longitude;

    if (lat && lng) {
      const marker = L.marker([parseFloat(lat), parseFloat(lng)]);
      const slikaUrl = pridobiPotSlike(dogodek.slika, privzetaSlika);
      const naslovVarno = pobegniHtml(dogodek.Naslov || dogodek.naslov);
      
      const cena = parseFloat(dogodek.cena);
      const cenaTekst = cena > 0 ? `${cena.toFixed(0)} €` : 'Brezplačno';

      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; width: 180px;">
          <img src="${pobegniHtml(slikaUrl)}" style="width:100%; height:80px; object-fit:cover; border-radius:6px; margin-bottom:6px;">
          <span class="badge bg-primary text-white mb-1" style="font-size: 0.65rem;">${pobegniHtml(dogodek.kategorija || 'Dogodek')}</span>
          <h6 class="mb-1" style="font-size: 0.85rem; font-weight: 600; line-height: 1.2;">
            <a href="dogodek.html?id=${Number(dogodek.ID_dogodek || dogodek.id)}" style="text-decoration:none; color:inherit;">${naslovVarno}</a>
          </h6>
          <small class="text-muted d-block mb-1" style="font-size: 0.75rem;"><i class="bi bi-geo-alt"></i> ${pobegniHtml(dogodek.kraj || '')}</small>
          <div class="d-flex justify-content-between align-items-center mt-2 pt-1 border-top">
            <strong style="font-size: 0.8rem; color: #10b981;">${cenaTekst}</strong>
            <a href="dogodek.html?id=${Number(dogodek.ID_dogodek || dogodek.id)}" class="btn btn-primary btn-sm text-white px-2 py-0.5" style="font-size:0.7rem;">Več</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      skupinaMarkerjev.addLayer(marker);
    }
  });

  if (dogodki.length > 0 && skupinaMarkerjev.getLayers().length > 0) {
    const zbirka = L.featureGroup(skupinaMarkerjev.getLayers());
    mapa.fitBounds(zbirka.getBounds().pad(0.15));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await inicializirajPriljubljene();

  if (document.getElementById('dogodki-kontejner')) {
    const urlParams = new URLSearchParams(window.location.search);
    const iskanjeIzUrl = urlParams.get('iskanje') || '';
    const lokacijaIzUrl = urlParams.get('lokacija') || '';
    const datumIzUrl = urlParams.get('datum') || 'kadarkoli';

    const lokacijaInput = document.getElementById('filter-lokacija');
    const datumSelect = document.getElementById('filter-datum');
    const iskanjeInput = document.getElementById('filter-iskanje'); 

    if (lokacijaInput && lokacijaIzUrl) lokacijaInput.value = lokacijaIzUrl;
    if (datumSelect && datumIzUrl) datumSelect.value = datumIzUrl;
    if (iskanjeInput && iskanjeIzUrl) iskanjeInput.value = iskanjeIzUrl;

    poskusiPridobitiLokacijo()
      .finally(() => {
        naloziVseDogodke();
      });

    pripraviFiltre();
  }

  if (document.getElementById('najboljši-dogodki-kontejner')) {
    naloziNajboljseDogodke();
  }

  osveziSrckeNaStrani();

  document.body.addEventListener('click', preklopiPriljubljen);
});

function poskusiPridobitiLokacijo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve();
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        uporabnikLokacija = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        resolve();
      },
      () => resolve(),
      { timeout: 5000 }
    );
  });
}

function preberiShranjenPolmer() {
  try {
    const nastavitve = JSON.parse(localStorage.getItem('nastavitve') || '{}');
    const polmer = parseInt(nastavitve.radius, 10);
    return Number.isInteger(polmer) ? polmer : null;
  } catch {
    return null;
  }
}

function pripraviFiltre() {
  const gumbUporabi = document.getElementById('gumb-uporabi-filtre');
  const gumbPonastavi = document.getElementById('gumb-ponastavi-filtre');
  const drsnikRazdalje = document.getElementById('filter-razdalja');
  const izpisRazdalje = document.getElementById('izpis-razdalje');
  const iskanjeInput = document.getElementById('filter-iskanje');

  let drsnikTimeout = null;
  let iskanjeTimeout = null;

  const zlozljivFilter = document.querySelector('.filter-sidebar[data-zlozljiv]');
  const glavaFiltra = zlozljivFilter?.querySelector('.zlozljiv__glava');
  if (glavaFiltra) {
    glavaFiltra.addEventListener('click', () => {
      const odprt = zlozljivFilter.getAttribute('aria-expanded') === 'true';
      zlozljivFilter.setAttribute('aria-expanded', odprt ? 'false' : 'true');
    });
  }

  if (drsnikRazdalje && izpisRazdalje) {
    const shranjenPolmer = preberiShranjenPolmer();
    if (shranjenPolmer !== null) {
      drsnikRazdalje.value = shranjenPolmer;
      izpisRazdalje.textContent = shranjenPolmer >= 100 ? 'Vsa Slovenija' : `${shranjenPolmer} km`;
    }
  }

  if (iskanjeInput) {
    iskanjeInput.addEventListener('input', (e) => {
      clearTimeout(iskanjeTimeout);
      iskanjeTimeout = setTimeout(() => {
        trenutnaStran = 1;
        naloziVseDogodke();
      }, 300);
    });
  }

  if (drsnikRazdalje && izpisRazdalje) {
    drsnikRazdalje.addEventListener('input', async (e) => {
      const trenutnaVrednost = parseInt(e.target.value);

      if (trenutnaVrednost === 100) {
        izpisRazdalje.textContent = "Vsa Slovenija";
      } else {
        izpisRazdalje.textContent = `${trenutnaVrednost} km`;
      }

      if (trenutnaVrednost < 100 && !uporabnikLokacija) {
        await poskusiPridobitiLokacijo();
      }

      clearTimeout(drsnikTimeout);

      drsnikTimeout = setTimeout(() => {
        trenutnaStran = 1;
        naloziVseDogodke();
      }, 300);
    });
  }

  if (gumbUporabi) {
    gumbUporabi.addEventListener('click', async () => {
      const drsnik = document.getElementById('filter-razdalja');
      const vrednostRazdalje = drsnik ? parseInt(drsnik.value) : 25;
      
      if (drsnik && vrednostRazdalje < 100 && !uporabnikLokacija) {
        gumbUporabi.disabled = true;
        gumbUporabi.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Pridobivam lokacijo...`;
        
        await poskusiPridobitiLokacijo();
        
        gumbUporabi.disabled = false;
        gumbUporabi.innerHTML = `<i class="bi bi-check2-circle"></i> Uporabi filtre`;
      }
      trenutnaStran = 1;
      naloziVseDogodke();
    });
  }

  if (gumbPonastavi) {
    gumbPonastavi.addEventListener('click', () => {
      const iskanjeInput = document.getElementById('filter-iskanje');
      const lokacijaInput = document.getElementById('filter-lokacija');
      const datumSelect = document.getElementById('filter-datum');
      const drsnik = document.getElementById('filter-razdalja');
      
      if (iskanjeInput) iskanjeInput.value = '';
      if (lokacijaInput) lokacijaInput.value = '';
      if (datumSelect) datumSelect.value = 'kadarkoli';
      if (drsnik) {
        drsnik.value = '25';
        if (izpisRazdalje) izpisRazdalje.textContent = '25 km';
      }
      
      document.querySelectorAll('.filter-cena, .filter-kategorija').forEach(el => el.checked = false);
      
      window.history.replaceState({}, document.title, window.location.pathname);

      trenutnoRazvrscanje = 'datum';
      trenutnaStran = 1;
      naloziVseDogodke();
    });
  }
}

function pridobiPotSlike(slikaIzBaze, privzetaSlika) {
  if (!slikaIzBaze) return privzetaSlika;
  if (slikaIzBaze.startsWith('/public/')) return `${SERVER_URL}${slikaIzBaze.replace('/public', '')}`;
  if (slikaIzBaze.startsWith('http://') || slikaIzBaze.startsWith('https://')) return slikaIzBaze;
  if (slikaIzBaze.startsWith('/uploads/')) return `${SERVER_URL}${slikaIzBaze}`;
  return `${SERVER_URL}/uploads/dogodkov/${slikaIzBaze}`;
}

function generirajStatusBadge(status) {
  if (!status || status === 'aktiven') return '';
  if (status === 'promoviran') return `<span class="badge bg-warning text-dark position-absolute top-0 start-0 m-2"><i class="bi bi-star-fill"></i> Izpostavljeno</span>`;
  if (status === 'v_pregledu') return `<span class="badge bg-secondary position-absolute top-0 start-0 m-2">V pregledu</span>`;
  return '';
}

function srcekIkona(id) {
  const aktiven = priljubljeniSet.has(id);
  const klasa = aktiven ? 'bi bi-heart-fill' : 'bi bi-heart';
  return `<button class="event-fav ${aktiven ? 'active' : ''}" data-fav-id="${Number(id)}" aria-label="${aktiven ? 'Odstrani iz priljubljenih' : 'Dodaj med priljubljene'}"><i class="${klasa}"></i></button>`;
}

function generirajKartico(dogodek, stolpecRazred, privzetaSlika, useFreeBadge = false) {
  const d = new Date(dogodek.datum_zacetka);
  const dan = String(d.getDate()).padStart(2, '0');
  const mesec = d.toLocaleString('sl-SI', { month: 'short' }).toUpperCase().replace('.', '').trim();
  const ura = d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });

  const slikaUrl = pridobiPotSlike(dogodek.slika, privzetaSlika);
  const cena = parseFloat(dogodek.cena);
  const cenaHTML = cena > 0
    ? `<span class="event-price">${cena.toFixed(0)} €</span>`
    : `<span class="event-price${useFreeBadge ? ' free' : ''}">Brezplačno</span>`;

  const razdaljaTekst = dogodek.razdalja_km !== undefined && dogodek.razdalja_km !== null
    ? `<span class="ms-2 text-brand-700 font-semibold"><i class="bi bi-radar"></i> ${parseFloat(dogodek.razdalja_km).toFixed(1)} km stran</span>`
    : '';

  const polnaLokacija = dogodek.ulica
    ? `${dogodek.ulica}, ${dogodek.kraj || ''}`
    : (dogodek.kraj || 'Neznana lokacija');

  const kratekOpis = dogodek.kratek_opis || dogodek.Kratek_opis || dogodek.opis || 'Brez opisa.';

  const stolpec = document.createElement('div');
  stolpec.className = stolpecRazred;

  const naslovVarno = pobegniHtml(dogodek.Naslov || dogodek.naslov);
  const polnaLokacijaVarno = pobegniHtml(polnaLokacija);

  stolpec.innerHTML = `
    <div class="event-card position-relative">
      ${generirajStatusBadge(dogodek.status)}
      <div class="event-card-img">
        <img src="${pobegniHtml(slikaUrl)}" alt="${naslovVarno}">
        <div class="event-date">
          <span class="day">${dan}</span>
          <span class="month">${mesec}</span>
        </div>
        <span class="event-cat-tag">${pobegniHtml(dogodek.kategorija || 'Dogodek')}</span>
      </div>
      <div class="event-card-body">
        <div class="event-meta">
          <i class="bi bi-geo-alt"></i> <span title="${polnaLokacijaVarno}">${polnaLokacijaVarno}</span>
          <span class="ms-2"><i class="bi bi-clock"></i> ${ura}</span>
          ${razdaljaTekst}
        </div>
        <h5><a href="dogodek.html?id=${Number(dogodek.ID_dogodek || dogodek.id)}">${naslovVarno}</a></h5>
        <p class="event-card-desc">${pobegniHtml(kratekOpis)}</p>
        <div class="d-flex justify-content-between align-items-center mt-2">
          ${cenaHTML}
          ${srcekIkona(dogodek.ID_dogodek || dogodek.id)}
        </div>
      </div>
    </div>
  `;
  return stolpec;
}

function generirajZgornjoVrsticoHtml(steviloDogodkov, iskaniKraj, izbranoSortiranje) {
  let besedaDogodek = 'dogodkov';
  if (steviloDogodkov === 1) besedaDogodek = 'dogodek';
  else if (steviloDogodkov === 2) besedaDogodek = 'dogodka';
  else if (steviloDogodkov === 3 || steviloDogodkov === 4) besedaDogodek = 'dogodki';

  const regijaTekst = iskaniKraj ? `v kraju ${pobegniHtml(iskaniKraj)}` : 'v tvoji okolici';

  return `
    <div class="flex justify-between items-center mb-4 flex-wrap gap-3 p-4 bg-white rounded-2xl border border-ink-200 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-pink-100 flex items-center justify-center">
          <i class="bi bi-calendar-week text-brand-700"></i>
        </div>
        <div>
          <p class="mb-0 font-bold text-ink-900"><span class="gradient-text">${steviloDogodkov} ${besedaDogodek}</span></p>
          <p class="mb-0 text-xs text-ink-500">${regijaTekst}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label for="razvrscanje-select" class="text-sm font-medium text-ink-700 hidden sm:inline">Razvrsti:</label>
        <select id="razvrscanje-select" class="form-select d-inline-block w-auto">
          <option value="datum" ${izbranoSortiranje === 'datum' ? 'selected' : ''}>Po datumu</option>
          <option value="priljubljenost" ${izbranoSortiranje === 'priljubljenost' ? 'selected' : ''}>Po priljubljenosti</option>
          <option value="cena" ${izbranoSortiranje === 'cena' ? 'selected' : ''}>Po ceni</option>
          <option value="oddaljenost" ${izbranoSortiranje === 'oddaljenost' ? 'selected' : ''}>Po oddaljenosti</option>
        </select>
      </div>
    </div>
  `;
}

function generirajPaginacijoHtml(trenutna, skupno) {
  if (skupno <= 1) return '';

  let predhodnaGumb = `<li class="page-item ${trenutna === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${trenutna - 1}">&laquo;</a></li>`;
  let naslednjaGumb = `<li class="page-item ${trenutna === skupno ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${trenutna + 1}">&raquo;</a></li>`;

  let straniHtml = '';
  for (let i = 1; i <= skupno; i++) {
    straniHtml += `<li class="page-item ${trenutna === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
  }

  return `<ul class="pagination justify-content-center">${predhodnaGumb}${straniHtml}${naslednjaGumb}</ul>`;
}

function pripraviDogodkePaginacije(vseStrani) {
  document.querySelectorAll('#paginacija-kontejner .page-link').forEach(gumb => {
    gumb.addEventListener('click', (e) => {
      e.preventDefault();
      const novaStran = parseInt(gumb.dataset.page);
      
      if (!novaStran || novaStran < 1 || novaStran > vseStrani || novaStran === trenutnaStran) return;
      
      varneSprembeStrani(novaStran, vseStrani);
    });
  });
}

function varneSprembeStrani(novaStran, vseStrani) {
  trenutnaStran = novaStran;
  const kontejner = document.getElementById('dogodki-kontejner');
  if (kontejner) kontejner.innerHTML = '<div class="text-center w-100 p-5"><div class="spinner-border text-primary"></div></div>';
  naloziVseDogodke();
  window.scrollTo({ top: 150, behavior: 'smooth' });
}

async function naloziVseDogodke() {
  const kontejner = document.getElementById('dogodki-kontejner');
  const zgornjaVrsticaKontejner = document.getElementById('zgornja-vrstica-dogodki-kontejner');
  const paginacijaKontejner = document.getElementById('paginacija-kontejner');
  const privzeta = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';

  const lokacijaInput = document.getElementById('filter-lokacija');
  const datumSelect = document.getElementById('filter-datum');
  const drsnikRazdalje = document.getElementById('filter-razdalja');
  const iskanjeInput = document.getElementById('filter-iskanje');
  
  const lokacija = lokacijaInput ? lokacijaInput.value.trim() : '';
  const datum = datumSelect ? datumSelect.value : 'kadarkoli';
  const razdalja = drsnikRazdalje ? drsnikRazdalje.value : '25';
  const iskanje = iskanjeInput ? iskanjeInput.value.trim() : '';
  
  const izbraneCene = [];
  document.querySelectorAll('.filter-cena:checked').forEach(el => izbraneCene.push(el.value));

  const izbraneKategorije = [];
  document.querySelectorAll('.filter-kategorija:checked').forEach(el => izbraneKategorije.push(el.value));

  const params = new URLSearchParams();
  if (iskanje) params.append('iskanje', iskanje); 
  if (lokacija) params.append('lokacija', lokacija);
  if (datum && datum !== 'kadarkoli') params.append('datum', datum);
  if (izbraneCene.length > 0) params.append('cene', izbraneCene.join(','));
  if (izbraneKategorije.length > 0) params.append('kategorije', izbraneKategorije.join(','));

  params.append('sort', trenutnoRazvrscanje);
  params.append('page', trenutnaStran);
  params.append('limit', DOGODKOV_NA_STRAN);

  if (uporabnikLokacija && razdalja && parseInt(razdalja) < 100) {
    params.append('userLat', uporabnikLokacija.lat);
    params.append('userLng', uporabnikLokacija.lng);
    params.append('maxRazdalja', razdalja);
  }

  const stevecFiltrov = document.getElementById('st-aktivnih-filtrov');
  if (stevecFiltrov) {
    const stAktivnih = (iskanje ? 1 : 0) + (lokacija ? 1 : 0) + (datum !== 'kadarkoli' ? 1 : 0) + 
                       (uporabnikLokacija ? 1 : 0) + izbraneCene.length + izbraneKategorije.length;
    stevecFiltrov.textContent = `${stAktivnih} aktivnih`;
  }

  try {
    const url = `/dogodki?${params.toString()}`;
    const odgovor = await apiFetch(url);
    
    const seznamDogodkov = Array.isArray(odgovor) ? odgovor : (odgovor.dogodki || []);
    const skupnoStevilo = odgovor.skupnoStevilo !== undefined ? odgovor.skupnoStevilo : seznamDogodkov.length;

    const glavniStevec = document.getElementById('glavni-stevec-aktivnih');
    if (glavniStevec) {
      glavniStevec.textContent = skupnoStevilo;
    }

    if (zgornjaVrsticaKontejner) {
      zgornjaVrsticaKontejner.innerHTML = generirajZgornjoVrsticoHtml(skupnoStevilo, lokacija, trenutnoRazvrscanje);
      
      const selectElement = document.getElementById('razvrscanje-select');
      if (selectElement) {
        selectElement.addEventListener('change', (e) => {
          trenutnoRazvrscanje = e.target.value; 
          trenutnaStran = 1;
          kontejner.innerHTML = '<div class="text-center w-100 p-5"><div class="spinner-border text-primary"></div></div>';
          naloziVseDogodke(); 
        });
      }
    }

    if (seznamDogodkov.length === 0) {
      kontejner.innerHTML = '<p class="text-center w-100 mt-4">Noben aktiven dogodek ne ustreza izbranim kriterijem.</p>';
      if (paginacijaKontejner) paginacijaKontejner.innerHTML = '';
      
      // Osvežimo zemljevid s praznim seznamom, da izbrišemo stare markerje
      osveziMarkerjeNaZemljevidu([], privzeta);
      return;
    }

    kontejner.innerHTML = '';
    seznamDogodkov.forEach(dogodek => {
      kontejner.appendChild(generirajKartico(dogodek, 'col-md-6 mb-4', privzeta, false));
    });

    // POSODOBITEV: Osvežimo zemljevid z novimi filtriranimi zadetki
    osveziMarkerjeNaZemljevidu(seznamDogodkov, privzeta);

    if (paginacijaKontejner) {
      const vseStrani = Math.ceil(skupnoStevilo / DOGODKOV_NA_STRAN);
      paginacijaKontejner.innerHTML = generirajPaginacijoHtml(trenutnaStran, vseStrani);
      pripraviDogodkePaginacije(vseStrani);
    }

    osveziSrckeNaStrani();

  } catch (err) {
    console.error('Napaka pri prikazovanju vseh dogodkov:', err);
    kontejner.innerHTML = '<p class="text-center text-danger w-100">Ni bilo mogoče naložiti dogodkov.</p>';
  }
}

async function naloziNajboljseDogodke() {
  const kontejner = document.getElementById('najboljši-dogodki-kontejner');
  const privzeta = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

  try {
    const dogodki = await apiFetch('/dogodki/najboljsi');
    const seznamDogodkov = Array.isArray(dogodki) ? dogodki : (dogodki.dogodki || []);

    if (seznamDogodkov.length === 0) {
      kontejner.innerHTML = '<p class="text-center w-100">Ta mesec ni izpostavljenih dogodkov.</p>';
      return;
    }

    kontejner.innerHTML = '';
    seznamDogodkov.forEach(dogodek => {
      kontejner.appendChild(generirajKartico(dogodek, 'col-md-6 col-lg-4 mb-4', privzeta, true));
    });
    
    osveziSrckeNaStrani();
  } catch (err) {
    console.error('Napaka pri prikazovanju najboljših dogodkov:', err);
    kontejner.innerHTML = '<p class="text-center text-danger w-100">Ni bilo mogoče naložiti najboljših dogodkov.</p>';
  }
}

async function preklopiPriljubljen(e) {
  const gumb = e.target.closest('[data-fav-id]');
  if (!gumb) return;
  e.preventDefault();

  if (!Auth.jePrijavljen()) {
    if (window.pokaziToast) {
      window.pokaziToast('warning', 'Za priljubljene se moraš prijaviti.', 'Prijava potrebna', 3000);
    }
    setTimeout(() => location.href = 'prijava.html', 800);
    return;
  }

  const id = Number(gumb.dataset.favId);
  const trenutno = priljubljeniSet.has(id);
  const metoda = trenutno ? 'DELETE' : 'POST';

  gumb.disabled = true;
  try {
    const { priljubljen } = await apiFetch(`/dogodki/${id}/priljubljen`, { method: metoda });
    if (priljubljen) {
      priljubljeniSet.add(id);
      gumb.classList.add('active');
      gumb.querySelector('i').className = 'bi bi-heart-fill';
      gumb.setAttribute('aria-label', 'Odstrani iz priljubljenih');
    } else {
      priljubljeniSet.delete(id);
      gumb.classList.remove('active');
      gumb.querySelector('i').className = 'bi bi-heart';
      gumb.setAttribute('aria-label', 'Dodaj med priljubljene');
    }
  } catch (err) {
    console.error('Napaka pri spremembi priljubljenega:', err);
    if (window.pokaziToast) {
      window.pokaziToast('danger', err.message || 'Napaka pri shranjevanju.', 'Napaka');
    }
  } finally {
    gumb.disabled = false;
  }
}

export function preusmeriZFiltri(event, form) {
  event.preventDefault();

  const iskanje = form.querySelector('[name="iskanje"]').value.trim();
  const lokacija = form.querySelector('[name="lokacija"]').value.trim();
  const datum = form.querySelector('[name="datum"]').value;

  const params = new URLSearchParams();
  if (iskanje) params.append('iskanje', iskanje);
  if (lokacija) params.append('lokacija', lokacija);
  if (datum) {
    params.append('datum', datum);
  } else {
    params.append('datum', 'kadarkoli');
  }

  window.location.href = `dogodki.html?${params.toString()}`;
}

window.preusmeriZFiltri = preusmeriZFiltri;