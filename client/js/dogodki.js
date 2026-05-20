import { apiFetch, Auth } from './auth.js';

const API_BASE_URL = 'http://localhost:3001';

const priljubljeniSet = new Set();
let initPriljubljenihPromise = null;

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
    naloziVseDogodke();
  }

  if (document.getElementById('najboljši-dogodki-kontejner')) {
    naloziNajboljseDogodke();
  }

  osveziSrckeNaStrani();

  document.body.addEventListener('click', preklopiPriljubljen);
});

function pridobiPotSlike(slikaIzBaze, privzetaSlika) {
  if (!slikaIzBaze) return privzetaSlika;

  if (slikaIzBaze.startsWith('/public/')) {
    return `${API_BASE_URL}${slikaIzBaze.replace('/public', '')}`;
  }

  if (slikaIzBaze.startsWith('http://') || slikaIzBaze.startsWith('https://')) {
    return slikaIzBaze;
  }

  if (slikaIzBaze.startsWith('/uploads/')) {
    return `${API_BASE_URL}${slikaIzBaze}`;
  }

  return `${API_BASE_URL}/uploads/dogodkov/${slikaIzBaze}`;
}

function generirajStatusBadge(status) {
  if (!status || status === 'aktiven') return '';
  if (status === 'promoviran') {
    return `<span class="badge bg-warning text-dark position-absolute top-0 start-0 m-2"><i class="bi bi-star-fill"></i> Izpostavljeno</span>`;
  }
  if (status === 'v_pregledu') {
    return `<span class="badge bg-secondary position-absolute top-0 start-0 m-2">V pregledu</span>`;
  }
  return '';
}

function srcekIkona(id) {
  const aktiven = priljubljeniSet.has(id);
  const klasa = aktiven ? 'bi bi-heart-fill' : 'bi bi-heart';
  return `<button class="event-fav ${aktiven ? 'active' : ''}" data-fav-id="${id}" aria-label="${aktiven ? 'Odstrani iz priljubljenih' : 'Dodaj med priljubljene'}"><i class="${klasa}"></i></button>`;
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

  const polnaLokacija = dogodek.ulica
    ? `${dogodek.ulica}, ${dogodek.kraj || ''}`
    : (dogodek.kraj || 'Neznana lokacija');

  const kratekOpis = dogodek.kratek_opis || dogodek.Kratek_opis || dogodek.opis || 'Brez opisa.';

  const stolpec = document.createElement('div');
  stolpec.className = stolpecRazred;

  stolpec.innerHTML = `
    <div class="event-card position-relative">
      ${generirajStatusBadge(dogodek.status)}
      <div class="event-card-img">
        <img src="${slikaUrl}" alt="${dogodek.Naslov}">
        <div class="event-date">
          <span class="day">${dan}</span>
          <span class="month">${mesec}</span>
        </div>
        <span class="event-cat-tag">${dogodek.kategorija || 'Dogodek'}</span>
      </div>
      <div class="event-card-body">
        <div class="event-meta">
          <i class="bi bi-geo-alt"></i> <span title="${polnaLokacija}">${polnaLokacija}</span>
          <span class="ms-2"><i class="bi bi-clock"></i> ${ura}</span>
        </div>
        <h5><a href="dogodek.html?id=${dogodek.ID_dogodek}">${dogodek.Naslov}</a></h5>
        <p class="event-card-desc">${kratekOpis}</p>
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

  try {
    const dogodki = await apiFetch('/dogodki');

    if (dogodki.length === 0) {
      kontejner.innerHTML = '<p class="text-center w-100">Trenutno ni nobenih aktivnih dogodkov.</p>';
      return;
    }

    kontejner.innerHTML = '';
    dogodki.forEach(dogodek => {
      kontejner.appendChild(generirajKartico(dogodek, 'col-md-6 mb-4', privzeta, false));
    });
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

    if (dogodki.length === 0) {
      kontejner.innerHTML = '<p class="text-center w-100">Ta mesec ni izpostavljenih dogodkov.</p>';
      return;
    }

    kontejner.innerHTML = '';
    dogodki.forEach(dogodek => {
      kontejner.appendChild(generirajKartico(dogodek, 'col-md-6 col-lg-4 mb-4', privzeta, true));
    });
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
