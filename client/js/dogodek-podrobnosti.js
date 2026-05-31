import { apiFetch, Auth, ApiError } from './auth.js';
import { inicializirajPriljubljene, osveziSrckeNaStrani } from './dogodki.js';
import { potrdiAkcijo, pobegniHtml } from './components.js';
import { pripraviPodatkeZaPrikaz, posodobiIzgledVnosaZvezdic } from './dogodek/utils.js';
import { generirajPodrobnostiHtml } from './dogodek/templates.js';
import { inicializirajOcene } from './dogodek/ocene.js';

document.addEventListener('DOMContentLoaded', naloziPodrobnostiDogodka);

let izbranaOcena = 0;

async function naloziPodrobnostiDogodka() {
  const kontejner = document.getElementById('podrobnosti-dogodka-kontejner');
  const dogodekId = new URLSearchParams(window.location.search).get('id');

  if (!dogodekId) {
    kontejner.innerHTML = '<div class="container mt-5"><p class="alert alert-danger">Manjka ID dogodka.</p></div>';
    return;
  }

  try {
    const dogodek = await apiFetch(`/dogodki/${dogodekId}`);
    const p = pripraviPodatkeZaPrikaz(dogodek);

    kontejner.innerHTML = generirajPodrobnostiHtml(dogodek, p);

    pripraviSpremljajGumb();
    pripraviOcenoForm(dogodekId);
    pripraviGumbDeli(dogodek);
    await inicializirajOcene(dogodekId);

    await inicializirajPriljubljene();
    osveziSrckeNaStrani();

    pripraviRezervacija(dogodek, dogodekId);

    // Klic za nalaganje priporočenih dogodkov na dnu strani
    await naloziPriporoceneDogodke(dogodekId);

  } catch (err) {
    console.error('Napaka pri nalaganju podrobnosti:', err);
    kontejner.innerHTML = '<div class="container mt-5"><p class="alert alert-danger">Napaka pri nalaganju podatkov o dogodku.</p></div>';
  }
}

function pripraviGumbDeli(dogodek) {
  const gumbDeli = document.getElementById('gumb-deli-dogodek');
  if (!gumbDeli) return;

  gumbDeli.addEventListener('click', async (e) => {
    e.preventDefault();

    const naslovDogodka = dogodek.Naslov || 'Zanimiv dogodek';
    const urlDogodka = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: naslovDogodka,
          text: `Poglej si ta dogodek: ${naslovDogodka}`,
          url: urlDogodka
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Napaka pri deljenju:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(urlDogodka);
        
        if (window.pokaziToast) {
          window.pokaziToast('success', 'Povezava do dogodka je skopirana v odložišče!', 'Povezava skopirana');
        } else {
          alert('Povezava do dogodka je skopirana v odložišče!');
        }
      } catch (err) {
        console.error('Povezave ni bilo mogoče kopirati:', err);
        window.pokaziToast?.('danger', 'Napaka pri kopiranju povezave.');
      }
    }
  });
}

function pripraviSpremljajGumb() {
  const gumb = document.getElementById('gumb-spremljaj');
  const organizatorId = gumb?.getAttribute('data-org-id');

  if (!gumb) return;

  const osveziIzgled = (spremlja) => {
    gumb.textContent = spremlja ? 'Spremljaš' : 'Spremljaj';
    gumb.className = spremlja ? 'btn btn-success' : 'btn btn-outline-primary';
  };

  if (!organizatorId || organizatorId === 'undefined' || organizatorId === 'null') {
    gumb.style.display = 'none';
    return;
  }

  apiFetch(`/organizatorji/${organizatorId}/spremlja`)
    .then(status => osveziIzgled(status.spremlja))
    .catch(() => console.warn('Uporabnik verjetno ni prijavljen.'));

  gumb.addEventListener('click', async () => {
    try {
      const odgovor = await apiFetch(`/organizatorji/${organizatorId}/toggle-spremljaj`, { method: 'POST' });
      osveziIzgled(odgovor.spremlja);
    } catch (err) {
      window.pokaziToast('warning', 'Za spremljanje organizatorjev se moraš prijaviti.', 'Prijava potrebna');
    }
  });
}

function pripraviOcenoForm(dogodekId) {
  const gumbNapisi = document.getElementById('gumb-odpri-oceno');
  const modalElement = document.getElementById('modalOcena');
  if (!modalElement) return;
  
  const bsModal = new bootstrap.Modal(modalElement);

  gumbNapisi?.addEventListener('click', () => {
    izbranaOcena = 0;
    posodobiIzgledVnosaZvezdic(0);
    document.getElementById('obrazec-ocena').reset();
    bsModal.show();
  });

  document.querySelectorAll('.tekst-vnos-zvezda').forEach(zvezda => {
    zvezda.addEventListener('click', (e) => {
      izbranaOcena = parseInt(e.target.getAttribute('data-vrednost'));
      posodobiIzgledVnosaZvezdic(izbranaOcena);
    });
    zvezda.addEventListener('mouseover', (e) => {
      const zacasna = parseInt(e.target.getAttribute('data-vrednost'));
      posodobiIzgledVnosaZvezdic(zacasna);
      e.target.style.transform = 'scale(1.15)';
    });
    zvezda.addEventListener('mouseout', (e) => {
      e.target.style.transform = 'scale(1)';
    });
  });

  document.querySelector('.vnos-zvezdic')?.addEventListener('mouseleave', () => {
    posodobiIzgledVnosaZvezdic(izbranaOcena);
  });

  document.getElementById('obrazec-ocena').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (izbranaOcena === 0) {
      window.pokaziToast('warning', 'Izberi oceno z zvezdicami (1-5).');
      return;
    }

    const komentar = document.getElementById('komentar-tekst').value;

    try {
      const odgovor = await apiFetch(`/dogodki/${dogodekId}/ocene`, {
        method: 'POST',
        body: JSON.stringify({ ocena: izbranaOcena, komentar }),
      });

      if (odgovor.uspeh) {
        bsModal.hide();
        window.location.reload();
      }
    } catch (err) {
      console.error('Napaka pri shranjevanju ocene:', err);
      window.pokaziToast('warning', 'Za oddajo ocene se moraš prijaviti.', 'Prijava potrebna');
    }
  });
}

async function pripraviRezervacija(dogodek, dogodekId) {
  const izvorniGumb = document.getElementById('gumb-rezervacija');
  if (!izvorniGumb) return;

  const kontejner = document.createElement('div');
  kontejner.id = 'rezervacija-kontejner';
  izvorniGumb.replaceWith(kontejner);

  function renderRezerviraj() {
    kontejner.innerHTML = `
      <button id="btn-rezerviraj" class="btn btn-primary btn-lg w-100 mb-2">
        <i class="bi bi-ticket-perforated"></i> Rezerviraj vstopnico
      </button>
    `;
    document.getElementById('btn-rezerviraj').addEventListener('click', onRezerviraj);
  }

  function renderPrijavljen() {
    kontejner.innerHTML = `
      <div class="d-flex gap-2 mb-2">
        <button class="btn btn-success btn-lg flex-grow-1" disabled>
          <i class="bi bi-check-circle-fill"></i> Že prijavljen
        </button>
        <button id="btn-odjavi" class="btn btn-outline-danger btn-lg" title="Odjavi me z dogodka" aria-label="Odjavi me z dogodka">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `;
    document.getElementById('btn-odjavi').addEventListener('click', onOdjavi);
  }

  function renderLoading() {
    kontejner.innerHTML = `
      <button class="btn btn-primary btn-lg w-100 mb-2" disabled>
        <span class="spinner-border spinner-border-sm" role="status"></span> Obdelujem...
      </button>
    `;
  }

  async function onRezerviraj() {
    if (!Auth.getUporabnik()) {
      window.pokaziToast?.('warning', 'Za rezervacijo vstopnice se moraš prijaviti.', 'Prijava potrebna');
      return;
    }

    const potrjeno = await potrdiAkcijo({
      naslov: 'Rezervacija vstopnice',
      sporocilo: `Ali želite rezervirati vstopnico za dogodek "${dogodek.Naslov}"? 24 ur pred dogodkom boste na e-naslov prejeli obvestilo.`,
      gumbPotrdi: 'Potrdi rezervacijo',
      tipGumba: 'btn-primary',
      gumbPreklic: 'Prekliči',
    });
    if (potrjeno === null || potrjeno === undefined) return;

    renderLoading();
    try {
      const odgovor = await apiFetch(`/dogodki/${dogodekId}/rezervacija`, { method: 'POST' });
      if (odgovor.uspeh || odgovor.message === 'Rezervacija uspešna.') {
        window.pokaziToast?.('success', 'Vstopnica uspešno rezervirana! Opomnik je vklopljen.', 'Uspelo!');
        renderPrijavljen();
      } else {
        window.pokaziToast?.('warning', 'Strežnik je javil: ' + (odgovor.message || 'Neznana napaka'));
        renderRezerviraj();
      }
    } catch (err) {
      console.error('[Rezervacija] Napaka:', err);
      window.pokaziToast?.('danger', err instanceof ApiError ? err.message : 'Napaka pri komunikaciji s strežnikom.');
      renderRezerviraj();
    }
  }

  async function onOdjavi() {
    const potrjeno = await potrdiAkcijo({
      naslov: 'Odjava z dogodka',
      sporocilo: `Ali se res želiš odjaviti z dogodka "${dogodek.Naslov}"? Tvoje mesto se sprosti za druge obiskovalce.`,
      gumbPotrdi: 'Odjavi me',
      tipGumba: 'btn-danger',
      gumbPreklic: 'Prekliči',
    });
    if (!potrjeno) return;

    renderLoading();
    try {
      await apiFetch(`/dogodki/${dogodekId}/rezervacija`, { method: 'DELETE' });
      window.pokaziToast?.('success', 'Uspešno odjavljen z dogodka.');
      renderRezerviraj();
    } catch (err) {
      console.error('[Odjava] Napaka:', err);
      window.pokaziToast?.('danger', err instanceof ApiError ? err.message : 'Napaka pri odjavi.');
      renderPrijavljen();
    }
  }

  if (Auth.getUporabnik()) {
    try {
      const { prijavljen } = await apiFetch(`/dogodki/${dogodekId}/prijava-status`);
      if (prijavljen) renderPrijavljen();
      else renderRezerviraj();
    } catch (err) {
      console.warn('Ne morem prebrati statusa prijave:', err);
      renderRezerviraj();
    }
  } else {
    renderRezerviraj();
  }
}

async function naloziPriporoceneDogodke(trenutniDogodekId) {
  const kontejner = document.getElementById('priporoceniDogodki');
  if (!kontejner) return;

  try {
    const dogodki = await apiFetch(`/priporoceni-dogodki?trenutniId=${trenutniDogodekId}`);
    
    if (!dogodki || dogodki.length === 0) {
      kontejner.innerHTML = '<div class="col-12 text-center text-muted">Trenutno ni drugih podobnih dogodkov po vaših interesih.</div>';
      return;
    }

    kontejner.innerHTML = dogodki.map(dogodek => {
      const d = new Date(dogodek.datum_zacetka);
      const dan = String(d.getDate()).padStart(2, '0');
      const mesec = d.toLocaleString('sl-SI', { month: 'short' }).toUpperCase().replace('.', '');
      const cenaPrikaz = parseFloat(dogodek.cena) === 0 ? 'Brezplačno' : `${dogodek.cena} €`;

      return `
        <div class="col-md-4">
          <div class="event-card">
            <div class="event-card-img">
              <img src="${dogodek.slika || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'}" alt="${pobegniHtml(dogodek.Naslov)}">
              <div class="event-date">
                <span class="day">${dan}</span>
                <span class="month">${mesec}</span>
              </div>
              <span class="event-cat-tag">${pobegniHtml(dogodek.kategorija)}</span>
            </div>
            <div class="event-card-body">
              <div class="event-meta"><i class="bi bi-geo-alt"></i>${pobegniHtml(dogodek.kraj || 'Neznano')}</div>
              <h5><a href="dogodek.html?id=${dogodek.ID_dogodek}">${pobegniHtml(dogodek.Naslov)}</a></h5>
              <p class="event-card-desc">${pobegniHtml(dogodek.opis ? dogodek.opis.substring(0, 80) + '...' : 'Ni opisa.')}</p>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="event-price">${cenaPrikaz}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');


    osveziSrckeNaStrani();

  } catch (err) {
    console.error("Napaka pri nalaganju priporočil:", err);
    kontejner.innerHTML = '<div class="col-12 text-center text-danger">Morda vas zanima tudi: Ni bilo mogoče naložiti priporočil.</div>';
  }
}