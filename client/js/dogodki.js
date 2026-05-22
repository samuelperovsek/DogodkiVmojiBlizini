import { apiFetch, Auth, SERVER_URL } from './auth.js';
import { pobegniHtml } from './components.js';

const priljubljeniSet = new Set();
let initPriljubljenihPromise = null;

let uporabnikLokacija = null;

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

document.addEventListener('DOMContentLoaded', async () => {
  await inicializirajPriljubljene();

  if (document.getElementById('dogodki-kontejner')) {
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

function pripraviFiltre() {
  const gumbUporabi = document.getElementById('gumb-uporabi-filtre');
  const gumbPonastavi = document.getElementById('gumb-ponastavi-filtre');
  const drsnikRazdalje = document.getElementById('filter-razdalja');
  const izpisRazdalje = document.getElementById('izpis-razdalje');

  let drsnikTimeout = null;

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
        console.log(`[Drsnik] Avtomatsko osveževanje za razdaljo: ${trenutnaVrednost} km`);
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
      naloziVseDogodke();
    });
  }

  if (gumbPonastavi) {
    gumbPonastavi.addEventListener('click', () => {
      const lokacijaInput = document.getElementById('filter-lokacija');
      const datumSelect = document.getElementById('filter-datum');
      const drsnik = document.getElementById('filter-razdalja');
      
      if (lokacijaInput) lokacijaInput.value = '';
      if (datumSelect) datumSelect.value = 'kadarkoli';
      if (drsnik) {
        drsnik.value = '25';
        if (izpisRazdalje) izpisRazdalje.textContent = '25 km';
      }
      
      document.querySelectorAll('.filter-cena, .filter-kategorija').forEach(el => el.checked = false);
      
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

  const naslovVarno = pobegniHtml(dogodek.Naslov);
  const polnaLokacijaVarno = pobegniHtml(polnaLokacija);

  stolpec.innerHTML = `
    <div class="event-card position-relative">
      ${generirajStatusBadge(dogodek.status)}
      <div class="event-card-img">
        <img src="${slikaUrl}" alt="${naslovVarno}">
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
        <h5><a href="dogodek.html?id=${Number(dogodek.ID_dogodek)}">${naslovVarno}</a></h5>
        <p class="event-card-desc">${pobegniHtml(kratekOpis)}</p>
        <div class="d-flex justify-content-between align-items-center mt-2">
          ${cenaHTML}
          ${srcekIkona(dogodek.ID_dogodek)}
        </div>
      </div>
    </div>
  `;
  return stolpec;
}

async function naloziVseDogodke() {
  const kontejner = document.getElementById('dogodki-kontejner');
  const privzeta = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';

  const lokacijaInput = document.getElementById('filter-lokacija');
  const datumSelect = document.getElementById('filter-datum');
  const drsnikRazdalje = document.getElementById('filter-razdalja');
  
  const lokacija = lokacijaInput ? lokacijaInput.value.trim() : '';
  const datum = datumSelect ? datumSelect.value : 'kadarkoli';
  const razdalja = drsnikRazdalje ? drsnikRazdalje.value : '25';
  
  const izbraneCene = [];
  document.querySelectorAll('.filter-cena:checked').forEach(el => izbraneCene.push(el.value));

  const izbraneKategorije = [];
  document.querySelectorAll('.filter-kategorija:checked').forEach(el => izbraneKategorije.push(el.value));

  const params = new URLSearchParams();
  if (lokacija) params.append('lokacija', lokacija);
  if (datum && datum !== 'kadarkoli') params.append('datum', datum);
  if (izbraneCene.length > 0) params.append('cene', izbraneCene.join(','));
  if (izbraneKategorije.length > 0) params.append('kategorije', izbraneKategorije.join(','));


  if (uporabnikLokacija && razdalja && parseInt(razdalja) < 100) {
      params.append('userLat', uporabnikLokacija.lat);
      params.append('userLng', uporabnikLokacija.lng);
      params.append('maxRazdalja', razdalja);
    }

  const stevecFiltrov = document.getElementById('st-aktivnih-filtrov');
  if (stevecFiltrov) {
    const stAktivnih = (lokacija ? 1 : 0) + (datum !== 'kadarkoli' ? 1 : 0) + 
                       (uporabnikLokacija ? 1 : 0) + izbraneCene.length + izbraneKategorije.length;
    stevecFiltrov.textContent = `${stAktivnih} aktivnih`;
  }

  try {
    const url = params.toString() ? `/dogodki?${params.toString()}` : '/dogodki';
    
    const odgovor = await apiFetch(url);
    const seznamDogodkov = Array.isArray(odgovor) ? odgovor : (odgovor.dogodki || []);

    if (seznamDogodkov.length === 0) {
      kontejner.innerHTML = '<p class="text-center w-100 mt-4">Noben aktiven dogodek ne ustreza izbranim kriterijem.</p>';
      return;
    }

    kontejner.innerHTML = '';
    seznamDogodkov.forEach(dogodek => {
      kontejner.appendChild(generirajKartico(dogodek, 'col-md-6 mb-4', privzeta, false));
    });

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