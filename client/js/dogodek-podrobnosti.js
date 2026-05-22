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
    await inicializirajOcene(dogodekId);

    await inicializirajPriljubljene();
    osveziSrckeNaStrani();

    pripraviRezervacija(dogodek, dogodekId);
  } catch (err) {
    console.error('Napaka pri nalaganju podrobnosti:', err);
    kontejner.innerHTML = '<div class="container mt-5"><p class="alert alert-danger">Napaka pri nalaganju podatkov o dogodku.</p></div>';
  }
}

function pripraviSpremljajGumb() {
  const gumb = document.getElementById('gumb-spremljaj');
  const organizatorId = gumb.getAttribute('data-org-id');

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
  const bsModal = new bootstrap.Modal(document.getElementById('modalOcena'));

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

function pripraviRezervacija(dogodek, dogodekId) {
  const gumb = document.getElementById('gumb-rezervacija');
  if (!gumb) return;

  gumb.addEventListener('click', async () => {
    if (!Auth.getUporabnik()) {
      window.pokaziToast?.('warning', 'Za rezervacijo vstopnice se moraš prijaviti.', 'Prijava potrebna');
      return;
    }

    const potrjeno = await potrdiAkcijo({
      naslov: 'Rezervacija vstopnice',
      sporocilo: `Ali želite rezervirati vstopnico za dogodek "${pobegniHtml(dogodek.Naslov)}"? 24 ur pred dogodkom boste na e-naslov prejeli obvestilo.`,
      gumbPotrdi: 'Potrdi rezervacijo',
      tipGumba: 'btn-primary',
      gumbPreklic: 'Prekliči',
    });
    if (potrjeno === null || potrjeno === undefined) return;

    gumb.disabled = true;
    gumb.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Rezerviram...`;

    try {
      const odgovor = await apiFetch(`/dogodki/${dogodekId}/rezervacija`, { method: 'POST' });
      if (odgovor.uspeh || odgovor.message === 'Rezervacija uspešna.') {
        window.pokaziToast?.('success', 'Vstopnica uspešno rezervirana! Opomnik je vklopljen.', 'Uspelo!');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        window.pokaziToast?.('warning', 'Strežnik je javil: ' + (odgovor.message || 'Neznana napaka'));
        gumb.disabled = false;
        gumb.innerHTML = `<i class="bi bi-ticket-perforated"></i> Rezerviraj vstopnico`;
      }
    } catch (err) {
      console.error('[Rezervacija] Napaka pri izvajanju rezervacije:', err);
      window.pokaziToast?.('danger', err instanceof ApiError ? err.message : 'Napaka pri komunikaciji s strežnikom.');
      gumb.disabled = false;
      gumb.innerHTML = `<i class="bi bi-ticket-perforated"></i> Rezerviraj vstopnico`;
    }
  });
}
